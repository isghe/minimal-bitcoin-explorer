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

	const vinCrono = new util.Crono();
	for (let z = 0; z < raw.vin.length; ++z) {
		const vin = raw.vin[z];
		if (!vin.coinbase) {
			// txid, vout -> value, hex_ref, utxo_id
			const utxo = await explore.db.vout.utxo.select(vin.txid, vin.vout, true);
			if (utxo === null) {
				console.log({utxo});
			}
			await explore.db.vout.utxo.updateSpent(utxo._id, raw.txid);
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

	let lastBlock = {nextblockhash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f', height: 0};
	console.log({height: lastBlock.height, nextblockhash: lastBlock.nextblockhash});

	while (true) { // eslint-disable-line no-constant-condition
		const hasToStop = await explore.db.vout.controlFlow.hasToStop();
		if (hasToStop === true) {
			break;
		}
		if (lastBlock.height >= 201620) {
			break;
		}
		const profileCrono = new util.Crono();
		explore.db.vout.beginTransaction();
		// for (let i = 0; i < 1; ++i) {
		const rpcCrono = new util.Crono();
		assert(typeof lastBlock.nextblockhash !== 'undefined');
		const lastBlockWrapper = await explore.db.downloadAll.block.findOne({'block.hash': lastBlock.nextblockhash});
		lastBlock = lastBlockWrapper.block;
		profile.rpc.increment(rpcCrono.delta());
		assert(typeof lastBlock !== 'undefined');

		profile.height = lastBlock.height;

		const dbCrono = new util.Crono();

		profile.tx.increment(lastBlock.tx.length);
		for (let z = 0; z < lastBlock.tx.length; ++z) {
			await handleTransaction(lastBlock.tx[z]);
		}

		profile.db.query.increment(dbCrono.delta());
		// }
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

