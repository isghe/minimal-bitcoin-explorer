'use strict';
/* eslint-disable capitalized-comments */

const configuration = () => {
	return {
		bitcoinCore: {
			port: 8232,
			username: 'satoshi',
			password: 'nakamoto'
		},
		dbEngine: {
			name: 'fake', // or 'sqlite'; 'mongodb' is coming soon
			fake: {
				nextblockhashOptionalGenesis: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'
			}
		}

	};
};

module.exports = configuration();
