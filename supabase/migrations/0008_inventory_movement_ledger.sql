create or replace function public.record_inventory_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_note text default null
)
returns table (
  movement_id uuid,
  previous_quantity numeric,
  new_quantity numeric,
  movement_quantity numeric
)
language plpgsql
as $$
declare
  v_item public.inventory_items%rowtype;
  v_delta numeric;
  v_new_quantity numeric;
  v_movement_id uuid;
begin
  if p_quantity is null or p_quantity = 0 then
    raise exception '數量必須大於 0。' using errcode = '22023';
  end if;

  select *
  into v_item
  from public.inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception '庫存品項不存在或不屬於目前工作區。' using errcode = 'P0001';
  end if;

  if not public.is_workspace_member(v_item.workspace_id) then
    raise exception '庫存品項不存在或不屬於目前工作區。' using errcode = '42501';
  end if;

  if p_movement_type = 'purchase' then
    v_delta := abs(p_quantity);
  elsif p_movement_type = 'consume' then
    v_delta := -abs(p_quantity);
  elsif p_movement_type = 'adjust' then
    v_delta := p_quantity;
  else
    raise exception '不支援的庫存異動類型。' using errcode = '22023';
  end if;

  if p_movement_type in ('purchase', 'consume') and p_quantity <= 0 then
    raise exception '數量必須大於 0。' using errcode = '22023';
  end if;

  if p_movement_type = 'adjust' and p_quantity = 0 then
    raise exception '調整量不可為 0。' using errcode = '22023';
  end if;

  v_new_quantity := coalesce(v_item.quantity, 0) + v_delta;
  if v_new_quantity < 0 then
    raise exception '庫存不足，無法完成出庫。' using errcode = '22023';
  end if;

  update public.inventory_items
  set quantity = v_new_quantity
  where id = p_item_id;

  insert into public.inventory_movements (
    workspace_id,
    item_id,
    movement_type,
    quantity,
    note
  )
  values (
    v_item.workspace_id,
    p_item_id,
    p_movement_type,
    v_delta,
    p_note
  )
  returning id into v_movement_id;

  return query
  select v_movement_id, v_item.quantity, v_new_quantity, v_delta;
end;
$$;
