# Minimal Bitcoin Explorer

* [Installation](#nistallation)
* [Configuration](#configuration)
* [Run](#run)
* [Sniffing](#sniffing)
* [DB-Schema](#db-schema)

## Installation
```
$ npm install
$ sqlite3 explore.sqlite < sql/explore_createdb.sql
$ sqlite3 explore.sqlite < sql/vv_utxo_address_hex.sql
```
## Configuration
```
$ cp configuration-template.js configuration.js
```

Edit `configuration.js` setting the right `port` (`rpcport` in `bitcoin.conf`), `username` and `password`

## Run
```
$ node explore.js
```

## Sniffing

Check your `LOOPBACK` network interface.

For example on macOS with `ifconfig -a` and on CentOS with `ip link show` and modify the ``-i` parameter in `sniff_getblockhash.sh` according to your `LOOPBACK` network interface.

```
$ . sniff_getblockhash.sh
[sudo] password for satoshi:
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on lo, link-type EN10MB (Ethernet), capture size 262144 bytes
{"id":"1548518024202","method":"getblockhash","params":[40524]}
{"id":"1548518024361","method":"getblockhash","params":[40525]}
{"id":"1548518024511","method":"getblockhash","params":[40526]}
{"id":"1548518024661","method":"getblockhash","params":[40527]}
{"id":"1548518024819","method":"getblockhash","params":[40528]}
```

## DB-Schema
`
![db-schema](images/db-schema.png "db-schema")
