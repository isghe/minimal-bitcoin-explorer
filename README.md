# Minimal Bitcoin Explorer

This is a node.js project building a database with the amounts related to a generic Bitcoin Address.
The stage is to be considered experimental, and collected data still need validation.

* [Installation](#installation)
* [Configuration](#configuration)
* [Run](#run)
* [Sniffing](#sniffing)
* [Stop](#stop)
* [DB-Schema](#db-schema)

## Installation
```
$ npm install
$ sqlite3 explore.sqlite < sql/explore_createdb.sql
$ sqlite3 explore.sqlite < sql/vv_utxo_address_hex.sql
$ sqlite3 explore.sqlite < sql/vv_utxo_hex.sql
```
the following `npm` dependencies will be installed:
* better-sqlite3
* bitcoin-core
* bitcoinjs-lib
* mongodb
* xo

## Configuration
```
$ cp configuration-template.js configuration.js
```

Edit `configuration.js` setting the right `port` (`rpcport` in `bitcoin.conf`), `username` and `password`, and set the right db-engine for you; available db-engines are:
* `sqlite`
* `fake`
* `mongodb`
* `PostgreSQL` (coming soon)

`sqlite` will create the database in `explore.sqlite`;

`fake` will not create any database, but it will iterate throw all the blocks, starting from `configuration.dbEngine.fake.nextblockhash`; if not defined, it will begin from `genesis` block.

`mongodb` will create the database, based on the configuration.js

```
mongo:{
	url : 'mongodb://localhost:27017',
	dbName : 'explore'
}
```

## Run
```
$ node explore.js
Current db-engine: fake
{"profile":{"height":0,"rpc":{"delta":35,"sigma":35},"db":{"query":{"delta":1,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":1,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":1},"profile":{"delta":36,"sigma":36},"change":0,"tx/s":{"delta":27.77777777777778,"sigma":27.77777777777778}}}
{"profile":{"height":1,"rpc":{"delta":6,"sigma":41},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":2},"profile":{"delta":6,"sigma":42},"change":0,"tx/s":{"delta":166.66666666666666,"sigma":47.61904761904762}}}
{"profile":{"height":2,"rpc":{"delta":4,"sigma":45},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":3},"profile":{"delta":4,"sigma":46},"change":0,"tx/s":{"delta":250,"sigma":65.21739130434783}}}
{"profile":{"height":3,"rpc":{"delta":4,"sigma":49},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":4},"profile":{"delta":4,"sigma":50},"change":0,"tx/s":{"delta":250,"sigma":80}}}
{"profile":{"height":4,"rpc":{"delta":5,"sigma":54},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":5},"profile":{"delta":5,"sigma":55},"change":0,"tx/s":{"delta":200,"sigma":90.9090909090909}}}
{"profile":{"height":5,"rpc":{"delta":4,"sigma":58},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":6},"profile":{"delta":4,"sigma":59},"change":0,"tx/s":{"delta":250,"sigma":101.69491525423729}}}
{"profile":{"height":6,"rpc":{"delta":4,"sigma":62},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":7},"profile":{"delta":4,"sigma":63},"change":0,"tx/s":{"delta":250,"sigma":111.11111111111111}}}
{"profile":{"height":7,"rpc":{"delta":4,"sigma":66},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":8},"profile":{"delta":4,"sigma":67},"change":0,"tx/s":{"delta":250,"sigma":119.40298507462687}}}
{"profile":{"height":8,"rpc":{"delta":4,"sigma":70},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":9},"profile":{"delta":4,"sigma":71},"change":0,"tx/s":{"delta":250,"sigma":126.7605633802817}}}
{"profile":{"height":9,"rpc":{"delta":4,"sigma":74},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":10},"profile":{"delta":4,"sigma":75},"change":0,"tx/s":{"delta":250,"sigma":133.33333333333334}}}
{"profile":{"height":10,"rpc":{"delta":4,"sigma":78},"db":{"query":{"delta":0,"sigma":1},"commit":{"delta":0,"sigma":0},"vout":{"delta":0,"sigma":1},"vin":{"delta":0,"sigma":0}},"tx":{"delta":1,"sigma":11},"profile":{"delta":4,"sigma":79},"change":0,"tx/s":{"delta":250,"sigma":139.2405063291139}}}
```
The application build the database throw bitcoind's RPC-APIs:
* ~~`getblockhash`~~
* `getblock`

## Stop
To safe stop `sqlite` or `fake` db-engine simply kill node process;
To safe stop `mongodb` db-engine, run the command:
```
$ node please-stop-mongodb-explorer.js
…
Stopped succesfully
```
After you see the message "Stopped succesfully" you can kill the node process.

## Sniffing

To sniff the network:

Check your `LOOPBACK` network interface.

For example on macOS with `ifconfig -a` and on CentOS with `ip link show` and modify the `-i` parameter in [sniff_getblock.sh](sniff_getblock.sh) according to your `LOOPBACK` network interface.

```
$ . sniff_getblock.sh
[sudo] password for satoshi:
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on lo, link-type EN10MB (Ethernet), capture size 262144 bytes
{"id":"1548778824122","method":"getblock","params":["000000002d64d1be2e1eded8d1732ae531c7d2d9ec537aec734a0d49617d28a9",2]}
{"id":"1548778824127","method":"getblock","params":["00000000ceb841a7ab31fec1932094e0e9eda3e5f2935d90fe4135d70715e86b",2]}
{"id":"1548778824130","method":"getblock","params":["000000001ca762d8675fd3aa4e374dff035174331efe12721079ba408793082b",2]}
{"id":"1548778824133","method":"getblock","params":["000000008524243a64e287382c97c1aba472565d2c722b5c2fe011d055ee197d",2]}
{"id":"1548778824136","method":"getblock","params":["000000002387d7751b3ed66563d541f86d5a1205681fedbf9c209eefa2329d06",2]}
{"id":"1548778824139","method":"getblock","params":["00000000059ba4df42a5fe5aef70066b50612d15feaa5997fc0e6069f61d7844",2]}
{"id":"1548778824142","method":"getblock","params":["000000006f475ce1caff24080aec6adea6e531ba197b8858370c80c0598d95ef",2]}
```

## DB-Schema
`
![db-schema](images/db-schema.png "db-schema")
