drop view vv_utxo_address_hex;

create view vv_utxo_address_hex
as

select * from utxo as a
left join utxo_hex as e
on a.id = e.utxo_ref
left join hex as f
on f.id = e.hex_ref
left join address as c
on f.id = c.hex_ref
left join spk_type as d
on d.id = f.spk_type_ref;
