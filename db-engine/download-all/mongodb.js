'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const mongodb = async () => {
	const configuration = require('../../configuration');
	const Mongo = require('../common/mongodb');
	const mongo = new Mongo();
	const clientDb = await mongo.init(configuration.dbEngine.downloadAll.mongo);

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

	const db = {
		clientDb,
		block: {
			insert: async block => {
				assert(typeof (block) !== 'undefined');
				const insertResult = await clientDb.collection('block').insertOne({
					block
				});

				return {
					lastInsertRowid: insertResult.insertedId
				};
			},
			selectLast: async count => {
				const block = await clientDb.collection('block').find({}, {block: 1}).sort({'block.height': -1}).limit(1).toArray();
				assert(block.length === 1);
				return block[0].block;
			}
		}
	};
	db.block = Object.assign({}, mongo.block, db.block);
	return Object.assign({}, mongo, db);
};

module.exports = mongodb();
