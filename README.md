# Minimal Bitcoin Explorer


```
$ npm install
$ sqlite3 explore.sqlite < sql/explore_createdb.sql
$ sqlite3 explore.sqlite < sql/vv_utxo_address_hex.sql
$ node explore.js
```

![db-schema](images/db-schema.png "db-schema")
