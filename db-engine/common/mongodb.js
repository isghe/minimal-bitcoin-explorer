'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

function Mongodb() {
	const self = this;
	self.controlFlowId = null;
	self.cache = {
		spkType: {},
		hex: {},
		info: () => {
			return {
				cache: {
					spkType: self.cache.spkType,
					hexLength: util.keys(self.cache.hex).length
				}
			};
		}
	};

	self.clientDb = null;

	self.init = async configuration => {
		assert(self.clientDb === null);
		assert(self.controlFlowId === null);
		const {MongoClient} = require('mongodb');
		const client = await MongoClient.connect(configuration.url, {useNewUrlParser: true});
		console.log('Connected successfully to server');
		self.clientDb = client.db(configuration.dbName);
		const getControFlawlId = async () => {
			let ret = null;
			const controlFlow = await self.clientDb.collection('controlFlow').find().toArray();
			if (controlFlow.length === 0) {
				const insertResult = await self.clientDb.collection('controlFlow').insertOne({
					stoppedSuccesfully: true,
					hasToStop: false
				});
				ret = insertResult.insertedId;
			} else {
				ret = controlFlow[0]._id;
			}
			return ret;
		};

		self.controlFlowId = await getControFlawlId();

		return self.clientDb;
	};

	self.info = () => {
		return self.cache.info();
	};
	self.controlFlow = {
		stoppedSuccesfully: async () => {
			const control = await self.clientDb.collection('controlFlow').find({_id: self.controlFlowId}).toArray();
			assert(control.length === 1);
			await self.clientDb.collection('controlFlow').updateOne({_id: self.controlFlowId}, {$set: {stoppedSuccesfully: false}});

			return control[0].stoppedSuccesfully;
		},
		hasToStop: async () => {
			const control = await self.clientDb.collection('controlFlow').find({_id: self.controlFlowId}).toArray();
			assert(control.length === 1);
			return control[0].hasToStop;
		},
		setStopSuccesfully: async () => {
			const updateResult = await self.clientDb.collection('controlFlow').updateOne({_id: self.controlFlowId}, {$set: {stoppedSuccesfully: true, hasToStop: false}});
			return updateResult;
		},
		pleaseStop: async () => {
			const updateResult = await self.clientDb.collection('controlFlow').updateOne({_id: self.controlFlowId}, {$set: {stoppedSuccesfully: false, hasToStop: true}});
			return updateResult;
		}
	};
	self.beginTransaction = () => {
	};
	self.commit = () => {
	};
	self.block = {
		selectCount: async () => {
			const ts_counter = await self.clientDb.collection('block').find().count();
			assert(typeof ts_counter !== 'undefined');
			return {ts_counter};
		},
		findOne: async filter => {
			const block = await self.clientDb.collection('block').findOne(filter, {block: 1});
			return block;
		}
	};
	self.spkType = {
		upsert: async description => {
			const result = await self.clientDb.collection('spk_type').updateOne({description}, {
				$inc: {
					counter: 1
				},
				$set: {
					description
				}
			}, {upsert: true});

			let ret = null;
			if (result.upsertedId !== null) {
				ret = result.upsertedId._id;
			}
			return ret;
		},
		getRef: async description => {
			const ret = await self.clientDb.collection('spk_type').findOne({description});
			return ret._id;
		},
		getCachedRefIf: async description => {
			if (typeof self.cache.spkType[description] === 'undefined') {
				self.cache.spkType[description] = await self.spkType.getRef(description);
				console.log(self.cache.spkType);
			}
			return self.cache.spkType[description];
		}
	};
}

module.exports = Mongodb;
