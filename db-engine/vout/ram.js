'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

const assert = require('assert');
const util = require('../../lib/util.js');

const mongodbVout = async () => {
	const configuration = require('../../configuration');
	const Ram = require('../common/ram');
	const ram = new Ram();
	await ram.init(configuration.dbEngine.vout.ram);

	const ramdb = {
		block: {
			lastInsertHash: null,
			table: {}
		},
		hex: {
			table: {}
		},
		address: {
			realAddress: {},
			table: {}
		},
		utxo: {
			table: {}
		}
	};
	const db = {
		block: {
			selectCount: async () => {
				const ts_counter = util.keys(ramdb.block.table).length;
				return {ts_counter};
			},
			findOne: async filter => {
				return ramdb.block.table[filter];
			},
			insert: async block => {
				// height, hash, nextblockhash
				ramdb.block.table[block.hash] = {
					height: block.height,
					hash: block.hash,
					nextblockhash: block.nextblockhash
				};
				ramdb.block.lastInsertHash = block.hash;
				return {
					lastInsertRowid: block.hash
				};
			},

			selectLast: async _ => {
				return ramdb.block.lastInsertHash;
			}
		},

		hex: {

			getCachedRefByHashIf: async hash => {
				return ramdb.hex.table[hash];
			},

			upsert: async (hex, hash, spk_type_ref, satoshi_in) => {
				util.assert.isSatoshi(satoshi_in);
				assert(satoshi_in >= 0);

				if (typeof ramdb.hex.table[hash] === 'undefined') {
					ramdb.hex.table[hash] = {
						hex,
						hash,
						spk_type_ref,
						satoshi_in,
						satoshi_out: 0,
						counter: 1
					};
				} else {
					ramdb.hex.table[hash].satoshi_in += satoshi_in;
					++ramdb.hex.table[hash].counter;
				}

				return hash;
			},

			updateIncrement: async (hash, satoshi_out) => {
				util.assert.isSatoshi(satoshi_out);
				assert(satoshi_out > 0);
				ramdb.hex.table[hash].satoshi_out += satoshi_out;
			}
		},

		address: {
			upsert: async (address, hex_ref) => {
			// address = {address, spk_type_ref}
				assert(typeof address !== 'undefined');
				assert(typeof address.address !== 'undefined');
				assert(typeof address.spk_type_ref !== 'undefined');
				assert(typeof hex_ref !== 'undefined');
				const idAddress = util.sha256(JSON.stringify(address));

				if (typeof ramdb.address.realAddress[idAddress] === 'undefined') {
					ramdb.address.realAddress[idAddress] = {
						address, // {address, spk_type_ref}
						counter: 1
					};
				} else {
					++ramdb.address.realAddress[idAddress].counter;
				}
				const id = util.sha256(JSON.stringify({address, hex_ref}));
				if (typeof ramdb.address.table[id] === 'undefined') {
					ramdb.address.table[id] = {
						address, // {address, spk_type_ref}
						hex_ref,
						counter: 1
					};
				} else {
					++ramdb.address.table[id].counter;
				}
				return {};
			}
		},

		utxo: {
			insert: async (txid, vout, value, hex_ref) => {
				const id = util.sha256(JSON.stringify({txid, vout}));
				ramdb.utxo.table[id] = {
					_id: id,
					txid,
					vout,
					value,
					hex_ref,
					spent: false
				};

				return {
					lastInsertRowid: id
				};
			},

			updateSpent: async (id, txid) => {
				assert(typeof id !== 'undefined');
				assert(typeof txid !== 'undefined');

				ramdb.utxo.table[id].spent = txid;

				return {};
			},

			select: async (txid, vout, _) => {
			// https://www.mongodb.com/blog/post/joins-and-other-aggregation-enhancements-coming-in-mongodb-3-2-part-1-of-3-introduction
				/*
"{
        "_id": "5c7808790877b31cbeb475bb",
        "value": 50,
        "hex_ref": "5c78087985642f323080775b"
}"
*/
				const id = util.sha256(JSON.stringify({txid, vout}));
				return ramdb.utxo.table[id];
			}
		}
	};
	db.block = Object.assign({}, ram.block, db.block);
	return Object.assign({}, ram, db);
};

module.exports = mongodbVout();
