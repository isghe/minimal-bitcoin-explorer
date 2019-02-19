'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const mongodb = async () => {
	let controlFlowId = null;
	const cache = {
		info: () => {
			return {};
		}
	};

	let clientDb = null;
	const db = {
		client: async configuration => {
			assert(clientDb === null);
			assert(controlFlowId === null);
			const {MongoClient} = require('mongodb');
			const client = await MongoClient.connect(configuration.url, {useNewUrlParser: true});
			console.log('Connected successfully to server');
			clientDb = client.db(configuration.dbName);
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

			controlFlowId = await getControFlawlId();

			return clientDb;
		},

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
			}
		}
	};
	return db;
};

module.exports = mongodb();
