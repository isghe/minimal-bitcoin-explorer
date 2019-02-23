'use strict';
const assert = require('assert');

const testUtil = () => {
	const ret = {};
	const util = require('./lib/util.js');

	// 32.91*100000000 = 3290999999.9999995!!!
	ret.value = {value: 32.91 * 100000000, valueRound: Math.round(32.91 * 100000000)};
	let hexUndefined;
	const hex = '';
	assert(!hex);
	assert(typeof hex !== 'undefined');
	assert(typeof hexUndefined === 'undefined');

	ret.typeofUndefined = typeof undefined;
	ret.testSha256 = util.sha256('ciao') === 'b133a0c0e9bee3be20163d2ad31d6248db292aa6dcb1ee087a2aa50e0fc75ae2';

	const crono = new util.Crono();
	const limit = 1000000;
	let hash = '0';
	for (let i = 0; i < limit; ++i) {
		hash = util.sha256(hash);
	}
	const delta = crono.delta();
	const speedSha256 = {
		sha256: hash,
		delta,
		limit,
		'sha256/s': limit / delta * 1000
	};
	ret.speedSha256 = speedSha256;
	return ret;
};

const testDownloadMongo = async () => {
	const ret = {};
	const db = await require('./db-engine/download-all/mongodb');

	const block = await db.block.findOne({'block.height': 1234});
	ret.block = block;

	const count = await db.block.selectCount();
	ret.count = count;

	if (count > 0) {
		const blockLast = await db.block.selectLast();
		ret.blockLast = blockLast;
	}
	return ret;
};

const testAssertFailure = async () => {
	try {
		assert(false);
	} catch (error) {
		return {error};
	}
};

const testVoutMongo = async () => {
	const ret = {};
	const db = await require('./db-engine/vout/mongodb');

	const count = await db.block.selectCount();
	ret.count = count;

	if (count > 0) {
		const blockLast = await db.block.selectLast();
		ret.blockLast = blockLast;
	}
	return ret;
};

const main = async () => {
	const test = {
		testAssertFailure: await testAssertFailure(),
		testUtil: testUtil(),
		testDownloadMongo: await testDownloadMongo(),
		testVoutMongo: await testVoutMongo()
	};
	console.log(JSON.stringify(test, null, 8));
};
main();
