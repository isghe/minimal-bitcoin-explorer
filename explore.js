/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

'use strict';
const assert = require('assert');

const explore = {
	bc: null,
	db: null
};

const db = {
	beginTransaction: () => {
		explore.db.prepare('begin transaction')
			.run();
	},
	commit: () => {
		explore.db.prepare('commit')
			.run();
	},
	selectLastBlock: () => {
		return explore.db.prepare('select max (blockid) as lastBlockID from block')
			.get();
	},
	insertBlock: (index, hash) => {
		const info = explore.db.prepare('insert into block(blockid, hash) values (?, ?)')
			.run(index, hash);
		assert(info.changes === 1);
		return info;
	},
	insertTransaction: (txid, block_ref) => {
		const info = explore.db.prepare('insert into h_transaction(txid, block_ref) values (?, ?)')
			.run(txid, block_ref);
		assert(info.changes === 1);
		return info;
	},
	insertUtxo: (transaction_ref, vout, value) => {
		const info = explore.db.prepare('insert into utxo(transaction_ref, vout, value) values (?, ?, ?)')
			.run(transaction_ref, vout, value);
		assert(info.changes === 1);
		return info;
	},
	upsertSpkType: type => {
		const info = explore.db.prepare('insert into spk_type (description, counter) values (?, 1) ON CONFLICT(description) DO UPDATE SET counter = (select counter + 1 from spk_type where description = ?)')
			.run(type, type);
		assert(info.changes === 1);
		return info;
	},
	upsertAddress: (text, hex_ref) => {
		const info = explore.db.prepare('insert into address(address, hex_ref, counter) values (?, (' + hex_ref + '),1) ON CONFLICT(address) DO UPDATE SET counter = (select counter + 1 from address where address = ?)')
			.run(text, text);
		assert(info.changes === 1);
		return info;
	},
	upsertHex: (hex, spk_type_ref, satoshi) => {
		const info = explore.db.prepare('insert into hex(hex, spk_type_ref, counter, satoshi) values (?, (' + spk_type_ref + '),1, ?) ON CONFLICT(hex) DO UPDATE SET counter = (select counter + 1 from hex where hex = ?)')
			.run(hex, satoshi, hex);
		assert(info.changes === 1);
		return info;
	},
	insertUtxoHex: (utxo_ref, ref) => {
		const info = explore.db.prepare('insert into utxo_hex(utxo_ref, hex_ref) values (?, (' + ref + '))')
			.run(utxo_ref);
		assert(info.changes === 1);
		return info;
	},
	updateHex: (hex, deltaSatoshi) => {
		assert(hex);
		const info = explore.db.prepare('update hex set satoshi = (select satoshi + ? from hex where hex = ?) where hex = ?')
			.run(deltaSatoshi, hex, hex);
		assert(info.changes === 1);
		return info;
	},
	selectVout: (txid, vout) => {
		const ret = explore.db.prepare('select id, hex, value from vv_utxo_hex where transaction_ref = (select id from h_transaction where txid = ?) and vout = ? and spent=0')
			.get(txid, vout);
		assert(ret);
		return ret;
	},
	updateUtxoSpent: id => {
		const info = explore.db.prepare('update utxo set spent = 1 where id = ?')
			.run(id);
		assert(info.changes === 1);
		return info;
	}
};

const valueToSatoshi = bitcoin => {
	return bitcoin * 100000000;
};

const handleTransaction = (raw, block_ref) => {
	const transaction = db.insertTransaction(raw.txid, block_ref);
	// console.log (raw);
	raw.vout.forEach(vout => {
		db.upsertSpkType(vout.scriptPubKey.type);
		const transaction_ref = transaction.lastInsertRowid;
		const utxo = db.insertUtxo(transaction_ref, vout.n, vout.value);
		const utxo_ref = utxo.lastInsertRowid;
		const spk_type_ref = 'select id from spk_type where description=\'' + vout.scriptPubKey.type + '\'';
		db.upsertHex(vout.scriptPubKey.hex, spk_type_ref, valueToSatoshi(vout.value));
		const hex_ref = 'select id from hex where hex=\'' + vout.scriptPubKey.hex + '\'';
		db.insertUtxoHex(utxo_ref, hex_ref, valueToSatoshi(vout.value));
		if (vout.scriptPubKey.addresses) {
			vout.scriptPubKey.addresses.forEach(address => {
				db.upsertAddress(address, hex_ref);
			});
		}
	});

	raw.vin.forEach(vin => {
		if (!vin.coinbase) {
			const voutFound = db.selectVout(vin.txid, vin.vout);
			assert(voutFound);
			db.updateHex(voutFound.hex, -valueToSatoshi(voutFound.value));
			db.updateUtxoSpent(voutFound.id);
		}
	});
};

const main = async () => {
	const BitcoinCore = require('bitcoin-core');
	const configuration = require('./configuration');
	const BetterSqlite3 = require('better-sqlite3');
	explore.db = new BetterSqlite3('explore.sqlite');

	explore.bc = new BitcoinCore(configuration.bitcoinCore);
	const lastBlock = db.selectLastBlock();
	for (let i = lastBlock.lastBlockID + 1; i <= 200000; ++i) {
		db.beginTransaction();
		const blockHash = await explore.bc.getBlockHash(i);
		const insertBlockResult = db.insertBlock(i, blockHash);
		const block = await explore.bc.getBlock(blockHash, 2);

		block.tx.forEach(raw => {
			handleTransaction(raw, insertBlockResult.lastInsertRowid);
		});
		db.commit();
	}
};

main();

