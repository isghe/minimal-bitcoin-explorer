'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const sqlite = () => {
	const configuration = require('../../configuration');
	const dbCommon = require('../common/sqlite');
	const client = dbCommon.client(configuration.dbEngine.explore.sqlite);
	const db = {
		block: {
			insert: block => {
				const info = client.prepare('insert into block(height, hash, nextblockhash) values (?, ?, ?)')
					.run(block.height, block.hash, block.nextblockhash);
				assert(info.changes === 1);
				return info;
			}
		},
		transaction: {
			insert: (txid, block_ref) => {
				const info = client.prepare('insert into h_transaction(txid, block_ref) values (?, ?)')
					.run(txid, block_ref);
				assert(info.changes === 1);
				return info;
			}
		},
		utxo: {
			insert: (transaction_ref, vout, value) => {
				const info = client.prepare('insert into utxo(transaction_ref, vout, value) values (?, ?, ?)')
					.run(transaction_ref, vout, value);
				assert(info.changes === 1);
				return info;
			},
			updateSpent: id => {
				const info = client.prepare('update utxo set spent = 1 where id = ?')
					.run(id);
				assert(info.changes === 1);
				return info;
			}
		},
		spkType: {
			upsert: type => {
				const info = client.prepare('insert into spk_type (description, counter) values (?, 1) ' +
					'ON CONFLICT(description) DO UPDATE SET counter = (select counter + 1 from spk_type where description = ?)')
					.run(type, type);
				assert(info.changes === 1);
				return info;
			},
			getRef: description => {
				return 'select id from spk_type where description=\'' + description + '\'';
			},
			getCachedRefIf: description => {
				return db.spkType.getRef(description);
			}
		},
		hex: {
			getRefByHash: hash => {
				return 'select id from hex where hash=\'' + hash + '\'';
			},
			getCachedRefByHashIf: async hash => {
				return db.hex.getRefByHash(hash);
			},
			upsert: (hex, hash, spk_type_ref, satoshi) => {
				assert(typeof hex !== 'undefined');
				util.assert.isSatoshi(satoshi);
				const info = client.prepare('insert into hex(hex, hash, spk_type_ref, counter, satoshi) values (?, ?, (' + spk_type_ref + '),1, ?) ' +
					'ON CONFLICT(hash) DO UPDATE SET counter = (select counter + 1 from hex where hash = ?), satoshi = ? + (select satoshi where hash = ?)')
					.run(hex, hash, satoshi, hash, satoshi, hash);
				assert(info.changes === 1);
				return {};
			},
			update: (hex_id, satoshi) => {
				assert(typeof hex_id !== 'undefined');
				util.assert.isSatoshi(satoshi);
				const info = client.prepare('update hex set satoshi = ? where id = ?')
					.run(satoshi, hex_id);
				assert(info.changes === 1);
				return info;
			}
		},
		address: {
			upsert: (text, hex_ref, /* spk_type_ref */) => {
				const info = client.prepare('insert into address(address, hex_ref, counter) values (?, (' + hex_ref + '),1) ' +
					'ON CONFLICT(address, hex_ref) DO UPDATE SET counter = (select counter + 1 from address where address = ? and hex_ref = (' + hex_ref + '))')
					.run(text, text);
				assert(info.changes === 1);
				return info;
			}
		},
		utxoHex: {
			insert: (utxo_ref, ref) => {
				const info = client.prepare('insert into utxo_hex(utxo_ref, hex_ref) values (?, (' + ref + '))')
					.run(utxo_ref);
				assert(info.changes === 1);
				return info;
			}
		},
		vout: {
			select: (txid, vout) => {
				const ret = client.prepare('select id, "id:2" as hex_id, hex, value, satoshi from vv_utxo_hex ' +
					'where transaction_ref = (select id from h_transaction where txid = ?) and vout = ? and spent=0')
					.get(txid, vout);
				assert(typeof ret !== 'undefined');
				util.assert.isSatoshi(ret.satoshi);
				return ret;
			}
		}
	};
	db.block = Object.assign({}, dbCommon.block, db.block);
	return Object.assign({}, dbCommon, db);
};

module.exports = sqlite();
