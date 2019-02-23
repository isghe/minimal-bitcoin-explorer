/* eslint-disable capitalized-comments */
/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-undef */

'use strict';

const testJoin = (txid, vout) => {
	db.h_transaction.aggregate(
		{$match: {txid}},
		{$lookup: {from: 'utxo', localField: '_id', foreignField: 'transaction_ref', as: 'utxo'}},
		{$unwind: '$utxo'},
		{$match: {'utxo.vout': vout, 'utxo.spent': true}},
		{$lookup: {from: 'utxo_hex', localField: 'utxo._id', foreignField: 'utxo_ref', as: 'utxo_hex'}},
		{$unwind: '$utxo_hex'},
		{$lookup: {from: 'hex', localField: 'utxo_hex.hex_ref', foreignField: '_id', as: 'hex'}},
		{$project: {'utxo._id': 1, 'utxo.value': 1, 'hex._id': 1, 'hex.satoshi': 1, 'utxo.vout': 1}}).toArray();
};

const insertSpkTypeRef = () => {
	let beginDate = new Date();
	db.address.find({spk_type_ref: {$exists: false}}).toArray().forEach((address, index) => {
		const hexs = db.hex.find({_id: address.hex_ref}).toArray();
		assert(hexs.length === 1);
		const spkTypeRef = hexs[0].spk_type_ref;
		if (index % 10000 === 0) {
			const endDate = new Date();
			const delta = endDate - beginDate;
			printjson({delta, index, spkTypeRef, address});
			beginDate = endDate;
		}
		db.address.updateOne({_id: address._id}, {$set: {spk_type_ref: spkTypeRef}});
	});
};

db.controlFlow.update({}, {stoppedSuccesfully: true, hasToStop: false});
