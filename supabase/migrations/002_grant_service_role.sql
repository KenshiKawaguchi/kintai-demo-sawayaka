grant usage on schema public to service_role;

grant select, insert, update, delete on table public.stores to service_role;
grant select, insert, update, delete on table public.employees to service_role;
grant select, insert, update, delete on table public.attendance_records to service_role;
grant select, insert, update, delete on table public.attendance_outings to service_role;
grant select, insert, update, delete on table public.attendance_events to service_role;
grant select, insert, update, delete on table public.admin_profiles to service_role;
grant select, insert, update, delete on table public.audit_logs to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to service_role;
