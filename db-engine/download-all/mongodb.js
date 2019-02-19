'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const mongodb = async () => {
	const configuration = require('../../configuration');
	const dbCommon = await require('../common/mongodb');
	const clientDb = await dbCommon.client(configuration.dbEngine.downloadAll.mongo);

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
			extract: block => {
				return block.block;
			}
		}
	};
	db.block = Object.assign({}, dbCommon.block, db.block);
	return Object.assign({}, dbCommon, db);
};

module.exports = mongodb();
