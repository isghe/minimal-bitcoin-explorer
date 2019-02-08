'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');

const assertSatoshi = satoshi => {
	assert(typeof satoshi !== 'undefined');
	assert(Number.isInteger(satoshi));
};

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
		{index: {txid: -1}},
		{index: {txid: -1, block_ref: -1}, options: {unique: true}}
	];

	await createIndexes('h_transaction', transactionIndexes);

	const utxoIndexes = [
		{index: {transaction_ref: -1, vout: -1}, options: {unique: true}}
	];
	await createIndexes('utxo', utxoIndexes);

	const spkTypeIndexes = [
		{index: {description: -1, vout: -1}, options: {unique: true}}
	];
	await createIndexes('spk_type', spkTypeIndexes);

	const addressIndexes = [
		{index: {address: -1, vout: -1}, options: {unique: true}}
	];
	await createIndexes('address', addressIndexes);

	const utxoHexIndexes = [
		{index: {utxo_ref: -1}, options: {unique: true}}
	];
	await createIndexes('utxo_hex', utxoHexIndexes);

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
		/* eslint-disable no-unused-vars */
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
					const insertResult = await clientDb.collection('spk_type').insertOne({
						description: type,
						counter: 1
					});
				} else {
					const updateResult = await clientDb.collection('spk_type').updateOne({description: type}, {$set: {counter: spkType[0].counter + 1}});
				}
				return {};
			},
			getRef: async description => {
				// return 'select id from spk_type where description=\'' + description + '\'';
				const ret = await clientDb.collection('spk_type').find({description}).toArray();
				assert(ret.length === 1);
				return ret[0]._id;
			}
		},

		hex: {
			getRef: async hex => {
				// return 'select id from hex where hex=\'' + hex + '\'';
				const ret = await clientDb.collection('hex').find({hex}).toArray();
				assert(ret.length === 1);
				return ret[0]._id;
			},
			upsert: async (hex, spk_type_ref, satoshi) => {
				const spkType = await clientDb.collection('hex').find({hex}).toArray();
				assert(spkType.length <= 1);
				if (spkType.length === 0) {
					const insertResult = await clientDb.collection('hex').insertOne({
						hex,
						spk_type_ref,
						satoshi,
						counter: 1
					});
				} else {
					await clientDb.collection('hex').updateOne({hex}, {$set: {counter: spkType[0].counter + 1, satoshi: spkType[0].satoshi + satoshi}});
				}
				return {};
			},
			update: async (hex_id, satoshi) => {
				assert(typeof hex_id !== 'undefined');
				assertSatoshi(satoshi);
				const updateResult = await clientDb.collection('hex').updateOne({_id: hex_id}, {$set: {satoshi}});

				return updateResult;
			}
		},

		address: {
			upsert: async (address, hex_ref) => {
				const spkType = await clientDb.collection('address').find({address}).toArray();
				assert(spkType.length <= 1);
				if (spkType.length === 0) {
					const insertResult = await clientDb.collection('address').insertOne({
						address,
						hex_ref,
						counter: 1
					});
				} else {
					await clientDb.collection('address').updateOne({address}, {$set: {counter: spkType[0].counter + 1}});
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
			select: async (txid, vout) => {
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
			}
		}
	};
	return db;
};

module.exports = mongodb();
