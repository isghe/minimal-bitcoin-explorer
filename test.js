'use strict';

const assert = require('assert');
const util = require('./lib/util.js');

// 32.91*100000000 = 3290999999.9999995!!!
console.log({value: 32.91 * 100000000, valueRound: Math.round(32.91 * 100000000)});

let hexUndefined;
const hex = '';
assert(!hex);
assert(typeof hex !== 'undefined');
assert(typeof hexUndefined === 'undefined');

console.log(typeof undefined);
console.log({testSha256: util.sha256('ciao') === 'b133a0c0e9bee3be20163d2ad31d6248db292aa6dcb1ee087a2aa50e0fc75ae2'});
