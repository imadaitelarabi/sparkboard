import type { Database } from './database.types'

export type ElementType = 'rectangle' | 'circle' | 'text' | 'arrow' | 'sticky_note'

export type ElementRow = Database['public']['Tables']['elements']['Row']

// Fill and stroke mode presets
export type FillMode = 'filled' | 'outline_only' | 'filled_no_border' | 'custom'

// Stroke styles
export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

// Corner radius presets for rectangles
export type CornerRadiusPreset = 'sharp' | 'rounded' | 'very_rounded' | 'pill'

// Extended element properties that will be stored in the properties JSON field
export interface ElementProperties {
  // Existing properties
  fill?: string
  stroke?: string
  strokeWidth?: number
  colorKey?: string
  text?: string
  fontSize?: number
  textColor?: string
  fontWeight?: string
  
  // New style properties
  fillMode?: FillMode
  strokeStyle?: StrokeStyle
  opacity?: number // 0-1 range
  cornerRadius?: number // for rectangles
  cornerRadiusPreset?: CornerRadiusPreset
  
  // Advanced properties for future use
  fillOpacity?: number // separate from overall opacity
  strokeOpacity?: number
}

// Helper type for element with typed properties
export interface TypedElement extends Omit<ElementRow, 'properties'> {
  properties: ElementProperties
}

// Style option presets
export const FILL_MODE_PRESETS: Record<FillMode, Partial<ElementProperties>> = {
  filled: {
    fillMode: 'filled',
    opacity: 1,
    fillOpacity: 1,
    strokeOpacity: 1
  },
  outline_only: {
    fillMode: 'outline_only',
    fillOpacity: 0,
    strokeOpacity: 1
  },
  filled_no_border: {
    fillMode: 'filled_no_border',
    fillOpacity: 1,
    strokeOpacity: 0
  },
  custom: {
    fillMode: 'custom'
  }
}

export const STROKE_WIDTH_PRESETS = {
  thin: 1,
  normal: 2,
  thick: 4,
  bold: 6
} as const

export const CORNER_RADIUS_PRESETS: Record<CornerRadiusPreset, number> = {
  sharp: 0,
  rounded: 3,
  very_rounded: 8,
  pill: 50 // Will be calculated as percentage of smaller dimension
}

// Helper functions
export function getEffectiveFillOpacity(properties: ElementProperties): number {
  if (properties.fillMode === 'outline_only') return 0
  return properties.fillOpacity ?? properties.opacity ?? 1
}

export function getEffectiveStrokeOpacity(properties: ElementProperties): number {
  if (properties.fillMode === 'filled_no_border') return 0
  return properties.strokeOpacity ?? properties.opacity ?? 1
}

export function getEffectiveCornerRadius(
  properties: ElementProperties, 
  width: number, 
  height: number
): number {
  if (properties.cornerRadiusPreset === 'pill') {
    return Math.min(width, height) * 0.5
  }
  return properties.cornerRadius ?? CORNER_RADIUS_PRESETS.rounded
}