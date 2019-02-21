'use strict';

const main = async () =>{
    const assert = require('assert');
    const util = require('./lib/util.js');

    const configuration = require('./configuration');
	const dbCommon = await require('./db-engine/common/mongodb');
	const clientDb = await dbCommon.client(configuration.dbEngine.downloadAll.mongo);

    // 32.91*100000000 = 3290999999.9999995!!!
    console.log({value: 32.91 * 100000000, valueRound: Math.round(32.91 * 100000000)});

    let hexUndefined;
    const hex = '';
    assert(!hex);
    assert(typeof hex !== 'undefined');
    assert(typeof hexUndefined === 'undefined');

    console.log(typeof undefined);
    console.log({testSha256: util.sha256('ciao') === 'b133a0c0e9bee3be20163d2ad31d6248db292aa6dcb1ee087a2aa50e0fc75ae2'});

    const block = await dbCommon.block.findOne ({'block.height': 1234});
    console.log (JSON.stringify (block.block, null, 8));
};

main ();