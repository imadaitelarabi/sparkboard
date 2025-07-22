'use client'

import React, { useState } from 'react'
import { Clock, RotateCcw, Calendar } from 'lucide-react'
import Modal from './Modal'
import { TimeframeSettings, updateTimeframeSettings, FocusMode } from '@/utils/focusMode'

interface FocusModeSettingsProps {
  isOpen: boolean
  onClose: () => void
  focusMode: FocusMode
  onSettingsUpdate: (updatedFocusMode: FocusMode) => void
}

export default function FocusModeSettings({ 
  isOpen, 
  onClose, 
  focusMode, 
  onSettingsUpdate 
}: FocusModeSettingsProps) {
  const [settings, setSettings] = useState<TimeframeSettings>(focusMode.settings)

  function handleSave() {
    const updatedFocusMode = updateTimeframeSettings(settings)
    onSettingsUpdate(updatedFocusMode)
    onClose()
  }

  function handleCancel() {
    setSettings(focusMode.settings) // Reset to original settings
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Focus Mode Settings"
      size="md"
    >
      <div className="p-6 space-y-6">
        {/* Auto Reset Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <h3 className="font-medium text-[var(--color-card-foreground)]">Auto Reset</h3>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Automatically clear Focus Mode at scheduled intervals
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoReset}
              onChange={(e) => setSettings(prev => ({ ...prev, autoReset: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-200 peer-checked:bg-purple-500"></div>
          </label>
        </div>

        {/* Timeframe Type */}
        {settings.autoReset && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                <label className="text-sm font-medium text-[var(--color-card-foreground)]">
                  Reset Interval
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'daily', label: 'Daily', desc: 'Reset every day' },
                  { value: 'weekly', label: 'Weekly', desc: 'Reset every week' },
                  { value: 'monthly', label: 'Monthly', desc: 'Reset every month' },
                  { value: 'custom', label: 'Custom', desc: 'Set custom days' }
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      settings.type === option.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="timeframe"
                      value={option.value}
                      checked={settings.type === option.value}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        type: e.target.value as TimeframeSettings['type'] 
                      }))}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm text-[var(--color-card-foreground)]">
                      {option.label}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {option.desc}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Days Input */}
            {settings.type === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-card-foreground)]">
                  Number of Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.customDays || 7}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    customDays: parseInt(e.target.value) || 7 
                  }))}
                  className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
                  placeholder="7"
                />
              </div>
            )}

            {/* Reset Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                <label className="text-sm font-medium text-[var(--color-card-foreground)]">
                  Reset Time
                </label>
              </div>
              <select
                value={settings.resetTime}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  resetTime: parseInt(e.target.value) 
                }))}
                className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Focus Mode will reset at this time each interval
              </p>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-card-foreground)] transition-colors duration-[var(--duration-fast)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)] font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </Modal>
  )
}