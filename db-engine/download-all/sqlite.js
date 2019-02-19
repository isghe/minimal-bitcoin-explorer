'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');

const sqlite = () => {
	const configuration = require('../../configuration');
	const dbCommon = require('../common/sqlite');
	const client = dbCommon.client(configuration.dbEngine.explore.downloadAll.sqlite);
	const db = {
		block: {
			insert: block => {
				assert(false); // WIP
				const info = client.prepare('insert into block(height, hash, nextblockhash) values (?, ?, ?)')
					.run(block.height, block.hash, block.nextblockhash);
				assert(info.changes === 1);
				return info;
			}
		}
	};
	db.block = Object.assign({}, dbCommon.block, db.block);
	return Object.assign({}, dbCommon, db);
};

module.exports = sqlite();
