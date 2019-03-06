'use strict';
/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-vars */

const assert = require('assert');
const util = require('../../lib/util.js');

const mongodbVout = async () => {
	const configuration = require('../../configuration');
	const fake = require('../common/fake');

	const db = {
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
			getRefByHash: async hash => {
				return 1;
			},

			getCachedRefByHashIf: async hash => {
				if (typeof fake.cache.hex[hash] === 'undefined') {
					fake.cache.hex[hash] = await db.hex.getRefByHash(hash);
				}
				return fake.cache.hex[hash];
			},

			upsert: async (hex, hash, spk_type_ref, satoshi_in) => {
				util.assert.isSatoshi(satoshi_in);
				assert(satoshi_in >= 0);

				return 1;
			},

			updateIncrement: async (_id, satoshi_out) => {
				util.assert.isSatoshi(satoshi_out);
				assert(satoshi_out > 0);
			}
		},

		address: {
			upsert: async (address, hex_ref) => {
			// address = {address, spk_type_ref}
				assert(typeof address !== 'undefined');
				assert(typeof address.address !== 'undefined');
				assert(typeof address.spk_type_ref !== 'undefined');
				assert(typeof hex_ref !== 'undefined');

				return {};
			}
		},

		utxo: {
			insert: async (txid, vout, value, hex_ref) => {
				return {
					lastInsertRowid: 1
				};
			},

			updateSpent: async (id, txid) => {
				assert(typeof id !== 'undefined');
				assert(typeof txid !== 'undefined');

				return {};
			},

			select: async (txid, vout, spent) => {
			// https://www.mongodb.com/blog/post/joins-and-other-aggregation-enhancements-coming-in-mongodb-3-2-part-1-of-3-introduction
				/*
"{
        "_id": "5c7808790877b31cbeb475bb",
        "value": 50,
        "hex_ref": "5c78087985642f323080775b"
}"
*/
				return {
					_id: 1,
					value: 50,
					hex_ref: 1
				};
			}
		}
	};
	db.block = Object.assign({}, fake.block, db.block);
	return Object.assign({}, fake, db);
};

module.exports = mongodbVout();
