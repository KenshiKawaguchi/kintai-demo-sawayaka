insert into public.employees (store_id, employee_code, name)
select stores.id, '1234567', 'テスト 従業員'
from public.stores
where stores.store_code = '005'
on conflict (employee_code)
do update set
  store_id = excluded.store_id,
  name = excluded.name,
  active = true,
  updated_at = now();
