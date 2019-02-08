'use strict';

const main = async () => {
	const db = await require('./db-engine/mongodb.js');
	await db.controlFlow.pleaseStop();
	console.log('Stopped succesfully');
};

main();
