// Focus Mode localStorage utility for managing focused tasks across sessions

interface FocusTask {
  id: string                    // Task ID from database
  addedAt: number              // Timestamp when added to focus mode
  position?: number            // Optional position within focus mode
}

interface TimeframeSettings {
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  customDays?: number          // For custom timeframe
  resetTime: number            // Hour of day to reset (0-23)
  autoReset: boolean           // Whether to auto-reset expired tasks
}

interface FocusMode {
  tasks: FocusTask[]           // Array of focused task references
  settings: TimeframeSettings  // User-defined reset settings
  lastResetAt: number          // Timestamp of last reset
  isActive: boolean           // Whether focus mode is currently active
  createdAt: number           // When focus mode was first created
}

const FOCUS_MODE_KEY = 'sparkboard_focus_mode'
const DEFAULT_TIMEFRAME_SETTINGS: TimeframeSettings = {
  type: 'daily',
  resetTime: 6, // 6 AM
  autoReset: true
}

// Get current focus mode data
export function getFocusMode(): FocusMode | null {
  try {
    const saved = localStorage.getItem(FOCUS_MODE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as FocusMode
      
      // Check if auto-reset is needed
      if (parsed.settings.autoReset && shouldResetFocusMode(parsed)) {
        return resetFocusMode(parsed)
      }
      
      return parsed
    }
  } catch (error) {
    console.warn('Failed to load focus mode from localStorage:', error)
  }
  return null
}

// Create new focus mode or get existing
export function initializeFocusMode(): FocusMode {
  const existing = getFocusMode()
  if (existing) return existing

  const newFocusMode: FocusMode = {
    tasks: [],
    settings: { ...DEFAULT_TIMEFRAME_SETTINGS },
    lastResetAt: Date.now(),
    isActive: false,
    createdAt: Date.now()
  }

  saveFocusMode(newFocusMode)
  return newFocusMode
}

// Save focus mode data
export function saveFocusMode(focusMode: FocusMode): void {
  try {
    localStorage.setItem(FOCUS_MODE_KEY, JSON.stringify(focusMode))
  } catch (error) {
    console.warn('Failed to save focus mode to localStorage:', error)
  }
}

// Add task to focus mode
export function addTaskToFocusMode(taskId: string): FocusMode {
  const focusMode = initializeFocusMode()
  
  // Check if task already exists
  if (focusMode.tasks.some(t => t.id === taskId)) {
    return focusMode
  }

  const focusTask: FocusTask = {
    id: taskId,
    addedAt: Date.now(),
    position: focusMode.tasks.length
  }

  const updatedFocusMode = {
    ...focusMode,
    tasks: [...focusMode.tasks, focusTask]
  }

  saveFocusMode(updatedFocusMode)
  return updatedFocusMode
}

// Add multiple tasks to focus mode
export function addMultipleTasksToFocusMode(taskIds: string[]): FocusMode {
  const focusMode = initializeFocusMode()
  
  // Filter out tasks that already exist in focus mode
  const existingTaskIds = new Set(focusMode.tasks.map(t => t.id))
  const newTaskIds = taskIds.filter(id => !existingTaskIds.has(id))
  
  if (newTaskIds.length === 0) {
    return focusMode
  }

  const newFocusTasks: FocusTask[] = newTaskIds.map((taskId, index) => ({
    id: taskId,
    addedAt: Date.now(),
    position: focusMode.tasks.length + index
  }))

  const updatedFocusMode = {
    ...focusMode,
    tasks: [...focusMode.tasks, ...newFocusTasks]
  }

  saveFocusMode(updatedFocusMode)
  return updatedFocusMode
}

// Remove task from focus mode
export function removeTaskFromFocusMode(taskId: string): FocusMode {
  const focusMode = getFocusMode()
  if (!focusMode) return initializeFocusMode()

  const updatedFocusMode = {
    ...focusMode,
    tasks: focusMode.tasks.filter(t => t.id !== taskId)
  }

  saveFocusMode(updatedFocusMode)
  return updatedFocusMode
}

// Toggle focus mode active state
export function toggleFocusMode(): FocusMode {
  const focusMode = initializeFocusMode()
  const updatedFocusMode = {
    ...focusMode,
    isActive: !focusMode.isActive
  }

  saveFocusMode(updatedFocusMode)
  return updatedFocusMode
}

