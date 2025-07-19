'use client'

import React from 'react'
import { 
  CircleDot, 
  Square, 
  MoreHorizontal,
  CornerDownRight,
  X
} from 'lucide-react'
import { 
  ElementProperties, 
  FillMode, 
  StrokeStyle, 
  CornerRadiusPreset,
  FILL_MODE_PRESETS,
  STROKE_WIDTH_PRESETS,
  CORNER_RADIUS_PRESETS,
  TypedElement
} from '@/types/element.types'

interface StyleOptionsPanelProps {
  selectedElements: TypedElement[]
  onUpdateProperties: (elementId: string, properties: Partial<ElementProperties>) => void
  onClose?: () => void
  className?: string
}

export function StyleOptionsPanel({ selectedElements, onUpdateProperties, onClose, className }: StyleOptionsPanelProps) {
  if (selectedElements.length === 0) return null

  // Only show for rectangles and circles
  const supportedElements = selectedElements.filter(el => 
    el.type === 'rectangle' || el.type === 'circle'
  )
  
  if (supportedElements.length === 0) return null

  // Check if all elements have the same property value
  const getCommonValue = <K extends keyof ElementProperties>(key: K): ElementProperties[K] | undefined => {
    const values = supportedElements.map(el => el.properties?.[key])
    const firstValue = values[0]
    return values.every(val => val === firstValue) ? firstValue : undefined
  }

  const currentFillMode = getCommonValue('fillMode') || 'filled'
  const currentStrokeStyle = getCommonValue('strokeStyle') || 'solid'
  const currentStrokeWidth = getCommonValue('strokeWidth') || 2
  const currentOpacity = getCommonValue('opacity') || 1
  const currentCornerRadiusPreset = getCommonValue('cornerRadiusPreset') || 'rounded'

  const hasRectangles = supportedElements.some(el => el.type === 'rectangle')

  const handlePropertyChange = (properties: Partial<ElementProperties>) => {
    supportedElements.forEach(element => {
      onUpdateProperties(element.id, properties)
    })
  }

  const handleFillModeChange = (mode: FillMode) => {
    const preset = FILL_MODE_PRESETS[mode]
    handlePropertyChange(preset)
  }

  return (
    <div className={`fixed left-72 top-32 z-50 floating-panel ${className}`}>
      <div className="bg-card border border-purple-200 dark:border-purple-700 rounded-lg shadow-lg">
        
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-200 dark:border-purple-700">
          <span className="text-sm font-medium text-foreground">Style Options</span>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded transition-colors duration-200"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-4 w-64">
          {/* Fill & Stroke Mode */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CircleDot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-foreground">Fill & Stroke</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: 'filled', label: 'Filled' },
                { mode: 'outline_only', label: 'Outline' },
                { mode: 'filled_no_border', label: 'No Border' },
                { mode: 'custom', label: 'Custom' }
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => handleFillModeChange(mode as FillMode)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentFillMode === mode 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-secondary text-secondary-foreground hover:bg-purple-50 dark:hover:bg-purple-900/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MoreHorizontal className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Stroke Width</span>
              <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{currentStrokeWidth}px</span>
            </div>
            
            {/* Visual stroke width buttons */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {Object.entries(STROKE_WIDTH_PRESETS).map(([name, width]) => (
                <button
                  key={name}
                  onClick={() => handlePropertyChange({ strokeWidth: width })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md ${
                    currentStrokeWidth === width 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg' 
                      : 'bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                  title={`${name} (${width}px)`}
                >
                  <div 
                    className={`w-8 rounded ${currentStrokeWidth === width ? 'bg-white' : 'bg-gray-700'}`}
                    style={{ height: `${Math.max(width, 2)}px` }}
                  />
                  <span className={`text-xs font-medium ${currentStrokeWidth === width ? 'text-white' : 'text-gray-600'}`}>
                    {name}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Custom slider */}
            <div className="relative">
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={currentStrokeWidth}
                onChange={(e) => handlePropertyChange({ strokeWidth: Number(e.target.value) })}
                className="w-full h-2 bg-gradient-to-r from-purple-200 to-indigo-200 rounded-full appearance-none cursor-pointer floating-slider"
              />
            </div>
          </div>

          {/* Stroke Style */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Square className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-medium text-gray-700">Stroke Style</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'solid', label: 'Solid', emoji: '━' },
                { value: 'dashed', label: 'Dashed', emoji: '┅' },
                { value: 'dotted', label: 'Dotted', emoji: '⋯' }
              ].map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => handlePropertyChange({ strokeStyle: value as StrokeStyle })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl text-xs transition-all duration-200 hover:scale-105 hover:shadow-md ${
                    currentStrokeStyle === value 
                      ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg' 
                      : 'bg-white border border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                  }`}
                  title={label}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Opacity</span>
              <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{Math.round(currentOpacity * 100)}%</span>
            </div>
            
            {/* Visual opacity selector */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((opacity) => (
                <button
                  key={opacity}
                  onClick={() => handlePropertyChange({ opacity })}
                  className={`relative flex items-center justify-center p-3 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md ${
                    Math.abs(currentOpacity - opacity) < 0.05 
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg ring-2 ring-yellow-300' 
                      : 'bg-white border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                  }`}
                  title={`${Math.round(opacity * 100)}%`}
                >
                  <div 
                    className="w-5 h-5 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-md"
                    style={{ opacity }}
                  />
                </button>
              ))}
            </div>
            
            {/* Custom opacity slider */}
            <div className="relative">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={currentOpacity * 100}
                onChange={(e) => handlePropertyChange({ opacity: Number(e.target.value) / 100 })}
                className="w-full h-2 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-full appearance-none cursor-pointer floating-slider"
              />
            </div>
          </div>

          {/* Corner Radius (only for rectangles) */}
          {hasRectangles && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CornerDownRight className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-700">Corner Radius</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { preset: 'sharp', label: 'Sharp', emoji: '⬛' },
                  { preset: 'rounded', label: 'Rounded', emoji: '▢' },
                  { preset: 'very_rounded', label: 'Very Round', emoji: '◯' },
                  { preset: 'pill', label: 'Pill', emoji: '⬭' }
                ].map(({ preset, label, emoji }) => (
                  <button
                    key={preset}
                    onClick={() => handlePropertyChange({ 
                      cornerRadiusPreset: preset as CornerRadiusPreset,
                      cornerRadius: CORNER_RADIUS_PRESETS[preset as CornerRadiusPreset]
                    })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md ${
                      currentCornerRadiusPreset === preset 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' 
                        : 'bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="text-base">{emoji}</span>
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Mode Notice */}
          {currentFillMode === 'custom' && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-purple-300 rounded-xl">
              <p className="text-xs text-purple-700 font-medium">
                🎨 Use the color picker above to set fill and stroke colors independently.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced floating slider styles */}
      <style jsx>{`
        .floating-slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
          transition: all 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .floating-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
        }
        .floating-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
          transition: all 200ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .floating-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
        }
      `}</style>
    </div>
  )
}