'use strict';
/* eslint-disable capitalized-comments */

const configuration = () => {
	const names = [
		'sqlite',
		'fake',
		'mongodb'
	];
	return {
		bitcoinCore: {
			port: 8232,
			username: 'satoshi',
			password: 'nakamoto'
		},
		dbEngine: {
			name: names[1],
			fake: {
				nextblockhashOptionalGenesis: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'
			},
			mongo: {
				url: 'mongodb://localhost:27017',
				dbName: 'explore'
			}
		}
	};
};

module.exports = configuration();
