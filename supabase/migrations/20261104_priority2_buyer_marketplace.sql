-- Priority 2: Buyer marketplace. Checkout uses a SECURITY DEFINER RPC to calculate
-- prices from the database and decrement inventory atomically; client prices are not trusted.
create or replace function public.place_marketplace_order(
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_state text,
  p_shipping_pin text,
  p_items jsonb
) returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer uuid := auth.uid();
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_total numeric(12,2) := 0;
begin
  if v_buyer is null then raise exception 'Sign in before placing an order.'; end if;
  if length(trim(coalesce(p_shipping_name,''))) < 2 then raise exception 'Enter a valid recipient name.'; end if;
  if trim(coalesce(p_shipping_phone,'')) !~ '^[0-9]{10}$' then raise exception 'Enter a valid 10-digit mobile number.'; end if;
  if length(trim(coalesce(p_shipping_address,''))) < 5 then raise exception 'Enter a valid delivery address.'; end if;
  if length(trim(coalesce(p_shipping_city,''))) < 2 or length(trim(coalesce(p_shipping_state,''))) < 2 then raise exception 'City and state are required.'; end if;
  if trim(coalesce(p_shipping_pin,'')) !~ '^[0-9]{6}$' then raise exception 'Enter a valid 6-digit PIN code.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then raise exception 'Order must contain at least one item.'; end if;

  -- Lock product rows as each cart item is processed to prevent overselling.
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 then raise exception 'Quantity must be positive.'; end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and status = 'active'
      for update;
    if not found then raise exception 'A product in your cart is unavailable.'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %.', v_product.name; end if;
    v_total := v_total + v_product.price * v_qty;
  end loop;

  insert into public.orders (buyer_id, shipping_name, shipping_phone, shipping_address,
    shipping_city, shipping_state, shipping_pin, total_amount, status)
  values (v_buyer, trim(p_shipping_name), trim(p_shipping_phone), trim(p_shipping_address),
    trim(p_shipping_city), trim(p_shipping_state), trim(p_shipping_pin), v_total, 'pending')
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid for update;
    insert into public.order_items (order_id, product_id, seller_id, quantity, unit_price)
    values (v_order.id, v_product.id, v_product.seller_id, v_qty, v_product.price);
    update public.products set stock = stock - v_qty,
      status = case when stock - v_qty = 0 then 'out_of_stock'::public.product_status else status end,
      updated_at = now()
    where id = v_product.id;
  end loop;
  return v_order;
end;
$$;

revoke all on function public.place_marketplace_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_marketplace_order(text,text,text,text,text,text,jsonb) to authenticated;
