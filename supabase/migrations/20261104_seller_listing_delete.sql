-- Apply this migration if the initial schema was already installed.
drop policy if exists "seller deletes own draft or admin" on public.products;
create policy "seller deletes own draft or admin" on public.products for delete
using ((seller_id = (select auth.uid()) and status in ('draft','pending_approval','rejected')) or public.is_admin());
