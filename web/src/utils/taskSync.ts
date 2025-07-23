import { SupabaseClient } from '@supabase/supabase-js'

interface TaskSyncOptions {
  taskId: string
  supabase: SupabaseClient
  status?: string
  categoryId?: string
  projectId?: string | null
  priority?: string
}

interface StatusCategoryMapping {
  status: string
  categoryName: string
}

/**
 * Maps between task status values and default category names
 */
const STATUS_CATEGORY_MAP: StatusCategoryMapping[] = [
  { status: 'pending', categoryName: 'To Do' },
  { status: 'in_progress', categoryName: 'In Progress' },
  { status: 'completed', categoryName: 'Done' }
]

/**
 * Unified function to update task status and category, keeping them synchronized
 * This ensures consistency between Focus Mode and Task Board operations
 */
export async function updateTaskWithSync({
  taskId,
  supabase,
  status,
  categoryId,
  projectId,
  priority
}: TaskSyncOptions) {
  try {
    // First, get the current task to understand its project context
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('project_id, status, category_id')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      console.error('Error fetching current task:', fetchError)
      throw fetchError
    }

    if (!currentTask) {
      throw new Error('Task not found')
    }

    // Determine the project ID to use
    const targetProjectId = projectId || currentTask.project_id

    // Prepare update data
    const updateData: Record<string, string | null> = {}

    // Handle status update and sync category
    if (status && status !== currentTask.status) {
      updateData.status = status

      // Find matching category for the new status
      const statusMapping = STATUS_CATEGORY_MAP.find(m => m.status === status)
      if (statusMapping) {
        // Find the category ID for this status in the target project
        const { data: categories } = await supabase
          .from('task_categories')
          .select('id, name')
          .eq('project_id', targetProjectId)
          .eq('name', statusMapping.categoryName)
          .single()

        if (categories) {
          updateData.category_id = categories.id
        }
      }
    }

    // Handle category update and sync status
    if (categoryId && categoryId !== currentTask.category_id) {
      updateData.category_id = categoryId

      // Find the category name to determine corresponding status
      const { data: categoryData } = await supabase
        .from('task_categories')
        .select('name')
        .eq('id', categoryId)
        .single()

      if (categoryData) {
        const categoryMapping = STATUS_CATEGORY_MAP.find(m => m.categoryName === categoryData.name)
        if (categoryMapping) {
          updateData.status = categoryMapping.status
        }
      }
    }

    // Handle other field updates
    if (priority) {
      updateData.priority = priority
    }

    if (projectId !== undefined && projectId !== currentTask.project_id) {
      updateData.project_id = projectId
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)

    if (updateError) {
      console.error('Error updating task:', updateError)
      throw updateError
    }

    return { success: true, updatedFields: updateData }

  } catch (error) {
    console.error('Error in updateTaskWithSync:', error)
    throw error
  }
}

/**
 * Helper function to get category ID by name and project
 */
export async function getCategoryIdByName(
  supabase: SupabaseClient,
  projectId: string,
  categoryName: string
): Promise<string | null> {
  const { data } = await supabase
    .from('task_categories')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', categoryName)
    .single()

  return data?.id || null
}

/**
 * Helper function to get status by category ID
 */
export async function getStatusByCategoryId(
  supabase: SupabaseClient,
  categoryId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('task_categories')
    .select('name')
    .eq('id', categoryId)
    .single()

  if (!data) return null

  const mapping = STATUS_CATEGORY_MAP.find(m => m.categoryName === data.name)
  return mapping?.status || null
}