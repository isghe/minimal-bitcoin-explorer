/* eslint-disable capitalized-comments */
'use strict';

const main = async () => {
	const configuration = require('./configuration');
	const db = await require('./db-engine/' + configuration.application + '/mongodb.js');
	db.controlFlow.pleaseStop()
		.then(() => {
			console.log('Stopped succesfully');
		});
};

main();
