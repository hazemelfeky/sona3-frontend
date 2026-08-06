-- Families dashboard views. Views only — families, members, health_records,
-- income_sources, expenses, debts, aid_history, need_types, family_needs and
-- ingest_errors already exist live; do not create/alter/drop tables here.

-- table view: one row per family, display-ready
create or replace view v_families_list as
select
  f.family_id,
  f.head_name,
  f.area,
  f.member_count,
  f.evaluation_status,
  f.confidence,
  f.needs_raw,
  string_agg(nt.label_ar, '، ' order by nt.sort_order)
    filter (where nt.code is not null)                as needs_labels,
  count(fn.need_code)                                 as needs_count,
  count(fn.need_code) filter (where fn.source = 'inferred') as inferred_count
from families f
left join family_needs fn on fn.family_id = f.family_id
left join need_types  nt on nt.code       = fn.need_code
group by f.family_id, f.head_name, f.area, f.member_count,
         f.evaluation_status, f.confidence, f.needs_raw;

-- stats view: exactly one row
create or replace view v_families_stats as
select
  (select count(*) from families)                                    as total_families,
  (select count(*) from families where evaluation_status = 'مقبولة') as accepted_families,
  (select count(*) from families where evaluation_status = 'مرفوضة') as rejected_families,
  (select count(distinct area) from families where area is not null) as areas_count,
  (select count(distinct family_id) from family_needs)               as families_with_needs;

-- chart views: label / value
create or replace view v_chart_families_by_area as
select coalesce(area, 'غير محدد') as label, count(*)::numeric as value
from families group by 1 order by value desc;

create or replace view v_chart_needs_distribution as
select nt.label_ar as label, count(distinct fn.family_id)::numeric as value
from need_types nt
join family_needs fn on fn.need_code = nt.code
group by nt.label_ar, nt.sort_order
order by nt.sort_order;

alter view v_families_list            set (security_invoker = on);
alter view v_families_stats           set (security_invoker = on);
alter view v_chart_families_by_area   set (security_invoker = on);
alter view v_chart_needs_distribution set (security_invoker = on);
