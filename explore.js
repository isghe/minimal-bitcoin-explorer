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
	selectCountBlock: () => {
		const ret = explore.db.prepare('select count (*) as ts_counter from block')
			.get();
		assert(typeof ret !== 'undefined');
		return ret;
	},
	selectLastBlock: () => {
		const ret = explore.db.prepare('select height, hash, nextblockhash from block where height = (select max (height) from block)')
			.get();
		assert(typeof ret !== 'undefined');
		return ret;
	},
	insertBlock: block => {
		const info = explore.db.prepare('insert into block(height, hash, nextblockhash) values (?, ?, ?)')
			.run(block.height, block.hash, block.nextblockhash);
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
		const info = explore.db.prepare('insert into spk_type (description, counter) values (?, 1) ' +
			'ON CONFLICT(description) DO UPDATE SET counter = (select counter + 1 from spk_type where description = ?)')
			.run(type, type);
		assert(info.changes === 1);
		return info;
	},
	upsertAddress: (text, hex_ref) => {
		const info = explore.db.prepare('insert into address(address, hex_ref, counter) values (?, (' + hex_ref + '),1) ' +
			'ON CONFLICT(address) DO UPDATE SET counter = (select counter + 1 from address where address = ?)')
			.run(text, text);
		assert(info.changes === 1);
		return info;
	},
	upsertHex: (hex, spk_type_ref, satoshi) => {
		assert(typeof hex !== 'undefined');
		assertSatoshi(satoshi);
		const info = explore.db.prepare('insert into hex(hex, spk_type_ref, counter, satoshi) values (?, (' + spk_type_ref + '),1, ?) ' +
			'ON CONFLICT(hex) DO UPDATE SET counter = (select counter + 1 from hex where hex = ?), satoshi = ? + (select satoshi where hex = ?)')
			.run(hex, satoshi, hex, satoshi, hex);
		// console.log (info);
		assert(info.changes === 1);
		return info;
	},
	insertUtxoHex: (utxo_ref, ref) => {
		const info = explore.db.prepare('insert into utxo_hex(utxo_ref, hex_ref) values (?, (' + ref + '))')
			.run(utxo_ref);
		assert(info.changes === 1);
		return info;
	},
	updateHexDelta: (hex, deltaSatoshi) => {
		assert(typeof hex !== 'undefined');
		const info = explore.db.prepare('update hex set satoshi = (select satoshi + ? from hex where hex = ?) where hex = ?')
			.run(deltaSatoshi, hex, hex);
		assert(info.changes === 1);
		return info;
	},
	updateHex: (hex_id, satoshi) => {
		assert(typeof hex_id !== 'undefined');
		assertSatoshi(satoshi);
		const info = explore.db.prepare('update hex set satoshi = ? where id = ?')
			.run(satoshi, hex_id);
		assert(info.changes === 1);
		return info;
	},
	selectVout: (txid, vout) => {
		const ret = explore.db.prepare('select id, "id:2" as hex_id, hex, value, satoshi from vv_utxo_hex ' +
			'where transaction_ref = (select id from h_transaction where txid = ?) and vout = ? and spent=0')
			.get(txid, vout);
		assert(typeof ret !== 'undefined');
		assertSatoshi(ret.satoshi);
		return ret;
	},
	updateUtxoSpent: id => {
		const info = explore.db.prepare('update utxo set spent = 1 where id = ?')
			.run(id);
		assert(info.changes === 1);
		return info;
	}
};

const assertSatoshi = satoshi => {
	assert(typeof satoshi !== 'undefined');
	assert(Number.isInteger(satoshi));
};

const valueToSatoshi = bitcoin => {
	assert(typeof bitcoin !== 'undefined');
	// 32.91*100000000 = 3290999999.9999995!!!
	const satoshi = Math.round(bitcoin * 100000000);
	assertSatoshi(satoshi);
	return satoshi;
};

function Crono() {
	this.fStart = new Date();
	this.delta = () => {
		return new Date() - this.fStart;
	};
}

function DeltaSigma(delta, sigma) {
	this.delta = delta;
	this.sigma = sigma;
	this.update = delta => {
		this.delta = delta;
		this.sigma += delta;
	};
	this.increment = delta => {
		this.delta += delta;
		this.sigma += delta;
	};
}

