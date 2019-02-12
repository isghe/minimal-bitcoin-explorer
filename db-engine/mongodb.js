'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../lib/util.js');

const mongodb = async () => {
	const configuration = require('../configuration');
	const {MongoClient} = require('mongodb');

	const url = configuration.dbEngine.mongo.url; // eslint-disable-line prefer-destructuring
	const dbName = configuration.dbEngine.mongo.dbName; // eslint-disable-line prefer-destructuring

	const client = await MongoClient.connect(url, {useNewUrlParser: true});
	console.log('Connected successfully to server');
	const clientDb = client.db(dbName);

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

	const transactionIndexes = [
		// {index: {txid: -1}},
		{index: {txid: -1, block_ref: -1}, options: {unique: true}},
		{index: {txid: -1}, options: {
			unique: true,
			partialFilterExpression: {
				$and: [
					{
						txid: {
							$lt: 'd5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599'
						}
					},
					{
						txid: {
							$gt: 'd5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599'
						}
					},
					{
						txid: {
							$lt: 'e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468'
						}
					},
					{
						txid: {
							$gt: 'e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468'
						}
					}
				]
			}
		}}
	];
	await createIndexes('h_transaction', transactionIndexes);

	const utxoIndexes = [
		{index: {transaction_ref: -1, vout: -1}, options: {unique: true}}
		// {index: {transaction_ref: -1}}
	];
	await createIndexes('utxo', utxoIndexes);

	const spkTypeIndexes = [
		{index: {description: -1}, options: {unique: true}}
	];
	await createIndexes('spk_type', spkTypeIndexes);

	const addressIndexes = [
		{index: {address: -1, hex_ref: -1}, options: {unique: true}}
	];
	await createIndexes('address', addressIndexes);

	const utxoHexIndexes = [
		{index: {utxo_ref: -1}, options: {unique: true}},
		{index: {hex_ref: -1}}
	];
	await createIndexes('utxo_hex', utxoHexIndexes);

	const hexIndexes = [
		{index: {hash: -1}, options: {unique: true}}
	];
	await createIndexes('hex', hexIndexes);

	const getControFlawlId = async () => {
		let ret = null;
		const controlFlow = await clientDb.collection('controlFlow').find().toArray();
		if (controlFlow.length === 0) {
			const insertResult = await clientDb.collection('controlFlow').insertOne({
				stoppedSuccesfully: true,
				hasToStop: false
			});
			ret = insertResult.insertedId;
		} else {
			ret = controlFlow[0]._id;
		}
		return ret;
	};

	const controlFlowId = await getControFlawlId();
	const spkTypeCache = {};
	const db = {
		controlFlow: {
			stoppedSuccesfully: async () => {
				const control = await clientDb.collection('controlFlow').find({_id: controlFlowId}).toArray();
				assert(control.length === 1);
				await clientDb.collection('controlFlow').updateOne({_id: controlFlowId}, {$set: {stoppedSuccesfully: false}});

				return control[0].stoppedSuccesfully;
			},
			hasToStop: async () => {
				const control = await clientDb.collection('controlFlow').find({_id: controlFlowId}).toArray();
				assert(control.length === 1);
				return control[0].hasToStop;
			},
			setStopSuccesfully: async () => {
				const updateResult = await clientDb.collection('controlFlow').updateOne({_id: controlFlowId}, {$set: {stoppedSuccesfully: true, hasToStop: false}});
				return updateResult;
			},
			pleaseStop: async () => {
				const updateResult = await clientDb.collection('controlFlow').updateOne({_id: controlFlowId}, {$set: {stoppedSuccesfully: false, hasToStop: true}});
				return updateResult;
			}
		},
		beginTransaction: () => {
		},
		commit: () => {
		},
		block: {
			selectCount: async () => {
				const ts_counter = await clientDb.collection('block').countDocuments();
				assert(typeof ts_counter !== 'undefined');
				return {ts_counter};
			},
			selectLast: async count => {
				const block = await clientDb.collection('block').find().skip(count - 1).toArray();
				assert(block.length === 1);
				return block[0];
			},
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
			}
		},
		transaction: {
			insert: async (txid, block_ref) => {
				const insertResult = await clientDb.collection('h_transaction').insertOne({
					txid,
					block_ref
				});

				return {
					lastInsertRowid: insertResult.insertedId
				};
			}
		},
		utxo: {
			insert: async (transaction_ref, vout, value) => {
				const insertResult = await clientDb.collection('utxo').insertOne({
					transaction_ref,
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
		spkType: {
			upsert: async type => {
				const spkType = await clientDb.collection('spk_type').find({description: type}).toArray();
				assert(spkType.length <= 1);
				if (spkType.length === 0) {
					await clientDb.collection('spk_type').insertOne({
						description: type,
						counter: 1
					});
				} else {
					await clientDb.collection('spk_type').updateOne({description: type}, {$set: {counter: spkType[0].counter + 1}});
				}
				return {};
			},
			getRef: async description => {
				const ret = await clientDb.collection('spk_type').find({description}).toArray();
				assert(ret.length === 1);
				return ret[0]._id;
			},
			getCachedRefIf: async description => {
				if (typeof spkTypeCache[description] === 'undefined') {
					spkTypeCache[description] = await db.spkType.getRef(description);
					console.log(spkTypeCache);
				}
				return spkTypeCache[description];
			}
		},
		hex: {
			getRefByHash: async hash => {
				assert(typeof hash !== 'undefined');
				const ret = await clientDb.collection('hex').find({hash}).toArray();
				assert(ret.length === 1);
				return ret[0]._id;
			},
			upsert: async (hex, hash, spk_type_ref, satoshi) => {
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
			update: async (hex_id, satoshi) => {
				assert(typeof hex_id !== 'undefined');
				util.assert.isSatoshi(satoshi);
				const updateResult = await clientDb.collection('hex').updateOne({_id: hex_id}, {$set: {satoshi}});

				return updateResult;
			}
		},
		address: {
			upsert: async (address, hex_ref) => {
				const spkType = await clientDb.collection('address').find({address, hex_ref}).toArray();
				assert(spkType.length <= 1);
				if (spkType.length === 0) {
					await clientDb.collection('address').insertOne({
						address,
						hex_ref,
						counter: 1
					});
				} else {
					await clientDb.collection('address').updateOne({address, hex_ref}, {$set: {counter: spkType[0].counter + 1}});
				}
				return {};
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
			selectOld: async (txid, vout) => {
				const transaction = await clientDb.collection('h_transaction').find({txid}).toArray();
				assert(transaction.length === 1);
				const utxo = await clientDb.collection('utxo').find({transaction_ref: transaction[0]._id, vout}).toArray();
				assert(utxo.length === 1);

				const utxo_hex = await clientDb.collection('utxo_hex').find({utxo_ref: utxo[0]._id}).toArray();
				assert(utxo_hex.length === 1);
				const hex = await clientDb.collection('hex').find({_id: utxo_hex[0].hex_ref}).toArray();
				assert(hex.length === 1);

				return {
					id: utxo[0]._id,
					value: utxo[0].value,
					satoshi: hex[0].satoshi,
					hex_id: hex[0]._id
				};
			},
			/*
			> db.h_transaction.aggregate({$match: {txid:'f925f26deb2dc4696be8782ab7ad9493d04721b28ee69a09d7dfca51b863ca23'}}, { $lookup:{ from:'utxo', localField: '_id', foreignField: 'transaction_ref', as: 'utxo' } } ,{$unwind:'$utxo'}, {$match:{"utxo.vout": 0}},{ $lookup:{ from:'utxo_hex', localField: 'utxo._id', foreignField: 'utxo_ref', as: 'utxo_hex' }}, {$unwind:'$utxo_hex'}, {$lookup:{ from:'hex', localField: 'utxo_hex.hex_ref', foreignField: '_id', as: 'hex'}},
{$project:{'utxo._id':1, 'utxo.value':1, 'hex._id':1, 'hex.satoshi':1, 'utxo.vout':1}});

{ "_id" : ObjectId("5c5da73e3e549525ab0a7dc2"), "utxo" : { "_id" : ObjectId("5c5da73e3e549525ab0a7dc3"), "vout" : 0, "value" : 50 }, "hex" : [ { "_id" : ObjectId("5c5da73e3e549525ab0a7dc4"), "satoshi" : 5000000000 } ] }
			*/
			select: async (txid, vout) => {
			// https://www.mongodb.com/blog/post/joins-and-other-aggregation-enhancements-coming-in-mongodb-3-2-part-1-of-3-introduction

				const result = await clientDb.collection('h_transaction').aggregate(
					{$match: {txid}},
					{$lookup: {from: 'utxo', localField: '_id', foreignField: 'transaction_ref', as: 'utxo'}},
					{$unwind: '$utxo'}, {$match: {'utxo.vout': vout}},
					{$lookup: {from: 'utxo_hex', localField: 'utxo._id', foreignField: 'utxo_ref', as: 'utxo_hex'}},
					{$unwind: '$utxo_hex'},
					{$lookup: {from: 'hex', localField: 'utxo_hex.hex_ref', foreignField: '_id', as: 'hex'}},
					{$project: {'utxo._id': 1, 'utxo.value': 1, 'hex._id': 1, 'hex.satoshi': 1, 'utxo.vout': 1}})
					.toArray();
				assert(result.length === 1);
				assert(result[0].hex.length === 1);
				const ret = {
					id: result[0].utxo._id,
					value: result[0].utxo.value,
					satoshi: result[0].hex[0].satoshi,
					hex_id: result[0].hex[0]._id
				};
				return ret;
			}
		}
	};
	return db;
};

module.exports = mongodb();
