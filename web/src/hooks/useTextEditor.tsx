'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface TextEditorState {
  isEditing: boolean
  elementId: string | null
  content: string
  position: { x: number; y: number; width: number; height: number } | null
  fontSize: number
  fontFamily: string
  color: string
}

interface StageInfo {
  container: HTMLDivElement | null
  scale: number
  position: { x: number; y: number }
}

interface TextEditorContextType {
  state: TextEditorState
  stageInfo: StageInfo
  startEditing: (elementId: string, content: string, position: { x: number; y: number; width: number; height: number }, options: { fontSize: number; fontFamily: string; color: string }) => void
  stopEditing: () => void
  updateContent: (content: string) => void
  updateColor: (color: string) => void
  saveContent: (onSave: (elementId: string, content: string, color: string) => void) => void
  setStageInfo: (stageInfo: StageInfo) => void
  formatText: (format: string, value?: string) => void
  setFormatHandler: (handler: ((format: string, value?: string) => void) | null) => void
}

const TextEditorContext = createContext<TextEditorContextType | null>(null)

interface TextEditorProviderProps {
  children: ReactNode
  onSave?: (elementId: string, content: string, color: string) => void
}

export function TextEditorProvider({ children, onSave }: TextEditorProviderProps) {
  const [state, setState] = useState<TextEditorState>({
    isEditing: false,
    elementId: null,
    content: '',
    position: null,
    fontSize: 16,
    fontFamily: 'Arial, sans-serif',
    color: '#000000'
  })

  const [stageInfo, setStageInfo] = useState<StageInfo>({
    container: null,
    scale: 1,
    position: { x: 0, y: 0 }
  })

  const [formatHandler, setFormatHandler] = useState<((format: string, value?: string) => void) | null>(null)

  const startEditing = useCallback((
    elementId: string, 
    content: string, 
    position: { x: number; y: number; width: number; height: number },
    options: { fontSize: number; fontFamily: string; color: string }
  ) => {
    console.log('🚀 startEditing called:', { elementId, content: content?.substring(0, 50), options })
    setState({
      isEditing: true,
      elementId,
      content,
      position,
      fontSize: options.fontSize,
      fontFamily: options.fontFamily,
      color: options.color
    })
  }, [])

  const stopEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditing: false,
      elementId: null,
      position: null
    }))
  }, [])

  const updateContent = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      content
    }))
  }, [])

  const updateColor = useCallback((color: string) => {
    console.log('🔄 updateColor called:', { oldColor: state.color, newColor: color })
    setState(prev => ({
      ...prev,
      color
    }))
  }, [state.color])

  const saveContent = useCallback((fallbackOnSave?: (elementId: string, content: string, color: string) => void) => {
    console.log('💾 saveContent called:', { 
      elementId: state.elementId, 
      content: state.content, 
      color: state.color, 
      hasHandler: !!(onSave || fallbackOnSave)
    })
    if (state.elementId && state.content !== undefined) {
      const saveHandler = onSave || fallbackOnSave
      if (saveHandler) {
        saveHandler(state.elementId, state.content, state.color)
      }
    }
    stopEditing()
  }, [state.elementId, state.content, state.color, stopEditing, onSave])

  const formatText = useCallback((format: string, value?: string) => {
    if (formatHandler) {
      formatHandler(format, value)
    }
  }, [formatHandler])

  const value: TextEditorContextType = {
    state,
    stageInfo,
    startEditing,
    stopEditing,
    updateContent,
    updateColor,
    saveContent,
    setStageInfo,
    formatText,
    setFormatHandler
  }

  return (
    <TextEditorContext.Provider value={value}>
      {children}
    </TextEditorContext.Provider>
  )
}

export function useTextEditor() {
  const context = useContext(TextEditorContext)
  if (!context) {
    throw new Error('useTextEditor must be used within a TextEditorProvider')
  }
  return context
}