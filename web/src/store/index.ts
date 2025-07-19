import { create } from 'zustand'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type Project = Tables['projects']['Row']
type Board = Tables['boards']['Row']
type Element = Tables['elements']['Row']
type Task = Tables['tasks']['Row']
type TaskCategory = Tables['task_categories']['Row']

interface AppState {
  // Current user and auth
  user: unknown | null
  setUser: (user: unknown | null) => void

  // Current project context
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void

  // Projects
  projects: Project[]
  setProjects: (projects: Project[]) => void

  // Boards
  boards: Board[]
  setBoards: (boards: Board[]) => void

  // Current board
  currentBoard: Board | null
  setCurrentBoard: (board: Board | null) => void

  // Whiteboard elements
  elements: Element[]
  setElements: (elements: Element[]) => void
  addElement: (element: Element) => void
  updateElement: (id: string, updates: Partial<Element>) => void
  removeElement: (id: string) => void

  // Tasks
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void

  // Task categories
  taskCategories: TaskCategory[]
  setTaskCategories: (categories: TaskCategory[]) => void

  // Selected elements (for creating tasks)
  selectedElementIds: string[]
  setSelectedElementIds: (ids: string[]) => void
  toggleElementSelection: (id: string) => void
  clearSelection: () => void

  // Navigation context for task-to-whiteboard flow
  navigationContext: {
    elementIds: string[]
    fromTask: boolean
  } | null
  setNavigationContext: (context: { elementIds: string[]; fromTask: boolean } | null) => void

  // UI state
  isCreateTaskModalOpen: boolean
  setIsCreateTaskModalOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),

  // Project context
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // Projects
  projects: [],
  setProjects: (projects) => set({ projects }),

  // Boards
  boards: [],
  setBoards: (boards) => set({ boards }),

  // Current board
  currentBoard: null,
  setCurrentBoard: (board) => set({ currentBoard: board }),

  // Elements
  elements: [],
  setElements: (elements) => set({ elements }),
  addElement: (element) => set((state) => ({ 
    elements: [...state.elements, element] 
  })),
  updateElement: (id, updates) => set((state) => ({
    elements: state.elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    )
  })),
  removeElement: (id) => set((state) => ({
    elements: state.elements.filter(el => el.id !== id)
  })),

  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ 
    tasks: [...state.tasks, task] 
  })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(task => 
      task.id === id ? { ...task, ...updates } : task
    )
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter(task => task.id !== id)
  })),

  // Task categories
  taskCategories: [],
  setTaskCategories: (categories) => set({ taskCategories: categories }),

  // Selection
  selectedElementIds: [],
  setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),
  toggleElementSelection: (id) => set((state) => {
    const isSelected = state.selectedElementIds.includes(id)
    return {
      selectedElementIds: isSelected
        ? state.selectedElementIds.filter(selectedId => selectedId !== id)
        : [...state.selectedElementIds, id]
    }
  }),
  clearSelection: () => set({ selectedElementIds: [] }),

  // Navigation context
  navigationContext: null,
  setNavigationContext: (context) => set({ navigationContext: context }),

  // UI state
  isCreateTaskModalOpen: false,
  setIsCreateTaskModalOpen: (open) => set({ isCreateTaskModalOpen: open }),
}))