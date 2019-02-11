/* eslint-disable capitalized-comments */
/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */

'use strict';
const assert = require('assert');
const Bluebird = require('bluebird');
const util = require('./lib/util.js');

const explore = {
	bc: null,
	db: null
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
	profile: new DeltaSigma(0, 0),
	change: 0,
	'tx/s': null // new DeltaSigma(0, 0)
};

/*
Promise.each(fileNames, function(fileName) {
    return fs.readFileAsync(fileName).then(function(val){
        // do stuff with 'val' here.
    });
}).then(function() {
console.log("done");
});
*/

const handleTransaction = async (raw, block_ref) => {
	assert(typeof raw !== 'undefined');
	assert(typeof block_ref !== 'undefined');
	const transaction = await explore.db.transaction.insert(raw.txid, block_ref);
	// console.log (raw);
	const voutCrono = new Crono();
	return Bluebird.each(raw.vout, async vout => {
	// for (let i = 0; i < raw.vout.length; ++i) {
	// await raw.vout.forEach(async vout => {
		// const vout = raw.vout[i];
		assert(typeof vout !== 'undefined');
		await explore.db.spkType.upsert(vout.scriptPubKey.type);
		const transaction_ref = transaction.lastInsertRowid;
		const utxo = await explore.db.utxo.insert(transaction_ref, vout.n, vout.value);
		const utxo_ref = utxo.lastInsertRowid;
		const spk_type_ref = await explore.db.spkType.getRef(vout.scriptPubKey.type);
		await explore.db.hex.upsert(vout.scriptPubKey.hex, spk_type_ref, util.bitcoinToSatoshi(vout.value));
		if (util.sha256(vout.scriptPubKey.hex) === 'b58bb87c47b96d1a4dff14b4cc042e2aa88d1a92da80c683f3fc84a6bddceb6b') {
			console.log(vout.scriptPubKey.hex); // 18jANvQ6AuVGJnea4EhmXiAf6bHR5qKjPB, p2pk and p2pkh
		}
		const hex_ref = await explore.db.hex.getRefByHash(util.sha256(vout.scriptPubKey.hex));
		await explore.db.utxoHex.insert(utxo_ref, hex_ref);
		if (vout.scriptPubKey.addresses) {
			for (let j = 0; j < vout.scriptPubKey.addresses.length; ++j) {
				await explore.db.address.upsert(vout.scriptPubKey.addresses[j], hex_ref);
			}
		}
	// }
	// });
	})
		.then(async () => {
			profile.db.vout.increment(voutCrono.delta());

			const vinCrono = new Crono();
			// for (let z = 0; z < raw.vin.length; ++z) {
			return Bluebird.each(raw.vin, async vin => {
				if (!vin.coinbase) {
					const voutFound = await explore.db.vout.select(vin.txid, vin.vout);
					assert(typeof voutFound !== 'undefined');
					const satoshi = voutFound.satoshi - util.bitcoinToSatoshi(voutFound.value);
					assert(satoshi >= 0);
					await explore.db.hex.update(voutFound.hex_id, satoshi);
					await explore.db.utxo.updateSpent(voutFound.id);
				}
			})
				.then(() => {
					profile.db.vin.increment(vinCrono.delta());
					return 'ciao';
				});
			// }
		});
};

const handleBlock = async lastBlock => {
	const hasToStop = await explore.db.controlFlow.hasToStop();
	if (hasToStop === true) {
		return {hasToStop};
	}
	const profileCrono = new Crono();
	explore.db.beginTransaction();
	for (let i = 0; i < 1; ++i) {
		const rpcCrono = new Crono();
		assert(typeof lastBlock.nextblockhash !== 'undefined');
		lastBlock = await explore.bc.getBlock(lastBlock.nextblockhash, 2);
		profile.rpc.increment(rpcCrono.delta());
		assert(typeof lastBlock !== 'undefined');

		profile.height = lastBlock.height;

		const dbCrono = new Crono();
		const insertBlockResult = await explore.db.block.insert(lastBlock);
		profile.tx.increment(lastBlock.tx.length);
		for (let z = 0; z < lastBlock.tx.length; ++z) {
			/* const handleTransactionResult = */ await handleTransaction(lastBlock.tx[z], insertBlockResult.lastInsertRowid);
			// console.log({handleTransactionResult});
		}
		/*
			lastBlock.tx.forEach(raw => {
				handleTransaction(raw, insertBlockResult.lastInsertRowid);
			});
			*/
		profile.db.query.increment(dbCrono.delta());
	}
	const commitCrono = new Crono();
	explore.db.commit();

	profile.db.commit.update(commitCrono.delta());
	profile.profile.update(profileCrono.delta());

	profile.change = profile.profile.sigma - (profile.rpc.sigma + profile.db.query.sigma + profile.db.commit.sigma);
	profile['tx/s'] = new DeltaSigma(1000 * profile.tx.delta / profile.profile.delta, 1000 * profile.tx.sigma / profile.profile.sigma);

	console.log(JSON.stringify({profile}));

	profile.db.query.delta = 0;
	profile.rpc.delta = 0;
	profile.tx.delta = 0;
	profile.db.vout.delta = 0;
	profile.db.vin.delta = 0;
	return {lastBlock, hasToStop};
};

const main = async () => {
	const BitcoinCore = require('bitcoin-core');
	const configuration = require('./configuration');
	explore.db = await require('./db-engine/' + configuration.dbEngine.name);
	console.log('Current db-engine: ' + configuration.dbEngine.name);
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
	for (;;) {
		const handleBlockResult = await handleBlock(lastBlock);
		if (handleBlockResult.hasToStop === true) {
			break;
		}
		lastBlock = handleBlockResult.lastBlock;
	}
	await explore.db.controlFlow.setStopSuccesfully();
	console.log('Stopped succesfully');
};

main();

