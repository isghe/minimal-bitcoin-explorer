'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const mongodbVout = async () => {
	const configuration = require('../../configuration');
	const Mongo = require('../common/mongodb');
	const mongo = new Mongo();
	const clientDb = await mongo.init(configuration.dbEngine.vout.mongo);

	const createIndexes = (table, indexes) => {
		indexes.forEach(async index => {
			const createIndexResult = await clientDb.collection(table).createIndex(index.index, index.options);
			console.log(createIndexResult);
		});
	};

	const blockIndexes = [
		{index: {height: -1}, options: {unique: true}},
		{index: {hash: -1}, options: {unique: true}},
		{index: {nextblockhash: -1}, options: {unique: true}}
	];
	await createIndexes('block', blockIndexes);

	const spkTypeIndexes = [
		{index: {description: -1}, options: {unique: true}}
	];
	await createIndexes('spk_type', spkTypeIndexes);

	const addressIndexes = [
		{index: {address: -1, hex_ref: -1}, options: {unique: true}}
	];
	await createIndexes('address', addressIndexes);

	const hexIndexes = [
		{index: {hash: -1}, options: {unique: true}}
	];
	await createIndexes('hex', hexIndexes);

	const db = {
		block: {
			insert: async block => {
				// height, hash, nextblockhash
				const insertResult = await clientDb.collection('block').insertOne({
					height: block.height,
					hash: block.hash,
					nextblockhash: block.nextblockhash
				});

				return {
					lastInsertRowid: insertResult.insertedId
				};
			},
			selectLast: async count => {
				const block = await clientDb.collection('block').find({}, {block: 1}).sort({height: -1}).limit(1).toArray();
				assert(block.length === 1);
				return block[0];
			}
		},
		hex: {
			getRefByHash: async hash => {
				assert(typeof hash !== 'undefined');
				const ret = await clientDb.collection('hex').find({hash}).toArray();
				assert(ret.length === 1);
				return ret[0]._id;
			},
			getCachedRefByHashIf: async hash => {
				if (typeof mongo.cache.hex[hash] === 'undefined') {
					mongo.cache.hex[hash] = await db.hex.getRefByHash(hash);
				}
				return mongo.cache.hex[hash];
			},
			upsertOld: async (hex, hash, spk_type_ref, satoshi) => {
				assert(typeof hex !== 'undefined');
				util.assert.isSatoshi(satoshi);
				const ret = {};
				const spkType = await clientDb.collection('hex').find({hash}).toArray();
				assert(spkType.length <= 1);
				if (spkType.length === 0) {
					const insertResult = await clientDb.collection('hex').insertOne({
						hex,
						hash,
						spk_type_ref,
						satoshi,
						counter: 1
					});
					ret.lastInsertRowid = insertResult.insertedId;
				} else {
					await clientDb.collection('hex').updateOne({hash}, {$set: {counter: spkType[0].counter + 1, satoshi: spkType[0].satoshi + satoshi}});
				}
				return ret;
			},

			upsert: async (hex, hash, spk_type_ref, satoshi) => {
				const result = await clientDb.collection('hex').updateOne({hash}, {
					$inc: {
						satoshi,
						counter: 1
					},
					$set: {
						hex,
						hash,
						spk_type_ref
					}
				}, {upsert: true});

				let ret = null;
				if (result.upsertedId !== null) {
					ret = result.upsertedId._id;
				}
				return ret;
			},

			update: async (hex_id, satoshi) => {
				assert(typeof hex_id !== 'undefined');
				util.assert.isSatoshi(satoshi);
				const updateResult = await clientDb.collection('hex').updateOne({_id: hex_id}, {$set: {satoshi}});

				return updateResult;
			}
		},
		address: {
			upsertOld: async (address, hex_ref, spk_type_ref) => {
				const spkType = await clientDb.collection('address').find({address, hex_ref}).toArray();
				assert(spkType.length <= 1);
				if (spkType.length === 0) {
					await clientDb.collection('address').insertOne({
						address,
						hex_ref,
						spk_type_ref,
						counter: 1
					});
				} else {
					await clientDb.collection('address').updateOne({address, hex_ref}, {$set: {counter: spkType[0].counter + 1}});
				}
				return {};
			},
			upsert: async (address, hex_ref, spk_type_ref) => {
				await clientDb.collection('address').updateOne({address, hex_ref}, {
					$inc: {
						counter: 1
					},
					$set: {
						address,
						hex_ref,
						spk_type_ref
					}
				}, {upsert: true});
				return {};
			}
		},
		utxo: {
			insert: async (txid, vout, value) => {
				const insertResult = await clientDb.collection('utxo').insertOne({
					txid,
					vout,
					value,
					spent: false
				});

				return {
					lastInsertRowid: insertResult.insertedId
				};
			},
			updateSpent: async id => {
				const updateResult = await clientDb.collection('utxo').updateOne({_id: id}, {$set: {spent: true}});
				return updateResult;
			}
		},
		utxoHex: {
			insert: async (utxo_ref, hex_ref) => {
				const insertResult = await clientDb.collection('utxo_hex').insertOne({
					utxo_ref,
					hex_ref
				});

				return {
					lastInsertRowid: insertResult.insertedId
				};
			}
		}
	};
	db.block = Object.assign({}, mongo.block, db.block);
	return Object.assign({}, mongo, db);
};

module.exports = mongodbVout();
