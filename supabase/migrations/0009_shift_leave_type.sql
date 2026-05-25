alter table public.shifts
  add column if not exists leave_type text not null default 'work';

update public.shifts
set leave_type = case
  when not leave then 'work'
  when left(start_time::text, 5) = '00:15' then 'personal'
  when left(start_time::text, 5) = '00:30' then 'sick'
  when left(start_time::text, 5) = '00:45' then 'comp_time'
  when left(start_time::text, 5) = '01:00' then 'national_holiday'
  when left(start_time::text, 5) = '01:15' then 'annual'
  when leave then 'rest'
  else 'work'
end
where leave_type = 'work' and leave = true;

alter table public.shifts
  drop constraint if exists shifts_leave_type_check;

alter table public.shifts
  add constraint shifts_leave_type_check
  check (leave_type in ('work', 'rest', 'personal', 'sick', 'comp_time', 'national_holiday', 'annual'));
