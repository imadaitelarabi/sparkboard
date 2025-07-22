interface DashboardFilters {
  searchTerm: string
  filterProject: string
  filterStatus: string
  viewMode: 'kanban' | 'grid'
  groupBy: 'project' | 'priority' | 'status'
}

const DASHBOARD_FILTERS_KEY = 'sparkboard_dashboard_filters'

export function saveDashboardFilters(filters: DashboardFilters): void {
  try {
    localStorage.setItem(DASHBOARD_FILTERS_KEY, JSON.stringify(filters))
  } catch (error) {
    console.warn('Failed to save dashboard filters to localStorage:', error)
  }
}

export function loadDashboardFilters(): DashboardFilters | null {
  try {
    const saved = localStorage.getItem(DASHBOARD_FILTERS_KEY)
    if (saved) {
      return JSON.parse(saved) as DashboardFilters
    }
  } catch (error) {
    console.warn('Failed to load dashboard filters from localStorage:', error)
  }
  return null
}

export function clearDashboardFilters(): void {
  try {
    localStorage.removeItem(DASHBOARD_FILTERS_KEY)
  } catch (error) {
    console.warn('Failed to clear dashboard filters from localStorage:', error)
  }
}

export const defaultDashboardFilters: DashboardFilters = {
  searchTerm: '',
  filterProject: '',
  filterStatus: '',
  viewMode: 'kanban',
  groupBy: 'status'
}