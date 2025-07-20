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
  saveContent: (onSave: (elementId: string, content: string) => void) => void
  setStageInfo: (stageInfo: StageInfo) => void
}

const TextEditorContext = createContext<TextEditorContextType | null>(null)

interface TextEditorProviderProps {
  children: ReactNode
  onSave?: (elementId: string, content: string) => void
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

  const saveContent = useCallback((fallbackOnSave?: (elementId: string, content: string) => void) => {
    if (state.elementId && state.content !== undefined) {
      const saveHandler = onSave || fallbackOnSave
      if (saveHandler) {
        saveHandler(state.elementId, state.content)
      }
    }
    stopEditing()
  }, [state.elementId, state.content, stopEditing, onSave])

  const value: TextEditorContextType = {
    state,
    stageInfo,
    startEditing,
    stopEditing,
    updateContent,
    saveContent,
    setStageInfo
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