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

	const utxoIndexes = [
		{index: {txid: -1, vout: -1}}
	];
	await createIndexes('utxo', utxoIndexes);

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
				const block = await clientDb.collection('block').find({}).sort({height: -1}).limit(1).toArray();
				assert(block.length === 1);
				return block[0];
			}
		},
		hex: {
			getRefByHash: async hash => {
				assert(typeof hash !== 'undefined');
				const ret = await clientDb.collection('hex').findOne({hash});
				return ret._id;
			},

			getCachedRefByHashIf: async hash => {
				if (typeof mongo.cache.hex[hash] === 'undefined') {
					mongo.cache.hex[hash] = await db.hex.getRefByHash(hash);
				}
				return mongo.cache.hex[hash];
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

			updateIncrement: async (hash, satoshi) => {
				util.assert.isSatoshi (satoshi);
				assert (satoshi < 0);
				const result = await clientDb.collection('hex').updateOne({hash}, {
					$inc: {
						satoshi
					}
				});

				assert(result.matchedCount === 1);
				assert(result.modifiedCount === 1);
				return result;
			}
		},

		address: {
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

			updateSpent: async (txid, vout) => {
				const result = await clientDb.collection('utxo').updateOne({txid, vout}, {$set: {spent: true}});
				assert(result.matchedCount === 1);
				assert(result.modifiedCount === 1);
				return result;
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
		},

		vout: {
			select: async (downloadAllClientDb, txid, voutN) => {
				const result = await downloadAllClientDb.collection('block').aggregate([
					{$match: {'block.tx.txid': txid}},
					{$project: {
						'block.tx': {$filter: {
							input: '$block.tx',
							as: 'tx',
							cond: {$eq: ['$$tx.txid', txid]}
						}},
						_id: 0
					}}
				]).toArray();
				assert(result.length === 1);
				assert(result[0].block.tx.length === 1);
				const vout = result[0].block.tx[0].vout[voutN];
				assert(vout.n === voutN);
				return vout;
			}
		}
	};
	db.block = Object.assign({}, mongo.block, db.block);
	return Object.assign({}, mongo, db);
};

module.exports = mongodbVout();
