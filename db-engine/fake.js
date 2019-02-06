'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');

const assertSatoshi = satoshi => {
	assert(typeof satoshi !== 'undefined');
	assert(Number.isInteger(satoshi));
};

const sqlite = () => {
	const configuration = require('../configuration');
	let fakeBlockIndex = 0;
	let fakeTransactionIndex = 0;
	let fakeUtxo = 0;
	let fakeUtxoHex = 0;
	let fakeHexId = 0;

	const db = {
		beginTransaction: () => {
		},
		commit: () => {
		},
		selectCountBlock: () => {
			return typeof (configuration.dbEngine.fake.nextblockhash) !== 'undefined';
		},
		selectLastBlock: () => {
			assert(typeof (configuration.dbEngine.fake.nextblockhash) !== 'undefined');
			return {
				nextblockhash: configuration.dbEngine.fake.nextblockhash
			};
		},
		/* eslint-disable no-unused-vars */
		insertBlock: block => {
			return {
				lastInsertRowid: ++fakeBlockIndex
			};
		},
		insertTransaction: (txid, block_ref) => {
			return {
				lastInsertRowid: ++fakeTransactionIndex
			};
		},
		insertUtxo: (transaction_ref, vout, value) => {
			return {
				lastInsertRowid: ++fakeUtxo
			};
		},
		upsertSpkType: type => {
			return {};
		},
		upsertAddress: (text, hex_ref) => {
			return {};
		},
		upsertHex: (hex, spk_type_ref, satoshi) => {
			assert(typeof hex !== 'undefined');
			assertSatoshi(satoshi);
			return {};
		},
		insertUtxoHex: (utxo_ref, ref) => {
			return {
				lastInsertRowid: ++fakeUtxoHex
			};
		},
		updateHexDelta: (hex, deltaSatoshi) => {
			assert(typeof hex !== 'undefined');
			return {};
		},
		updateHex: (hex_id, satoshi) => {
			assert(typeof hex_id !== 'undefined');
			assertSatoshi(satoshi);
			return {};
		},
		/*
		selectVoutOld: (txid, vout) => {
			const ret = client.prepare('select id, "id:2" as hex_id, hex, value, satoshi from vv_utxo_hex ' +
				'where transaction_ref = (select id from h_transaction where txid = ?) and vout = ? and spent=0')
				.get(txid, vout);
			assert(typeof ret !== 'undefined');
			assertSatoshi(ret.satoshi);
			return ret;
		},
		*/
		selectVout: (txid, vout) => {
			return {
				id: fakeUtxo,
				value: 1,
				satoshi: 1 * 100000000,
				hex_id: ++fakeHexId
			};
		},
		updateUtxoSpent: id => {
			return {};
		}
		/* eslint-enable no-unused-vars */
	};
	return db;
};

module.exports = sqlite();
