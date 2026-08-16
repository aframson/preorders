-- Storage for product photography and vendor branding.
--
-- Both buckets are public-read: a customer landing from WhatsApp is anonymous,
-- and signing forty image URLs per drop page would cost a round trip we cannot
-- afford on a mid-range phone over mobile data.
--
-- Every object key starts with the owning vendor's id, which is what the write
-- policies below key off.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-images',
    'product-images',
    true,
    5 * 1024 * 1024,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'vendor-assets',
    'vendor-assets',
    true,
    2 * 1024 * 1024,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
  )
on conflict (id) do nothing;

-- The first path segment is the vendor id.
create or replace function public.storage_object_vendor_id(p_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return (string_to_array(p_name, '/'))[1]::uuid;
exception
  when others then
    return null;
end;
$$;

create policy "Vendor assets are publicly readable"
  on storage.objects for select
  using (bucket_id in ('product-images', 'vendor-assets'));

create policy "Vendor members upload into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('product-images', 'vendor-assets')
    and public.is_vendor_member(public.storage_object_vendor_id(name))
  );

create policy "Vendor members update their own objects"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('product-images', 'vendor-assets')
    and public.is_vendor_member(public.storage_object_vendor_id(name))
  );

create policy "Vendor members delete their own objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('product-images', 'vendor-assets')
    and public.is_vendor_member(public.storage_object_vendor_id(name))
  );
