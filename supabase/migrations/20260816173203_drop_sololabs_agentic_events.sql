-- Remove leftover SoloLabs / agentic schema from the shared hosted project.
-- Preorders only uses public (+ storage buckets product-images, vendor-assets).
drop schema if exists agentic_events cascade;
