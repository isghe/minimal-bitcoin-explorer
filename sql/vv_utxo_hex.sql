drop view vv_utxo_address_hex;

create view vv_utxo_hex
as

select * from utxo as a
left join utxo_hex as e
on a.id = e.utxo_ref
left join hex as f
on f.id = e.hex_ref;
