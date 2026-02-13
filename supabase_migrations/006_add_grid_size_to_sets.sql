-- Add grid_size column to loteria_sets (9 = Kids 3x3, 16 = Classic 4x4)
ALTER TABLE public.loteria_sets
ADD COLUMN IF NOT EXISTS grid_size smallint NOT NULL DEFAULT 16;
