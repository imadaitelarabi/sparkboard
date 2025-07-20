-- Fix user profile creation trigger to bypass RLS issues
-- The issue: INSERT policy on user_profiles might block the trigger function

-- Replace the trigger function with one that ensures proper permissions
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile with elevated privileges (SECURITY DEFINER bypasses RLS)
  INSERT INTO user_profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return NEW to not block user creation
    RAISE LOG 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION create_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION create_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile() TO anon;