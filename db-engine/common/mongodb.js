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
		info: () => {
			return {};
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
}

module.exports = Mongodb;
