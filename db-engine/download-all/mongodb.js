'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const mongodb = async () => {
	const configuration = require('../../configuration');
	const {MongoClient} = require('mongodb');

	const url = configuration.dbEngine.downloadAll.mongo.url; // eslint-disable-line prefer-destructuring
	const dbName = configuration.dbEngine.downloadAll.mongo.dbName; // eslint-disable-line prefer-destructuring

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
		{index: {'block.height': -1}, options: {unique: true}},
		{index: {'block.hash': -1}, options: {unique: true}},
		{index: {'block.nextblockhash': -1}, options: {unique: true}}
	];
	await createIndexes('block', blockIndexes);

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

	const cache = {
		spkType: {},
		hex: {},
		info: () => {
			return {
				cache: {
					spkType: cache.spkType,
					hexLength: util.keys(cache.hex).length
				}
			};
		}
	};
	const db = {
		info: () => {
			return cache.info();
		},
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
				assert(typeof (block) !== 'undefined');
				const insertResult = await clientDb.collection('block').insertOne({
					block
				});

				return {
					lastInsertRowid: insertResult.insertedId
				};
			}
		}
	};
	return db;
};

module.exports = mongodb();
