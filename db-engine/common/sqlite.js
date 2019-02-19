'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');

const sqlite = () => {
	const cache = {
		info: () => {
			return {};
		}
	};
	let client = null;
	const db = {
		client: configuration => {
			assert(client === null);
			const BetterSqlite3 = require('better-sqlite3');
			client = new BetterSqlite3(configuration.dbName, {
				verboseNo: query => {
					assert(typeof query !== 'undefined');
					console.log(JSON.stringify({query}));
				}
			});
			return client;
		},
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
			client.prepare('begin transaction')
				.run();
		},
		commit: () => {
			client.prepare('commit')
				.run();
		},
		block: {
			selectCount: () => {
				const ret = client.prepare('select count (*) as ts_counter from block')
					.get();
				assert(typeof ret !== 'undefined');
				return ret;
			},
			selectLast: () => {
				const ret = client.prepare('select height, hash, nextblockhash from block where height = (select max (height) from block)')
					.get();
				assert(typeof ret !== 'undefined');
				return ret;
			}
		}
	};
	return db;
};

module.exports = sqlite();
