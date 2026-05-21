create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  store_code text not null unique check (store_code ~ '^[0-9]{3}$'),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  employee_code text not null unique check (employee_code ~ '^[0-9]{7}$'),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  work_date date not null,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, work_date)
);

create table if not exists public.attendance_outings (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  outing_index integer not null check (outing_index between 1 and 3),
  out_at timestamptz,
  back_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(attendance_record_id, outing_index)
);

create table if not exists public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  event_type text not null check (
    event_type in ('clock_in', 'go_out', 'return_back', 'clock_out')
  ),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_table text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.stores enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_outings enable row level security;
alter table public.attendance_events enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.audit_logs enable row level security;

create index if not exists employees_store_id_idx on public.employees(store_id);
create index if not exists attendance_records_employee_work_date_idx
  on public.attendance_records(employee_id, work_date);
create index if not exists attendance_outings_record_idx
  on public.attendance_outings(attendance_record_id, outing_index);
create index if not exists attendance_events_record_idx
  on public.attendance_events(attendance_record_id, occurred_at);

insert into public.stores (store_code, name)
values
  ('001', '菊川本店'),
  ('002', '掛川本店'),
  ('003', '袋井本店'),
  ('004', '磐田本店'),
  ('005', '浜松和合店'),
  ('006', '細江本店'),
  ('007', '豊田店'),
  ('008', '焼津店'),
  ('009', '浜松富塚店'),
  ('010', '吉田店'),
  ('011', '浜松有玉店'),
  ('012', '浜松白羽店'),
  ('013', '藤枝築地店'),
  ('014', '浜松高塚店'),
  ('015', '浜北店'),
  ('016', '静岡インター店'),
  ('017', '富士鷹岡店'),
  ('018', '静岡池田店'),
  ('019', '島田店'),
  ('020', '掛川インター店'),
  ('021', '富士錦店'),
  ('022', '静岡瀬名川店'),
  ('023', '浜松篠ケ瀬店'),
  ('024', '浜松鴨江店'),
  ('025', '御殿場インター店'),
  ('026', '長泉店'),
  ('027', '沼津学園通り店'),
  ('028', '函南店'),
  ('029', '浜松遠鉄店'),
  ('030', '御殿場プレミアム・アウトレット店'),
  ('031', 'イオンモール浜松市野店'),
  ('032', '湖西浜名湖店'),
  ('033', '浜松西インター店'),
  ('034', 'ベイドリーム清水店')
on conflict (store_code)
do update set
  name = excluded.name,
  updated_at = now();
