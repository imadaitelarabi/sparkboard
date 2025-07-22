interface LastUsedColors {
  // Last used theme colors for each element type
  themeColors: {
    rectangle: string
    circle: string
    text: string
    arrow: string
    sticky_note: string
    image: string
  }
  // Recent custom colors (hex values)
  customColors: string[]
  // Last selected color (either theme key or custom hex)
  lastSelected: string
  // Timestamp for cache invalidation
  timestamp: number
}

const ELEMENT_COLORS_KEY = 'sparkboard_element_colors'
const MAX_CUSTOM_COLORS = 8 // Limit recent custom colors
const CACHE_EXPIRY_DAYS = 30 // Cache for 30 days

// Default theme colors for each element type
const DEFAULT_THEME_COLORS = {
  rectangle: 'primary',
  circle: 'secondary',
  text: 'gray-dark',
  arrow: 'gray',
  sticky_note: 'warning',
  image: 'primary'
}

export function saveLastUsedColor(elementType: string, colorKey: string): void {
  try {
    const saved = getLastUsedColors()
    
    // Update theme color for this element type if it's a theme color
    if (colorKey.startsWith('#')) {
      // Custom color - add to recent custom colors
      saved.customColors = [colorKey, ...saved.customColors.filter(c => c !== colorKey)].slice(0, MAX_CUSTOM_COLORS)
    } else {
      // Theme color - update for this element type
      if (elementType in saved.themeColors) {
        saved.themeColors[elementType as keyof typeof saved.themeColors] = colorKey
      }
    }
    
    saved.lastSelected = colorKey
    saved.timestamp = Date.now()
    
    localStorage.setItem(ELEMENT_COLORS_KEY, JSON.stringify(saved))
  } catch (error) {
    console.warn('Failed to save last used colors to localStorage:', error)
  }
}

export function getLastUsedColors(): LastUsedColors {
  try {
    const saved = localStorage.getItem(ELEMENT_COLORS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as LastUsedColors
      
      // Check if cache is expired
      const daysSinceLastUpdate = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24)
      if (daysSinceLastUpdate < CACHE_EXPIRY_DAYS) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to load last used colors from localStorage:', error)
  }
  
  // Return defaults if no saved data or expired
  return {
    themeColors: { ...DEFAULT_THEME_COLORS },
    customColors: [],
    lastSelected: 'primary',
    timestamp: Date.now()
  }
}

export function getLastUsedColorForElementType(elementType: string): string {
  const saved = getLastUsedColors()
  if (elementType in saved.themeColors) {
    return saved.themeColors[elementType as keyof typeof saved.themeColors]
  }
  return DEFAULT_THEME_COLORS.rectangle || 'primary'
}

export function getRecentCustomColors(): string[] {
  const saved = getLastUsedColors()
  return saved.customColors
}

export function getLastSelectedColor(): string {
  const saved = getLastUsedColors()
  return saved.lastSelected
}

export function clearSavedColors(): void {
  try {
    localStorage.removeItem(ELEMENT_COLORS_KEY)
  } catch (error) {
    console.warn('Failed to clear saved colors from localStorage:', error)
  }
}

export const defaultThemeColors = DEFAULT_THEME_COLORS