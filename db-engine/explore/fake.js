'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const fake = () => {
	let fakeTransactionIndex = 0;
	let fakeUtxo = 0;
	let fakeUtxoHex = 0;
	let fakeHexId = 0;

	const dbCommon = require('../common/fake');
	const db = {
		/* eslint-disable no-unused-vars */
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
	return Object.assign({}, dbCommon, db);
};

module.exports = fake();
