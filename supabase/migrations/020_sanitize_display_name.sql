-- Migration 020: XSS sanitization trigger for display_name (NFR33)
-- Strips HTML tags and enforces max 50 chars on INSERT/UPDATE

CREATE OR REPLACE FUNCTION sanitize_display_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_name IS NOT NULL THEN
    -- Strip HTML tags
    NEW.display_name := regexp_replace(NEW.display_name, '<[^>]*>', '', 'g');
    -- Trim whitespace and enforce max length
    NEW.display_name := left(trim(NEW.display_name), 50);
    -- Set to NULL if result is empty
    IF NEW.display_name = '' THEN
      NEW.display_name := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sanitize_display_name
BEFORE INSERT OR UPDATE ON combatants
FOR EACH ROW EXECUTE FUNCTION sanitize_display_name();
