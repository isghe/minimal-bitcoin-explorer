'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../lib/util.js');

const sqlite = () => {
	// const configuration = require('../configuration');
	const BetterSqlite3 = require('better-sqlite3');
	const client = new BetterSqlite3('explore.sqlite', {
		verboseNo: query => {
			assert(typeof query !== 'undefined');
			console.log(JSON.stringify({query}));
		}
	});

	const db = {
		beginTransaction: () => {
			client.prepare('begin transaction')
				.run();
		},
		commit: () => {
			client.prepare('commit')
				.run();
		},
		selectCountBlock: () => {
			const ret = client.prepare('select count (*) as ts_counter from block')
				.get();
			assert(typeof ret !== 'undefined');
			return ret;
		},
		selectLastBlock: () => {
			const ret = client.prepare('select height, hash, nextblockhash from block where height = (select max (height) from block)')
				.get();
			assert(typeof ret !== 'undefined');
			return ret;
		},
		insertBlock: block => {
			const info = client.prepare('insert into block(height, hash, nextblockhash) values (?, ?, ?)')
				.run(block.height, block.hash, block.nextblockhash);
			assert(info.changes === 1);
			return info;
		},
		insertTransaction: (txid, block_ref) => {
			const info = client.prepare('insert into h_transaction(txid, block_ref) values (?, ?)')
				.run(txid, block_ref);
			assert(info.changes === 1);
			return info;
		},
		insertUtxo: (transaction_ref, vout, value) => {
			const info = client.prepare('insert into utxo(transaction_ref, vout, value) values (?, ?, ?)')
				.run(transaction_ref, vout, value);
			assert(info.changes === 1);
			return info;
		},
		upsertSpkType: type => {
			const info = client.prepare('insert into spk_type (description, counter) values (?, 1) ' +
				'ON CONFLICT(description) DO UPDATE SET counter = (select counter + 1 from spk_type where description = ?)')
				.run(type, type);
			assert(info.changes === 1);
			return info;
		},
		getSpkTypeRef: description => {
			return 'select id from spk_type where description=\'' + description + '\'';
		},
		getHexRef: hex => {
			return 'select id from hex where hex=\'' + hex + '\'';
		},

		upsertAddress: (text, hex_ref) => {
			const info = client.prepare('insert into address(address, hex_ref, counter) values (?, (' + hex_ref + '),1) ' +
				'ON CONFLICT(address) DO UPDATE SET counter = (select counter + 1 from address where address = ?)')
				.run(text, text);
			assert(info.changes === 1);
			return info;
		},
		upsertHex: (hex, spk_type_ref, satoshi) => {
			assert(typeof hex !== 'undefined');
			util.assert.isSatoshi(satoshi);
			const info = client.prepare('insert into hex(hex, spk_type_ref, counter, satoshi) values (?, (' + spk_type_ref + '),1, ?) ' +
				'ON CONFLICT(hex) DO UPDATE SET counter = (select counter + 1 from hex where hex = ?), satoshi = ? + (select satoshi where hex = ?)')
				.run(hex, satoshi, hex, satoshi, hex);
			// console.log (info);
			assert(info.changes === 1);
			return info;
		},
		insertUtxoHex: (utxo_ref, ref) => {
			const info = client.prepare('insert into utxo_hex(utxo_ref, hex_ref) values (?, (' + ref + '))')
				.run(utxo_ref);
			assert(info.changes === 1);
			return info;
		},
		updateHexDelta: (hex, deltaSatoshi) => {
			assert(typeof hex !== 'undefined');
			const info = client.prepare('update hex set satoshi = (select satoshi + ? from hex where hex = ?) where hex = ?')
				.run(deltaSatoshi, hex, hex);
			assert(info.changes === 1);
			return info;
		},
		updateHex: (hex_id, satoshi) => {
			assert(typeof hex_id !== 'undefined');
			util.assert.isSatoshi(satoshi);
			const info = client.prepare('update hex set satoshi = ? where id = ?')
				.run(satoshi, hex_id);
			assert(info.changes === 1);
			return info;
		},
		selectVout: (txid, vout) => {
			const ret = client.prepare('select id, "id:2" as hex_id, hex, value, satoshi from vv_utxo_hex ' +
				'where transaction_ref = (select id from h_transaction where txid = ?) and vout = ? and spent=0')
				.get(txid, vout);
			assert(typeof ret !== 'undefined');
			util.assert.isSatoshi(ret.satoshi);
			return ret;
		},
		updateUtxoSpent: id => {
			const info = client.prepare('update utxo set spent = 1 where id = ?')
				.run(id);
			assert(info.changes === 1);
			return info;
		}
	};
	return db;
};

module.exports = sqlite();
