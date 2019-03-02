'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('./lib/util');

const createCollection = async db => {
	// db['test-hash'].createIndex({label:1}, {unique:true});
	// db['test-hash'].createIndex({sha256:1}, {unique:true});

	const resultCreateCollection = await db.createCollection('test-hash', {
		validator: {
			$jsonSchema: {
				bsonType: 'object',
				required: ['label', 'sha256'],
				properties: {
					label: {
						bsonType: 'string',
						description: 'must be a string and is required'
					},
					sha256: {
						bsonType: 'string',
						description: 'must be a string and is required'
					}
				}
			}
		}
	});
	return resultCreateCollection;
};

const insertLabel = async (db, label) => {
	assert(typeof db !== 'undefined');
	assert(typeof db !== 'undefined');
	const sha256 = util.sha256(label);
	return db.collection('test-hash').insert({
		label,
		sha256
	});
};

const main = async () => {
	const configuration = require('./configuration');
	const {MongoClient} = require('mongodb');
	const mongoClient = await MongoClient.connect(configuration.test.mongo.url, {useNewUrlParser: true});
	const clientDb = mongoClient.db(configuration.test.mongo.dbName, {replicaSet: 'rs'});
	console.log('Connected successfully to server');
	// await createCollection (clientDb);
	// return;
	const session = mongoClient.startSession();
	session.startTransaction({
		readConcern: {level: 'snapshot'},
		writeConcern: {w: 'majority'}
	});
	try {
		for (let i = 0; i < 2; ++i) {
			const insertResult = await insertLabel(clientDb, 'ciao4');
			console.log(insertResult);
		}
		await session.commitTransaction();
		session.endSession();
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.log('IG Aborting');
		throw error; // Rethrow so calling function sees error
	}
};
main();
