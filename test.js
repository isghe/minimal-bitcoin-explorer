'use strict';

// 32.91*100000000 = 3290999999.9999995!!!
console.log({value: 32.91 * 100000000, valueRound: Math.round(32.91 * 100000000)});

const assert = require('assert');

let hexUndefined;
const hex = '';
assert(!hex);
assert(typeof hex !== 'undefined');
assert(typeof hexUndefined === 'undefined');

console.log (typeof undefined);
