'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');

const fake = () => {
	const configuration = require('../../configuration');
	let fakeBlockIndex = 0;

	const cache = {
		info: () => {
			return {};
		}
	};
	const db = {
		info: () => {
			return cache.info();
		},
		controlFlow: {
			stoppedSuccesfully: () => {
				return true;
			},
			hasToStop: () => {
				return false;
			},
			setStopSuccesfully: () => {
			}
		},
		beginTransaction: () => {
		},
		commit: () => {
		},
		block: {
			selectCount: () => {
				const ret = {
					ts_counter: 0
				};
				if (typeof (configuration.dbEngine.downloadAll.fake.nextblockhash) !== 'undefined') {
					ret.ts_counter = 1;
				}
				return ret;
			},
			selectLast: () => {
				assert(typeof (configuration.dbEngine.downloadAll.fake.nextblockhash) !== 'undefined');
				assert(typeof (configuration.dbEngine.downloadAll.fake.lastBlockHeight) !== 'undefined');
				return {
					nextblockhash: configuration.dbEngine.downloadAll.fake.nextblockhash,
					height: configuration.dbEngine.downloadAll.fake.lastBlockHeight
				};
			},
			insert: block => {
				assert(typeof (block) !== 'undefined');
				return {
					lastInsertRowid: ++fakeBlockIndex
				};
			}
		}
	};
	return db;
};

module.exports = fake();
