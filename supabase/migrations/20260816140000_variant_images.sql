-- Optional photo per option value (e.g. Colour Black → black shoe photo).
-- Points at a storage path already on the product; not a separate upload.

alter table public.product_variants
  add column image_path text;
