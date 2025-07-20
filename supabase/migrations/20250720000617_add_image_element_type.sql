-- Add 'image' to the allowed element types
ALTER TABLE elements DROP CONSTRAINT IF EXISTS elements_type_check;
ALTER TABLE elements ADD CONSTRAINT elements_type_check 
  CHECK (type IN ('sticky_note', 'rectangle', 'circle', 'arrow', 'text', 'connector', 'freehand', 'image'));