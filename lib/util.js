'use strict';

const util = () => {
	const assert = require('assert');
	const ret = {
		assert: {
			isSatoshi: satoshi => {
				assert(typeof satoshi !== 'undefined');
				assert(Number.isInteger(satoshi));
			}
		},
		bitcoinToSatoshi: bitcoin => {
			assert(typeof bitcoin !== 'undefined');
			// 32.91*100000000 = 3290999999.9999995!!!
			const satoshi = Math.round(bitcoin * 100000000);
			ret.assert.isSatoshi(satoshi);
			return satoshi;
		}
	};
	return ret;
};

module.exports = util();
