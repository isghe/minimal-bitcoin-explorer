'use strict';

const util = () => {
	const assert = require('assert');
	const bitcoinjs = require('bitcoinjs-lib');
	const ret = {
		assert: {
			isSatoshi: satoshi => {
				assert(typeof satoshi !== 'undefined');
				assert(Number.isInteger(satoshi));
				assert(satoshi >= 0);
			}
		},
		bitcoinToSatoshi: bitcoin => {
			assert(typeof bitcoin !== 'undefined');
			// 32.91*100000000 = 3290999999.9999995!!!
			const satoshi = Math.round(bitcoin * 100000000);
			ret.assert.isSatoshi(satoshi);
			return satoshi;
		},
		sha256: text => {
			const hashBuffer = bitcoinjs.crypto.sha256(text);
			return hashBuffer.toString('hex');
		},
		keys: theObject => {
			const ret = [];
			for (const aProperty in theObject) {
				if (theObject.hasOwnProperty(aProperty)) { // eslint-disable-line no-prototype-builtins
					ret.push(aProperty);
				}
			}
			return ret;
		}
	};
	return ret;
};

module.exports = util();