const profile = {
	height: 0,
	rpc: new DeltaSigma(0, 0), // ticks executing RPC call
	db: {
		query: new DeltaSigma(0, 0), // ticks executing query on db
		commit: new DeltaSigma(0, 0), // ticks executing commit on db
		vout: new DeltaSigma(0, 0), // ticks executing commit on vout
		vin: new DeltaSigma(0, 0) // ticks executing commit on vin
	},
	tx: new DeltaSigma(0, 0), // number of transactions
	profile: new DeltaSigma(0, 0), // number of transactions
	change: 0,
	'tx/s': 0
};

const handleTransaction = (raw, block_ref) => {
	assert(typeof raw !== 'undefined');
	assert(typeof block_ref !== 'undefined');
	const transaction = db.insertTransaction(raw.txid, block_ref);
	// console.log (raw);
	const voutCrono = new Crono();
	raw.vout.forEach(vout => {
		assert(typeof vout !== 'undefined');
		db.upsertSpkType(vout.scriptPubKey.type);
		const transaction_ref = transaction.lastInsertRowid;
		const utxo = db.insertUtxo(transaction_ref, vout.n, vout.value);
		const utxo_ref = utxo.lastInsertRowid;
		const spk_type_ref = 'select id from spk_type where description=\'' + vout.scriptPubKey.type + '\'';
		db.upsertHex(vout.scriptPubKey.hex, spk_type_ref, valueToSatoshi(vout.value));
		const hex_ref = 'select id from hex where hex=\'' + vout.scriptPubKey.hex + '\'';
		db.insertUtxoHex(utxo_ref, hex_ref);
		if (vout.scriptPubKey.addresses) {
			vout.scriptPubKey.addresses.forEach(address => {
				db.upsertAddress(address, hex_ref);
			});
		}
	});
	profile.db.vout.increment(voutCrono.delta());

	const vinCrono = new Crono();
	raw.vin.forEach(vin => {
		if (!vin.coinbase) {
			const voutFound = db.selectVout(vin.txid, vin.vout);
			assert(typeof voutFound !== 'undefined');
			const satoshi = voutFound.satoshi - valueToSatoshi(voutFound.value);
			assert(satoshi >= 0);
			db.updateHex(voutFound.hex_id, satoshi);
			db.updateUtxoSpent(voutFound.id);
		}
	});
	profile.db.vin.increment(vinCrono.delta());
};

const main = async () => {
	const BitcoinCore = require('bitcoin-core');
	const configuration = require('./configuration');
	const BetterSqlite3 = require('better-sqlite3');
	explore.db = new BetterSqlite3('explore.sqlite', {
		verboseNo: query => {
			assert(typeof query !== 'undefined');
			console.log(JSON.stringify({query}));
		}
	});

	explore.bc = new BitcoinCore(configuration.bitcoinCore);
	let lastBlock = {};
	if (db.selectCountBlock().ts_counter > 0) {
		lastBlock = db.selectLastBlock();
	} else {
		// genesis block.hash
		lastBlock.nextblockhash = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
	}

	for (;;) {
		const profileCrono = new Crono();
		db.beginTransaction();
		for (let i = 0; i < 10; ++i) {
			const rpcCrono = new Crono();
			lastBlock = await explore.bc.getBlock(lastBlock.nextblockhash, 2);
			profile.rpc.increment(rpcCrono.delta());
			assert(typeof lastBlock !== 'undefined');

			profile.height = lastBlock.height;

			const dbCrono = new Crono();
			const insertBlockResult = db.insertBlock(lastBlock);
			profile.tx.increment(lastBlock.tx.length);
			lastBlock.tx.forEach(raw => {
				handleTransaction(raw, insertBlockResult.lastInsertRowid);
			});
			profile.db.query.increment(dbCrono.delta());
		}
		const commitCrono = new Crono();
		db.commit();

		profile.db.commit.update(commitCrono.delta());
		profile.profile.update(profileCrono.delta());

		profile.change = profile.profile.sigma - (profile.rpc.sigma + profile.db.query.sigma + profile.db.commit.sigma);
		profile['tx/s'] = 1000 * profile.tx.delta / profile.delta;

		console.log(JSON.stringify({profile}));

		profile.db.query.delta = 0;
		profile.rpc.delta = 0;
		profile.tx.delta = 0;
		profile.db.vout.delta = 0;
		profile.db.vin.delta = 0;
	}
};

main();

