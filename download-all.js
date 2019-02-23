/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

'use strict';
const assert = require('assert');
const util = require('./lib/util.js');

const explore = {
	bc: null,
	db: null
};

const profile = {
	height: 0,
	rpc: new util.DeltaSigma(0, 0), // ticks executing RPC call
	db: {
		query: new util.DeltaSigma(0, 0), // ticks executing query on db
		commit: new util.DeltaSigma(0, 0) // ticks executing commit on db
	},
	tx: new util.DeltaSigma(0, 0), // number of transactions
	profile: new util.DeltaSigma(0, 0),
	change: 0,
	'tx/s': null // new util.DeltaSigma(0, 0)
};

const main = async () => {
	const BitcoinCore = require('bitcoin-core');
	const configuration = require('./configuration');
	explore.db = await require('./db-engine/download-all/' + configuration.dbEngine.downloadAll.name);
	console.log('Current db-engine: ' + configuration.dbEngine.downloadAll.name);
	const stoppedSuccesfully = await explore.db.controlFlow.stoppedSuccesfully();
	assert(stoppedSuccesfully === true);
	explore.bc = new BitcoinCore(configuration.bitcoinCore);
	let lastBlock = {};
	const count = (await explore.db.block.selectCount()).ts_counter;
	if (count > 0) {
		lastBlock = await explore.db.block.selectLast(count);
	} else {
		// genesis block.hash
		lastBlock.nextblockhash = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
	}
	console.log({height: lastBlock.height, nextblockhash: lastBlock.nextblockhash});

	while (true) { // eslint-disable-line no-constant-condition
		const hasToStop = await explore.db.controlFlow.hasToStop();
		if (hasToStop === true) {
			break;
		}
		const profileCrono = new util.Crono();
		explore.db.beginTransaction();
		for (let i = 0; i < 1; ++i) {
			const rpcCrono = new util.Crono();
			assert(typeof lastBlock.nextblockhash !== 'undefined');
			lastBlock = await explore.bc.getBlock(lastBlock.nextblockhash, 2);
			profile.rpc.increment(rpcCrono.delta());
			assert(typeof lastBlock !== 'undefined');

			profile.height = lastBlock.height;

			const dbCrono = new util.Crono();
			const insertBlockResult = await explore.db.block.insert(lastBlock);
			assert(typeof insertBlockResult.lastInsertRowid !== 'undefined');
			profile.tx.increment(lastBlock.tx.length);
			profile.db.query.increment(dbCrono.delta());
		}
		const commitCrono = new util.Crono();
		explore.db.commit();

		profile.db.commit.update(commitCrono.delta());
		profile.profile.update(profileCrono.delta());

		profile.change = profile.profile.sigma - (profile.rpc.sigma + profile.db.query.sigma + profile.db.commit.sigma);
		profile['tx/s'] = new util.DeltaSigma(1000 * profile.tx.delta / profile.profile.delta, 1000 * profile.tx.sigma / profile.profile.sigma);

		console.log(JSON.stringify({profile, info: explore.db.info()}));

		profile.db.query.delta = 0;
		profile.rpc.delta = 0;
		profile.tx.delta = 0;
	}
	await explore.db.controlFlow.setStopSuccesfully();
	console.log('Stopped succesfully');
};

const handleBlock = blockhash => {
	assert(typeof blockhash !== 'undefined');
	const profileCrono = new util.Crono();
	explore.bc.getBlock(blockhash, 2)
		.then(block => {
			assert(typeof block !== 'undefined');
			profile.profile.update(profileCrono.delta());
			profile.tx.increment(block.tx.length);
			profile.height = block.height;

			profile['tx/s'] = new util.DeltaSigma(1000 * profile.tx.delta / profile.profile.delta, 1000 * profile.tx.sigma / profile.profile.sigma);
			console.log(JSON.stringify({profile, info: explore.db.info()}));
			profile.tx.delta = 0;
			setTimeout(() => {
				handleBlock(block.nextblockhash);
			});
		});
};

const mainSequential = async () => {
	const BitcoinCore = require('bitcoin-core');
	const configuration = require('./configuration');
	explore.db = await require('./db-engine/download-all/' + configuration.dbEngine.downloadAll.name);
	console.log('Current db-engine: ' + configuration.dbEngine.downloadAll.name);
	const stoppedSuccesfully = await explore.db.controlFlow.stoppedSuccesfully();
	assert(stoppedSuccesfully === true);
	explore.bc = new BitcoinCore(configuration.bitcoinCore);
	let lastBlock = {};
	const count = (await explore.db.block.selectCount()).ts_counter;
	if (count > 0) {
		lastBlock = await explore.db.block.selectLast(count);
	} else {
		// genesis block.hash
		lastBlock.nextblockhash = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
	}
	console.log({lastBlock});

	handleBlock(lastBlock.nextblockhash);
	console.log('Stopped succesfully');
};

const handleBlockHeight = height => {
	const profileCrono = new util.Crono();
	explore.bc.getBlockHash(height)
		.then(hash => {
			explore.bc.getBlock(hash, 2)
				.then(block => {
					assert(typeof block !== 'undefined');
					profile.profile.update(profileCrono.delta());
					profile.tx.increment(block.tx.length);
					profile.height = block.height;

					profile['tx/s'] = new util.DeltaSigma(1000 * profile.tx.delta / profile.profile.delta, 1000 * profile.tx.sigma / profile.profile.sigma);
					console.log(JSON.stringify({profile, info: explore.db.info()}));
					profile.tx.delta = 0;
				});
		});
	setTimeout(() => {
		handleBlockHeight(height + 1);
	}, 10);
};

const mainCanTrash = async () => {
	const BitcoinCore = require('bitcoin-core');
	const configuration = require('./configuration');
	explore.db = await require('./db-engine/download-all/' + configuration.dbEngine.downloadAll.name);
	console.log('Current db-engine: ' + configuration.dbEngine.downloadAll.name);
	const stoppedSuccesfully = await explore.db.controlFlow.stoppedSuccesfully();
	assert(stoppedSuccesfully === true);
	explore.bc = new BitcoinCore(configuration.bitcoinCore);
	let lastBlock = {};
	const count = (await explore.db.block.selectCount()).ts_counter;
	if (count > 0) {
		lastBlock = await explore.db.block.selectLast(count);
	} else {
		// genesis block.hash
		lastBlock.height = 0;
	}
	console.log({'lastBlock.height': lastBlock.height});
	handleBlockHeight(lastBlock.height + 400000);
	console.log('Stopped succesfully');
};

main();

