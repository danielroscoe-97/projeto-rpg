-- Add language preference column to users table
ALTER TABLE public.users
  ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'pt-BR';

-- Add check constraint for supported locales
ALTER TABLE public.users
  ADD CONSTRAINT users_preferred_language_check
  CHECK (preferred_language IN ('pt-BR', 'en'));
