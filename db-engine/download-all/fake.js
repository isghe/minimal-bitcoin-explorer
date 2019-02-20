'use strict';

const fake = () => {
	const dbCommon = require('../common/fake');
	const db = {
	};
	db.block = Object.assign({}, dbCommon.block, db.block);
	return Object.assign({}, dbCommon, db);
};

module.exports = fake();
