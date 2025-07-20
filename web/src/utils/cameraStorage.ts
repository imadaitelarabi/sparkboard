interface CameraPosition {
  x: number
  y: number
  scale: number
}

interface CameraStorage {
  [boardId: string]: CameraPosition
}

const CAMERA_STORAGE_KEY = 'sparkboard_camera_positions'

export const cameraStorage = {
  /**
   * Save camera position for a specific board
   */
  save: (boardId: string, position: CameraPosition): void => {
    try {
      const storage = cameraStorage.getAll()
      storage[boardId] = position
      localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.warn('Failed to save camera position:', error)
    }
  },

  /**
   * Get camera position for a specific board
   */
  get: (boardId: string): CameraPosition | null => {
    try {
      const storage = cameraStorage.getAll()
      return storage[boardId] || null
    } catch (error) {
      console.warn('Failed to get camera position:', error)
      return null
    }
  },

  /**
   * Get all stored camera positions
   */
  getAll: (): CameraStorage => {
    try {
      const stored = localStorage.getItem(CAMERA_STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.warn('Failed to parse camera storage:', error)
      return {}
    }
  },

  /**
   * Remove camera position for a specific board
   */
  remove: (boardId: string): void => {
    try {
      const storage = cameraStorage.getAll()
      delete storage[boardId]
      localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.warn('Failed to remove camera position:', error)
    }
  },

  /**
   * Clear all stored camera positions
   */
  clear: (): void => {
    try {
      localStorage.removeItem(CAMERA_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear camera storage:', error)
    }
  }
}

export type { CameraPosition }