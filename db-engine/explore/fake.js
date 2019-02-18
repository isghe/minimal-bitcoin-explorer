'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const fake = () => {
	const configuration = require('../../configuration');
	let fakeBlockIndex = 0;
	let fakeTransactionIndex = 0;
	let fakeUtxo = 0;
	let fakeUtxoHex = 0;
	let fakeHexId = 0;

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
				if (typeof (configuration.dbEngine.explore.fake.nextblockhash) !== 'undefined') {
					ret.ts_counter = 1;
				}
				return ret;
			},
			selectLast: () => {
				assert(typeof (configuration.dbEngine.explore.fake.nextblockhash) !== 'undefined');
				return {
					nextblockhash: configuration.dbEngine.explore.fake.nextblockhash
				};
			},
			/* eslint-disable no-unused-vars */
			insert: block => {
				return {
					lastInsertRowid: ++fakeBlockIndex
				};
			}
		},
		transaction: {
			insert: (txid, block_ref) => {
				return {
					lastInsertRowid: ++fakeTransactionIndex
				};
			}
		},
		utxo: {
			insert: (transaction_ref, vout, value) => {
				return {
					lastInsertRowid: ++fakeUtxo
				};
			},
			updateSpent: id => {
				return {};
			}
		},
		spkType: {
			upsert: type => {
				return {};
			},
			getRef: description => {
				return 0;
			},
			getCachedRefIf: description => {
				return db.spkType.getRef(description);
			}
		},
		hex: {
			getRefByHash: hash => {
				return 0;
			},
			getCachedRefByHashIf: async hash => {
				return db.hex.getRefByHash(hash);
			},
			upsert: (hex, spk_type_ref, satoshi) => {
				assert(typeof hex !== 'undefined');
				util.assert.isSatoshi(satoshi);
				return {};
			},
			update: (hex_id, satoshi) => {
				assert(typeof hex_id !== 'undefined');
				util.assert.isSatoshi(satoshi);
				return {};
			}
		},
		address: {
			upsert: (text, hex_ref, /* spk_type_ref */) => {
				return {};
			}
		},
		utxoHex: {
			insert: (utxo_ref, ref) => {
				return {
					lastInsertRowid: ++fakeUtxoHex
				};
			}
		},
		vout: {
			select: (txid, vout) => {
				return {
					id: fakeUtxo,
					value: 1,
					satoshi: 1 * 100000000,
					hex_id: ++fakeHexId
				};
			}
		}
		/* eslint-enable no-unused-vars */
	};
	return db;
};

module.exports = fake();
