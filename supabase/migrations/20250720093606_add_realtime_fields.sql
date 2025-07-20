-- Add realtime-specific fields to elements table for collaboration
ALTER TABLE elements 
ADD COLUMN last_modified_by UUID REFERENCES auth.users(id),
ADD COLUMN version INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance on realtime queries
CREATE INDEX idx_elements_last_modified_at ON elements(last_modified_at);
CREATE INDEX idx_elements_board_id_last_modified ON elements(board_id, last_modified_at);

-- Update existing records to have proper values
UPDATE elements 
SET last_modified_by = created_by, 
    last_modified_at = created_at 
WHERE last_modified_by IS NULL;

-- Make last_modified_by not null after setting existing values
ALTER TABLE elements ALTER COLUMN last_modified_by SET NOT NULL;

-- Create function to automatically update last_modified_at and version
CREATE OR REPLACE FUNCTION update_element_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = NOW();
  NEW.version = OLD.version + 1;
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update metadata on element changes
CREATE TRIGGER elements_update_metadata
  BEFORE UPDATE ON elements
  FOR EACH ROW
  EXECUTE FUNCTION update_element_metadata();

-- Enable realtime on elements table
ALTER PUBLICATION supabase_realtime ADD TABLE elements;