/* eslint-disable capitalized-comments */
'use strict';

const main = async () => {
	const configuration = require('./configuration');
	const db = await require('./db-engine/' + configuration.application + '/mongodb.js');
	db.controlFlow.pleaseStop()
		.then(result => {
			console.log({result, message: 'Stopped succesfully'});
		});
};

main();