// Update timeframe settings
export function updateTimeframeSettings(settings: Partial<TimeframeSettings>): FocusMode {
  const focusMode = initializeFocusMode()
  const updatedFocusMode = {
    ...focusMode,
    settings: { ...focusMode.settings, ...settings }
  }

  saveFocusMode(updatedFocusMode)
  return updatedFocusMode
}

// Check if focus mode should be reset based on timeframe settings
function shouldResetFocusMode(focusMode: FocusMode): boolean {
  const now = Date.now()
  const { type, customDays, resetTime } = focusMode.settings
  
  // Create reset time for today
  const today = new Date()
  today.setHours(resetTime, 0, 0, 0)
  const todayResetTime = today.getTime()
  
  // If last reset was before today's reset time and current time is after, we should reset
  const lastResetDate = new Date(focusMode.lastResetAt)
  lastResetDate.setHours(resetTime, 0, 0, 0)
  
  switch (type) {
    case 'daily':
      return now >= todayResetTime && focusMode.lastResetAt < todayResetTime
      
    case 'weekly':
      const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000)
      lastWeek.setHours(resetTime, 0, 0, 0)
      return focusMode.lastResetAt < lastWeek.getTime()
      
    case 'monthly':
      const lastMonth = new Date(now)
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      lastMonth.setHours(resetTime, 0, 0, 0)
      return focusMode.lastResetAt < lastMonth.getTime()
      
    case 'custom':
      if (!customDays) return false
      const customResetTime = new Date(now - customDays * 24 * 60 * 60 * 1000)
      customResetTime.setHours(resetTime, 0, 0, 0)
      return focusMode.lastResetAt < customResetTime.getTime()
      
    default:
      return false
  }
}

// Reset focus mode (clear all tasks)
function resetFocusMode(focusMode: FocusMode): FocusMode {
  const resetFocusMode = {
    ...focusMode,
    tasks: [],
    lastResetAt: Date.now()
  }

  saveFocusMode(resetFocusMode)
  return resetFocusMode
}

// Manual reset focus mode
export function manualResetFocusMode(): FocusMode {
  const focusMode = getFocusMode()
  if (!focusMode) return initializeFocusMode()
  
  return resetFocusMode(focusMode)
}

// Get time until next auto-reset in milliseconds
export function getTimeUntilReset(focusMode: FocusMode): number | null {
  if (!focusMode.settings.autoReset) return null
  
  const now = Date.now()
  const { type, customDays, resetTime } = focusMode.settings
  
  switch (type) {
    case 'daily':
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(resetTime, 0, 0, 0)
      return tomorrow.getTime() - now
      
    case 'weekly':
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      nextWeek.setHours(resetTime, 0, 0, 0)
      return nextWeek.getTime() - now
      
    case 'monthly':
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setHours(resetTime, 0, 0, 0)
      return nextMonth.getTime() - now
      
    case 'custom':
      if (!customDays) return null
      const customNext = new Date()
      customNext.setDate(customNext.getDate() + customDays)
      customNext.setHours(resetTime, 0, 0, 0)
      return customNext.getTime() - now
      
    default:
      return null
  }
}

// Format time until reset for display
export function formatTimeUntilReset(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

// Clear all focus mode data
export function clearFocusMode(): void {
  try {
    localStorage.removeItem(FOCUS_MODE_KEY)
  } catch (error) {
    console.warn('Failed to clear focus mode from localStorage:', error)
  }
}

// Get focus mode statistics
export function getFocusModeStats(focusMode: FocusMode) {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  
  return {
    totalTasks: focusMode.tasks.length,
    recentTasks: focusMode.tasks.filter(t => (now - t.addedAt) < dayMs).length,
    oldestTask: focusMode.tasks.reduce((oldest, task) => 
      task.addedAt < oldest ? task.addedAt : oldest, now
    ),
    daysSinceCreated: Math.floor((now - focusMode.createdAt) / dayMs),
    daysSinceLastReset: Math.floor((now - focusMode.lastResetAt) / dayMs)
  }
}

// Export types for use in components
export type { FocusMode, FocusTask, TimeframeSettings }