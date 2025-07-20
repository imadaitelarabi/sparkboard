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

interface TextEditorContextType {
  state: TextEditorState
  startEditing: (elementId: string, content: string, position: { x: number; y: number; width: number; height: number }, options: { fontSize: number; fontFamily: string; color: string }) => void
  stopEditing: () => void
  updateContent: (content: string) => void
  saveContent: (onSave: (elementId: string, content: string) => void) => void
}

const TextEditorContext = createContext<TextEditorContextType | null>(null)

interface TextEditorProviderProps {
  children: ReactNode
}

export function TextEditorProvider({ children }: TextEditorProviderProps) {
  const [state, setState] = useState<TextEditorState>({
    isEditing: false,
    elementId: null,
    content: '',
    position: null,
    fontSize: 16,
    fontFamily: 'Arial, sans-serif',
    color: '#000000'
  })

  const startEditing = useCallback((
    elementId: string, 
    content: string, 
    position: { x: number; y: number; width: number; height: number },
    options: { fontSize: number; fontFamily: string; color: string }
  ) => {
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

  const saveContent = useCallback((onSave: (elementId: string, content: string) => void) => {
    if (state.elementId && state.content !== undefined) {
      onSave(state.elementId, state.content)
    }
    stopEditing()
  }, [state.elementId, state.content, stopEditing])

  const value: TextEditorContextType = {
    state,
    startEditing,
    stopEditing,
    updateContent,
    saveContent
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