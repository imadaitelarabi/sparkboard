-- Fix user profile creation by ensuring RLS bypass in trigger
-- The issue: RLS policy blocks insert even with SECURITY DEFINER

-- Drop the existing INSERT policy that's blocking the trigger
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a more permissive policy that allows the trigger to work
-- This policy allows inserts when the inserting user matches the profile user_id
-- OR when it's being inserted by the system (no auth context)
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL
  );

-- Alternative approach: Update the trigger function to set proper auth context
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID := NEW.id;
BEGIN
  -- Temporarily set the auth context to the new user
  PERFORM set_config('request.jwt.claims', 
    json_build_object('sub', _user_id::text)::text, 
    true
  );
  
  -- Insert user profile
  INSERT INTO user_profiles (user_id, email, full_name)
  VALUES (_user_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue to not block user creation
    RAISE LOG 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;