PRAGMA foreign_keys=true;

drop table address;
drop table utxo_hex;
drop table utxo;
drop table h_transaction;
drop table hex;
drop table spk_type; 
drop table block;

PRAGMA foreign_keys=ON;

create table block(
	id integer primary key not null,
	height integer unique not null,
	hash text unique not null,
	nextblockhash text unique not null,
	created_at DATETIME not null DEFAULT CURRENT_TIMESTAMP
);

create table h_transaction(
	id integer primary key not null,
	-- txid text unique not null,
	txid text not null,
	block_ref integer references block(id) not null,

-- https://github.com/isghe/interesting-bitcoin-data
	constraint unq_h_transaction unique (txid, block_ref)
);

CREATE UNIQUE INDEX 'h_transaction_unq_txid' ON 'h_transaction'('txid') where txid not in ('d5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599', 'e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468');

create table utxo(
	id integer primary key not null,
	transaction_ref integer references h_transaction (id) not null,
	vout integer not null,
	value text not null,
	
	-- https://stackoverflow.com/questions/843780/store-boolean-value-in-sqlite
	spent BOOLEAN NOT NULL default 0 CHECK (spent IN (0,1)),
	
	constraint unq_utxo unique (transaction_ref, vout)
);

create table spk_type(
-- vout.scriptPubKey.type
	id integer primary key not null,
	description text unique,
	counter integer not null
);

create table hex(
	id integer primary key not null,
	hex text unique not null,
	spk_type_ref integer references spk_type(id) not null,
	counter integer not null,
	satoshi integer not null
);

create table utxo_hex(
	id integer primary key not null,
	utxo_ref integer references utxo (id) not null,
	hex_ref integer references hex (id) not null,
	constraint unq_utxo_hexss unique (utxo_ref)
);
CREATE INDEX 'utxo_hex_hex_ref' ON 'utxo_hex'('hex_ref');

create table address(
	id integer primary key not null,
	address text unique not null, 
	hex_ref integer references hex(id) not null,
	counter integer not null
);
CREATE INDEX 'address_hex_ref' ON 'address'('hex_ref');
