-- Add kind column to distinguish étuves from chambres climatiques
CREATE TYPE public.equipment_kind AS ENUM ('etuve', 'chambre_climatique');

ALTER TABLE public.ovens
  ADD COLUMN kind public.equipment_kind NOT NULL DEFAULT 'etuve';

CREATE INDEX IF NOT EXISTS ovens_kind_idx ON public.ovens(kind);