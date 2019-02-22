/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

'use strict';
const assert = require('assert');
const util = require('./lib/util.js');

const explore = {
	bc: null,
	db: {
		downloadAll: null,
		vout: null
	}
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
		commit: new DeltaSigma(0, 0) // ticks executing commit on db
	},
	tx: new DeltaSigma(0, 0), // number of transactions
	profile: new DeltaSigma(0, 0),
	change: 0,
	'tx/s': null // new DeltaSigma(0, 0)
};

const main = async () => {
	const BitcoinCore = require('bitcoin-core');
	const configuration = require('./configuration');
	explore.db.downloadAll = await require('./db-engine/download-all/' + configuration.dbEngine.downloadAll.name);
	explore.db.vout = await require('./db-engine/vout/' + configuration.dbEngine.vout.name);
	console.log('Current db-engine: ' + configuration.dbEngine.vout.name);
	const stoppedSuccesfully = await explore.db.vout.controlFlow.stoppedSuccesfully();
	assert(stoppedSuccesfully === true);
	explore.bc = new BitcoinCore(configuration.bitcoinCore);
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
		const profileCrono = new Crono();
		explore.db.vout.beginTransaction();
		for (let i = 0; i < 1; ++i) {
			const rpcCrono = new Crono();
			assert(typeof lastBlock.nextblockhash !== 'undefined');
			const lastBlockWrapper = await explore.db.downloadAll.block.findOne({'block.hash': lastBlock.nextblockhash});
			lastBlock = lastBlockWrapper.block;
			profile.rpc.increment(rpcCrono.delta());
			assert(typeof lastBlock !== 'undefined');

			profile.height = lastBlock.height;

			const dbCrono = new Crono();
			const insertBlockResult = await explore.db.vout.block.insert(lastBlock);
			assert(typeof insertBlockResult.lastInsertRowid !== 'undefined');
			profile.tx.increment(lastBlock.tx.length);
			profile.db.query.increment(dbCrono.delta());
		}
		const commitCrono = new Crono();
		explore.db.vout.commit();

		profile.db.commit.update(commitCrono.delta());
		profile.profile.update(profileCrono.delta());

		profile.change = profile.profile.sigma - (profile.rpc.sigma + profile.db.query.sigma + profile.db.commit.sigma);
		profile['tx/s'] = new DeltaSigma(1000 * profile.tx.delta / profile.profile.delta, 1000 * profile.tx.sigma / profile.profile.sigma);

		console.log(JSON.stringify({profile, info: explore.db.vout.info()}));

		profile.db.query.delta = 0;
		profile.rpc.delta = 0;
		profile.tx.delta = 0;
	}
	await explore.db.vout.controlFlow.setStopSuccesfully();
	console.log('Stopped succesfully');
};

main();

