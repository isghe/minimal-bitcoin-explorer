'use strict';

const fake = () => {
	const dbCommon = require('../common/fake');
	const db = {
		block: {
			extract: block => {
				return block;
			}
		}
	};
	db.block = Object.assign({}, dbCommon.block, db.block);
	return Object.assign({}, dbCommon, db);
};

module.exports = fake();
