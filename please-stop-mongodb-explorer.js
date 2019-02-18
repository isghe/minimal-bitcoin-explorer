/* eslint-disable capitalized-comments */
'use strict';

const main = async () => {
	// const db = await require('./db-engine/explore/mongodb.js');
	const db = await require('./db-engine/download-all/mongodb.js');
	db.controlFlow.pleaseStop()
		.then(() => {
			console.log('Stopped succesfully');
		});
};

main();
