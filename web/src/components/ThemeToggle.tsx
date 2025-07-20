'use client'

import React, { useState } from 'react'
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, emoji: '☀️' },
    { value: 'dark', label: 'Dark', icon: Moon, emoji: '🌙' },
    { value: 'system', label: 'System', icon: Monitor, emoji: '💻' }
  ]

  const currentTheme = themeOptions.find(option => option.value === theme)
  const CurrentIcon = currentTheme?.icon || Sun

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:shadow-lg transition-all duration-200 hover:scale-105"
      >
        <div className="relative">
          <CurrentIcon className="h-4 w-4" />
          {resolvedTheme === 'dark' && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
          )}
        </div>
        <span className="text-sm font-medium">{currentTheme?.emoji}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 floating-panel border-2 border-purple-200 dark:border-purple-700 bounce-enter z-50">
          <div className="p-2 space-y-1">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isActive = theme === option.value
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value as 'light' | 'dark' | 'system')
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg ring-2 ring-purple-300 dark:ring-purple-600'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300'
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-4 w-4" />
                    {option.value === 'system' && resolvedTheme === 'dark' && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full"></div>
                    )}
                  </div>
                  <span className="text-lg">{option.emoji}</span>
                  <div className="flex-1 text-left">
                    <div>{option.label}</div>
                    {option.value === 'system' && (
                      <div className="text-xs opacity-75">
                        Currently {resolvedTheme}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Whimsical footer */}
          <div className="px-3 py-2 border-t border-purple-200 dark:border-purple-700">
            <div className="text-xs text-center text-purple-600 dark:text-purple-400 font-medium">
              ✨ Choose your vibe ✨
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default ThemeToggle