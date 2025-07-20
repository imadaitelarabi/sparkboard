-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create boards table (whiteboards and task boards)
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whiteboard', 'tasks')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on boards
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Create elements table (whiteboard elements)
CREATE TABLE elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sticky_note', 'rectangle', 'circle', 'arrow', 'text', 'connector', 'freehand')),
  x DOUBLE PRECISION DEFAULT 0,
  y DOUBLE PRECISION DEFAULT 0,
  width DOUBLE PRECISION DEFAULT 100,
  height DOUBLE PRECISION DEFAULT 100,
  rotation DOUBLE PRECISION DEFAULT 0,
  properties JSONB DEFAULT '{}', -- color, text content, stroke style, etc.
  layer_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on elements
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;

-- Create task categories table
CREATE TABLE task_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on task_categories
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  position INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create task_elements junction table (link tasks to whiteboard elements)
CREATE TABLE task_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  element_id UUID REFERENCES elements(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, element_id)
);

-- Enable RLS on task_elements
ALTER TABLE task_elements ENABLE ROW LEVEL SECURITY;

-- Create project_members table
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_boards_project_id ON boards(project_id);
CREATE INDEX idx_elements_board_id ON elements(board_id);
CREATE INDEX idx_elements_created_by ON elements(created_by);
CREATE INDEX idx_task_categories_project_id ON task_categories(project_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_task_elements_task_id ON task_elements(task_id);
CREATE INDEX idx_task_elements_element_id ON task_elements(element_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- RLS Policies

-- User profiles: Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects: Users can see projects they own or are members of
CREATE POLICY "Users can view own or member projects" ON projects
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update projects" ON projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete projects" ON projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Boards: Users can access boards in projects they have access to
CREATE POLICY "Users can view boards in accessible projects" ON boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create boards in accessible projects" ON boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update boards in accessible projects" ON boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Elements: Users can access elements in boards they have access to
CREATE POLICY "Users can view elements in accessible boards" ON elements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = elements.board_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create elements in accessible boards" ON elements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = elements.board_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update elements in accessible boards" ON elements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = elements.board_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete elements in accessible boards" ON elements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = elements.board_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Task categories: Similar access pattern as boards
CREATE POLICY "Users can view task categories in accessible projects" ON task_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = task_categories.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage task categories in accessible projects" ON task_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = task_categories.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Tasks: Similar access pattern as boards
CREATE POLICY "Users can view tasks in accessible projects" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = tasks.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage tasks in accessible projects" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = tasks.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Task elements: Users can manage task-element links in accessible projects
CREATE POLICY "Users can view task elements in accessible projects" ON task_elements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_elements.task_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage task elements in accessible projects" ON task_elements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_elements.task_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = p.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Project members: Project owners can manage members
CREATE POLICY "Users can view project members in accessible projects" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_members.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members pm2
          WHERE pm2.project_id = projects.id AND pm2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project owners can manage members" ON project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_members.project_id AND owner_id = auth.uid()
    )
  );

-- Create trigger to auto-create user profile
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Create function to auto-create task board when project is created
CREATE OR REPLACE FUNCTION create_default_task_board()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO boards (project_id, name, type)
  VALUES (NEW.id, 'Tasks', 'tasks');
  
  -- Create default task categories
  INSERT INTO task_categories (project_id, name, color, position)
  VALUES 
    (NEW.id, 'To Do', '#ef4444', 0),
    (NEW.id, 'In Progress', '#f59e0b', 1),
    (NEW.id, 'Done', '#10b981', 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION create_default_task_board();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_elements_updated_at BEFORE UPDATE ON elements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_categories_updated_at BEFORE UPDATE ON task_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();