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
		{index: {hash: -1}, options: {unique: true}}
	];
	await createIndexes('block', blockIndexes);

	const spkTypeIndexes = [
		{index: {description: -1}, options: {unique: true}}
	];
	await createIndexes('spk_type', spkTypeIndexes);

	const addressIndexes = [
		{index: {address: -1, hex_ref: -1}, options: {unique: true}},
		{index: {hex_ref: -1, spk_type_ref: -1}, options: {unique: true}},
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
				const block = await clientDb.collection('block').find({}, {block: 1}).sort({height: -1}).limit(1).toArray();
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

			upsert: async (hex, hash, spk_type_ref, satoshi_in) => {
				util.assert.isSatoshi(satoshi_in);
				assert(satoshi_in >= 0);
				const result = await clientDb.collection('hex').updateOne({hash}, {
					$inc: {
						satoshi_in,
						satoshi_out: 0,
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

			updateIncrement: async (_id, satoshi_out) => {
				util.assert.isSatoshi(satoshi_out);
				assert(satoshi_out > 0);
				const result = await clientDb.collection('hex').updateOne({_id}, {
					$inc: {
						satoshi_out
					}
				});
				try {
					assert(result.matchedCount === 1);
					assert(result.modifiedCount === 1); // block 125776

					return result;
				} catch (error) {
					console.log({_id, satoshi_out, modifiedCount: result.modifiedCount});
					const hex = await clientDb.collection('hex').find({_id}).toArray();
					console.log(JSON.stringify({hex}));
					assert(false);
				}
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
			insert: async (txid, vout, value, hex_ref) => {
				const insertResult = await clientDb.collection('utxo').insertOne({
					txid,
					vout,
					value,
					hex_ref,
					spent: false
				});

				return {
					lastInsertRowid: insertResult.insertedId
				};
			},

			updateSpent: async id => {
				const result = await clientDb.collection('utxo').updateOne({_id: id}, {$set: {spent: true}});

				assert(result.matchedCount === 1);
				assert(result.modifiedCount === 1);

				return result;
			},

			select: async (txid, vout, spent) => {
			// https://www.mongodb.com/blog/post/joins-and-other-aggregation-enhancements-coming-in-mongodb-3-2-part-1-of-3-introduction
				/*
"{
        "_id": "5c7808790877b31cbeb475bb",
        "value": 50,
        "hex_ref": "5c78087985642f323080775b"
}"
*/
				const result = await clientDb.collection('utxo').findOne({
					txid,
					vout,
					spent
				});
				assert(typeof result !== 'undefined');
				return result;
			}
		}
	};
	db.block = Object.assign({}, mongo.block, db.block);
	return Object.assign({}, mongo, db);
};

module.exports = mongodbVout();
