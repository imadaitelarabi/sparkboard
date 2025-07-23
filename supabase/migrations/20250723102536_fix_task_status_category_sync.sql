-- Migration to fix existing tasks with mismatched status and category_id
-- This addresses the issue where tasks may have inconsistent status and category assignments

-- First, let's create a function to sync task status with category
CREATE OR REPLACE FUNCTION sync_task_status_category() 
RETURNS void AS $$
DECLARE
    task_record RECORD;
    target_category_id UUID;
    status_category_mapping RECORD;
BEGIN
    -- Define the mapping between status and category names
    -- This matches the mapping used in the frontend code
    FOR status_category_mapping IN
        SELECT * FROM (VALUES
            ('pending', 'To Do'),
            ('in_progress', 'In Progress'), 
            ('completed', 'Done')
        ) AS mapping(status_val, category_name)
    LOOP
        -- For each status-category mapping, update tasks that have the status but wrong category
        FOR task_record IN
            SELECT 
                t.id,
                t.project_id,
                t.status,
                t.category_id,
                tc.name as current_category_name
            FROM tasks t
            LEFT JOIN task_categories tc ON t.category_id = tc.id
            WHERE t.status = status_category_mapping.status_val
        LOOP
            -- Find the correct category for this status in the task's project
            SELECT id INTO target_category_id
            FROM task_categories 
            WHERE project_id = task_record.project_id 
                AND name = status_category_mapping.category_name;
            
            -- If the correct category exists and the task doesn't already have it, update it
            IF target_category_id IS NOT NULL AND 
               (task_record.category_id IS NULL OR task_record.category_id != target_category_id) THEN
                
                UPDATE tasks 
                SET 
                    category_id = target_category_id,
                    updated_at = NOW()
                WHERE id = task_record.id;
                
                -- Log the change (optional, for debugging)
                RAISE NOTICE 'Updated task % (project %) from category "%" to "%" to match status "%"', 
                    task_record.id, 
                    task_record.project_id,
                    COALESCE(task_record.current_category_name, 'NULL'),
                    status_category_mapping.category_name,
                    status_category_mapping.status_val;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Now handle the reverse: tasks that have category but wrong status
    FOR status_category_mapping IN
        SELECT * FROM (VALUES
            ('pending', 'To Do'),
            ('in_progress', 'In Progress'), 
            ('completed', 'Done')
        ) AS mapping(status_val, category_name)
    LOOP
        -- Update tasks that have the category but wrong status
        UPDATE tasks 
        SET 
            status = status_category_mapping.status_val,
            updated_at = NOW()
        FROM task_categories tc
        WHERE tasks.category_id = tc.id
            AND tc.name = status_category_mapping.category_name
            AND tasks.status != status_category_mapping.status_val;
    END LOOP;
    
    RAISE NOTICE 'Task status-category synchronization completed';
END;
$$ LANGUAGE plpgsql;

-- Execute the synchronization function
SELECT sync_task_status_category();

-- Drop the temporary function after use
DROP FUNCTION sync_task_status_category();

-- Add a comment documenting this migration
COMMENT ON TABLE tasks IS 'Tasks table with synchronized status and category_id fields. Migration 20250723102536 fixed existing inconsistencies.';