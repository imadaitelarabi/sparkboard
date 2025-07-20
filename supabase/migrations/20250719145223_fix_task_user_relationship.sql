-- Fix task-user relationship by updating foreign key references to point to user_profiles

-- First, drop the existing foreign key constraints
ALTER TABLE tasks DROP CONSTRAINT tasks_assignee_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT tasks_created_by_fkey;

-- Update the foreign key constraints to reference user_profiles instead of auth.users
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey 
  FOREIGN KEY (assignee_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL;

ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL;