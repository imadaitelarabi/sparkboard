import { create } from 'zustand'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type Project = Tables['projects']['Row']
type Board = Tables['boards']['Row']
type Element = Tables['elements']['Row']
type Task = Tables['tasks']['Row']
type TaskCategory = Tables['task_categories']['Row']

interface HistoryState {
  elements: Element[]
  selectedElementIds: string[]
}

interface HistoryManager {
  undoStack: HistoryState[]
  redoStack: HistoryState[]
  maxHistorySize: number
}

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
  updateElementSilent: (id: string, updates: Partial<Element>) => void // Update without history
  removeElement: (id: string) => void

  // History management
  history: HistoryManager
  saveToHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void

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

export const useAppStore = create<AppState>((set, get) => ({
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

  // History management
  history: {
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50
  },

  saveToHistory: () => {
    const state = get()
    const currentState: HistoryState = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      selectedElementIds: [...state.selectedElementIds]
    }
    
    set((state) => {
      const newUndoStack = [...state.history.undoStack, currentState]
      if (newUndoStack.length > state.history.maxHistorySize) {
        newUndoStack.shift()
      }
      
      return {
        history: {
          ...state.history,
          undoStack: newUndoStack,
          redoStack: [] // Clear redo stack when new action is performed
        }
      }
    })
  },

  undo: () => {
    const state = get()
    if (state.history.undoStack.length === 0) return

    const currentState: HistoryState = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      selectedElementIds: [...state.selectedElementIds]
    }

    const previousState = state.history.undoStack[state.history.undoStack.length - 1]
    const newUndoStack = state.history.undoStack.slice(0, -1)
    const newRedoStack = [...state.history.redoStack, currentState]

    set({
      elements: previousState.elements,
      selectedElementIds: previousState.selectedElementIds,
      history: {
        ...state.history,
        undoStack: newUndoStack,
        redoStack: newRedoStack
      }
    })
  },

  redo: () => {
    const state = get()
    if (state.history.redoStack.length === 0) return

    const currentState: HistoryState = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      selectedElementIds: [...state.selectedElementIds]
    }

    const nextState = state.history.redoStack[state.history.redoStack.length - 1]
    const newRedoStack = state.history.redoStack.slice(0, -1)
    const newUndoStack = [...state.history.undoStack, currentState]

    set({
      elements: nextState.elements,
      selectedElementIds: nextState.selectedElementIds,
      history: {
        ...state.history,
        undoStack: newUndoStack,
        redoStack: newRedoStack
      }
    })
  },

  canUndo: () => get().history.undoStack.length > 0,
  canRedo: () => get().history.redoStack.length > 0,
  
  clearHistory: () => set((state) => ({
    history: {
      ...state.history,
      undoStack: [],
      redoStack: []
    }
  })),

  // Elements
  elements: [],
  setElements: (elements) => set({ elements }),
  addElement: (element) => {
    get().saveToHistory()
    set((state) => ({ 
      elements: [...state.elements, element] 
    }))
  },
  updateElement: (id, updates) => {
    get().saveToHistory()
    set((state) => ({
      elements: state.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }))
  },
  updateElementSilent: (id, updates) => {
    set((state) => ({
      elements: state.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }))
  },
  removeElement: (id) => {
    get().saveToHistory()
    set((state) => ({
      elements: state.elements.filter(el => el.id !== id)
    }))
  },

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