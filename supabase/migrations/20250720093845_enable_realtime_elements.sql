-- Enable realtime for collaborative features

-- Add elements table to realtime publication (if not already added)
DO $$
BEGIN
  -- Check if elements is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'elements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE elements;
  END IF;
END $$;

-- Add boards table to realtime for sharing notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'boards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE boards;
  END IF;
END $$;

-- Add board_members table for real-time permission updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'board_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE board_members;
  END IF;
END $$;

-- Create a function to broadcast element changes to specific board channels
CREATE OR REPLACE FUNCTION broadcast_element_change()
RETURNS TRIGGER AS $$
DECLARE
  board_uuid UUID;
  change_type TEXT;
  payload JSONB;
BEGIN
  -- Determine the operation type
  IF TG_OP = 'INSERT' THEN
    change_type := 'INSERT';
    board_uuid := NEW.board_id;
    payload := jsonb_build_object(
      'type', change_type,
      'element', row_to_json(NEW),
      'board_id', board_uuid,
      'user_id', auth.uid(),
      'timestamp', extract(epoch from now())
    );
  ELSIF TG_OP = 'UPDATE' THEN
    change_type := 'UPDATE';
    board_uuid := NEW.board_id;
    payload := jsonb_build_object(
      'type', change_type,
      'element', row_to_json(NEW),
      'old_element', row_to_json(OLD),
      'board_id', board_uuid,
      'user_id', auth.uid(),
      'timestamp', extract(epoch from now())
    );
  ELSIF TG_OP = 'DELETE' THEN
    change_type := 'DELETE';
    board_uuid := OLD.board_id;
    payload := jsonb_build_object(
      'type', change_type,
      'element_id', OLD.id,
      'board_id', board_uuid,
      'user_id', auth.uid(),
      'timestamp', extract(epoch from now())
    );
  END IF;

  -- Broadcast to the board-specific channel
  PERFORM pg_notify(
    'board_' || board_uuid::text,
    payload::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for element change broadcasts
DROP TRIGGER IF EXISTS elements_broadcast_changes ON elements;
CREATE TRIGGER elements_broadcast_changes
  AFTER INSERT OR UPDATE OR DELETE ON elements
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_element_change();

-- Create realtime presence tracking table
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  cursor_x DOUBLE PRECISION,
  cursor_y DOUBLE PRECISION,
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_color TEXT, -- For visual identification
  active_tool TEXT, -- Current tool being used
  metadata JSONB DEFAULT '{}', -- Additional presence data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

-- Enable RLS on user_presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Add user_presence to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
  END IF;
END $$;

-- RLS policies for user_presence
CREATE POLICY "Users can view presence in accessible boards" ON user_presence
  FOR SELECT USING (
    user_has_board_access(board_id)
  );

CREATE POLICY "Users can manage their own presence" ON user_presence
  FOR ALL USING (user_id = auth.uid());

-- Function to clean up stale presence records
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  -- Remove presence records older than 5 minutes
  DELETE FROM user_presence 
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger for user_presence
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically set user color on first presence
CREATE OR REPLACE FUNCTION set_user_presence_defaults()
RETURNS TRIGGER AS $$
DECLARE
  colors TEXT[] := ARRAY['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
  random_color TEXT;
BEGIN
  -- Set a random color if not provided
  IF NEW.user_color IS NULL THEN
    random_color := colors[1 + (random() * array_length(colors, 1))::int];
    NEW.user_color := random_color;
  END IF;
  
  -- Update last_seen and is_online
  NEW.last_seen := NOW();
  NEW.is_online := true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_presence_defaults
  BEFORE INSERT OR UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION set_user_presence_defaults();