'use strict';
/* eslint-disable capitalized-comments */

const configuration = () => {
	const names = [
		'sqlite',
		'fake',
		'mongodb'
	];
	const applications = [
		'explore',
		'download-all'
	];
	return {
		application: applications[0],
		bitcoinCore: {
			port: 8232,
			username: 'satoshi',
			password: 'nakamoto'
		},
		dbEngine: {
			explore: {
				name: names[1],
				sqlite: {
					dbName: 'explore.sqlite'
				},
				fake: {
					nextblockhashOptionalGenesis: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'
				},
				mongo: {
					url: 'mongodb://localhost:27017',
					dbName: 'explore'
				}
			},
			downloadAll: {
				name: names[1],
				sqlite: {
					dbName: 'download-all.sqlite'
				},
				fake: {
					nextblockhashOptionalGenesis: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
					// nextblockhash: '0000000000000000001d528b8f4099dd0511fc959a246eeec446acdc43b240dd'
					nextblockhash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
					lastBlockHeight: 0
				},
				mongo: {
					url: 'mongodb://localhost:27017',
					dbName: 'download-all'
				}
			},
			vout: {
				name: names[2],
				sqlite: {
					dbName: 'vout.sqlite'
				},
				fake: {
					nextblockhashOptionalGenesis: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
					// nextblockhash: '0000000000000000001d528b8f4099dd0511fc959a246eeec446acdc43b240dd'
					nextblockhash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
					lastBlockHeight: 0
				},
				mongo: {
					url: 'mongodb://localhost:27017',
					dbName: 'vout'
				}
			}
		},
		test: {
			mongo: {
				url: 'mongodb://localhost:27017',
				dbName: 'test-session'
			}
		}
	};
};

module.exports = configuration();
