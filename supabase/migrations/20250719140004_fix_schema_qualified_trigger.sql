-- Fix trigger function to use schema-qualified table name
-- Issue: Auth service can't see user_profiles table because it's in different schema context

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID := NEW.id;
BEGIN
  -- Set proper auth context
  PERFORM set_config('request.jwt.claims', 
    json_build_object('sub', _user_id::text)::text, 
    true
  );
  
  -- Insert user profile with fully qualified table name
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (_user_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue to not block user creation
    RAISE LOG 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function is in the correct location and accessible
ALTER FUNCTION create_user_profile() OWNER TO postgres;