/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

'use strict';
const assert = require('assert');
const util = require('./lib/util.js');

const explore = {
	db: {
		downloadAll: null,
		vout: null
	}
};

const profile = {
	height: 0,
	rpc: new util.DeltaSigma(0, 0), // ticks executing RPC call
	db: {
		query: new util.DeltaSigma(0, 0), // ticks executing query on db
		commit: new util.DeltaSigma(0, 0), // ticks executing commit on db
		vout: new util.DeltaSigma(0, 0), // ticks executing commit on vout
		vin: new util.DeltaSigma(0, 0) // ticks executing commit on vin
	},
	tx: new util.DeltaSigma(0, 0), // number of transactions
	profile: new util.DeltaSigma(0, 0),
	change: 0,
	'tx/s': null // new util.DeltaSigma(0, 0)
};

const handleTransaction = async raw => {
	assert(typeof raw !== 'undefined');

	const voutCrono = new util.Crono();
	{
		const bulks = {
			utxo: await explore.db.vout.utxo.initializeUnorderedBulkOp(),
			address: await explore.db.vout.address.initializeUnorderedBulkOp()
		};
		for (let i = 0; i < raw.vout.length; ++i) {
		// await raw.vout.forEach(async vout => {
			const vout = raw.vout[i];
			assert(typeof vout !== 'undefined');
			let spk_type_ref = await explore.db.vout.spkType.upsert(vout.scriptPubKey.type);

			if (spk_type_ref === null) {
				spk_type_ref = await explore.db.vout.spkType.getCachedRefIf(vout.scriptPubKey.type);
			}
			const hash = util.sha256(vout.scriptPubKey.hex);

			let hex_ref = await explore.db.vout.hex.upsert(vout.scriptPubKey.hex, hash, spk_type_ref, util.bitcoinToSatoshi(vout.value));
			if (hash === 'b58bb87c47b96d1a4dff14b4cc042e2aa88d1a92da80c683f3fc84a6bddceb6b') {
				console.log(vout.scriptPubKey.hex); // 18jANvQ6AuVGJnea4EhmXiAf6bHR5qKjPB, p2pk and p2pkh
			}

			if (hex_ref === null) {
				hex_ref = await explore.db.vout.hex.getCachedRefByHashIf(hash);
			}

			await explore.db.vout.utxo.insertBulk(bulks.utxo, raw.txid, vout.n, vout.value, hex_ref);

			if (vout.scriptPubKey.addresses) {
				for (let j = 0; j < vout.scriptPubKey.addresses.length; ++j) {
					const address = vout.scriptPubKey.addresses[j];
					await explore.db.vout.address.upsertBulk(bulks.address, {address, spk_type_ref}, hex_ref);
				}
			}
		}
		// });

		if (bulks.address.length > 0) {
			const res = await bulks.address.execute();
			assert(typeof res !== 'undefined');
			assert(res.nModified === bulks.address.length);
		}
		if (bulks.utxo.length > 0) {
			const res = await bulks.utxo.execute();
			assert(typeof res !== 'undefined');
			assert(res.nModified === bulks.utxo.length);
		}
	}
	profile.db.vout.increment(voutCrono.delta());

	const vinCrono = new util.Crono();
	{
		const bulks = {
			hex: await explore.db.vout.hex.initializeUnorderedBulkOp(),
			utxo: await explore.db.vout.utxo.initializeUnorderedBulkOp()
		};
		for (let z = 0; z < raw.vin.length; ++z) {
			const vin = raw.vin[z];
			if (!vin.coinbase) {
				// txid, vout -> value, hex_ref, utxo_id
				const utxo = await explore.db.vout.utxo.select(vin.txid, vin.vout, false);
				const satoshi = util.bitcoinToSatoshi(utxo.value);
				if (satoshi > 0) {
					await explore.db.vout.hex.updateIncrementBulk(bulks.hex, utxo.hex_ref, satoshi);
				}
				await explore.db.vout.utxo.updateSpentBulk(bulks.utxo, utxo._id, raw.txid);
			}
		}
		if (bulks.hex.length > 0) {
			const res = await bulks.hex.execute();
			assert(typeof res !== 'undefined');
			assert(res.nModified === bulks.hex.length);
		}
		if (bulks.utxo.length > 0) {
			const res = await bulks.utxo.execute();
			assert(typeof res !== 'undefined');
			assert(res.nModified === bulks.utxo.length);
		}
	}
	profile.db.vin.increment(vinCrono.delta());
};

const main = async () => {
	const configuration = require('./configuration');
	explore.db.downloadAll = await require('./db-engine/download-all/' + configuration.dbEngine.downloadAll.name);
	explore.db.vout = await require('./db-engine/vout/' + configuration.dbEngine.vout.name);
	console.log('Current db-engine: ' + configuration.dbEngine.vout.name);
	const stoppedSuccesfully = await explore.db.vout.controlFlow.stoppedSuccesfully();
	assert(stoppedSuccesfully === true);

	let lastBlock = {};
	const count = (await explore.db.vout.block.selectCount()).ts_counter;
	if (count > 0) {
		lastBlock = await explore.db.vout.block.selectLast(count);
	} else {
		// genesis block.hash
		lastBlock.nextblockhash = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
		lastBlock.height = 0;
	}
	console.log({height: lastBlock.height, nextblockhash: lastBlock.nextblockhash});

	while (true) { // eslint-disable-line no-constant-condition
		const hasToStop = await explore.db.vout.controlFlow.hasToStop();
		if (hasToStop === true) {
			break;
		}
		const profileCrono = new util.Crono();
		explore.db.vout.beginTransaction();
		for (let i = 0; i < 1; ++i) {
			const rpcCrono = new util.Crono();
			assert(typeof lastBlock.nextblockhash !== 'undefined');
			const lastBlockWrapper = await explore.db.downloadAll.block.findOne({'block.hash': lastBlock.nextblockhash});
			lastBlock = lastBlockWrapper.block;
			profile.rpc.increment(rpcCrono.delta());
			assert(typeof lastBlock !== 'undefined');

			profile.height = lastBlock.height;

			const dbCrono = new util.Crono();
			const insertBlockResult = await explore.db.vout.block.insert(lastBlock);
			assert(typeof insertBlockResult.lastInsertRowid !== 'undefined');
			profile.tx.increment(lastBlock.tx.length);
			for (let z = 0; z < lastBlock.tx.length; ++z) {
				await handleTransaction(lastBlock.tx[z]);
			}

			profile.db.query.increment(dbCrono.delta());
		}
		const commitCrono = new util.Crono();
		explore.db.vout.commit();

		profile.db.commit.update(commitCrono.delta());
		profile.profile.update(profileCrono.delta());

		profile.change = profile.profile.sigma - (profile.rpc.sigma + profile.db.query.sigma + profile.db.commit.sigma);
		profile['tx/s'] = new util.DeltaSigma(1000 * profile.tx.delta / profile.profile.delta, 1000 * profile.tx.sigma / profile.profile.sigma);

		console.log(JSON.stringify({profile, info: explore.db.vout.info()}));

		profile.db.query.delta = 0;
		profile.db.vout.delta = 0;
		profile.db.vin.delta = 0;
		profile.rpc.delta = 0;
		profile.tx.delta = 0;
	}
	await explore.db.vout.controlFlow.setStopSuccesfully();
	console.log('Stopped succesfully');
};

main();

