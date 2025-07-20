import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase'
import { useAppStore } from '../store'
import { Database } from '../types/database.types'

type Tables = Database['public']['Tables']
type Element = Tables['elements']['Row']

interface RealtimeElement extends Element {
  version: number
  last_modified_by: string
  last_modified_at: string
}

interface ElementChangePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  element?: RealtimeElement
  old_element?: RealtimeElement
  element_id?: string
  board_id: string
  user_id: string
  timestamp: number
}

export function useRealtimeSync(boardId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()
  const { 
    elements, 
    addElementSilent, 
    updateElementSilent, 
    removeElementSilent,
    setConnectionStatus 
  } = useAppStore()

  const handleElementInsert = useCallback(async (payload: RealtimePostgresChangesPayload<RealtimeElement>) => {
    const newElement = payload.new as RealtimeElement
    const { data: { user } } = await supabase.auth.getUser()
    if (newElement && newElement.last_modified_by !== user?.id) {
      // Only apply remote changes, not our own
      addElementSilent(newElement)
    }
  }, [addElementSilent])

  const handleElementUpdate = useCallback(async (payload: RealtimePostgresChangesPayload<RealtimeElement>) => {
    const updatedElement = payload.new as RealtimeElement
    const oldElement = payload.old as RealtimeElement
    
    if (!updatedElement || !oldElement) return

    // Check if this is our own change by comparing user and version
    const { data: { user } } = await supabase.auth.getUser()
    if (updatedElement.last_modified_by === user?.id) return

    // Find the current element in our store
    const currentElement = elements.find(el => el.id === updatedElement.id)
    
    if (currentElement) {
      // Conflict resolution: if our version is newer, keep ours and mark conflict
      const currentVersion = (currentElement as unknown as RealtimeElement).version || 1
      if (currentVersion > updatedElement.version) {
        console.warn('Conflict detected: local version is newer', {
          elementId: updatedElement.id,
          localVersion: currentVersion,
          remoteVersion: updatedElement.version
        })
        // TODO: Implement conflict resolution UI
        return
      }

      // Apply remote update
      updateElementSilent(updatedElement.id, {
        type: updatedElement.type,
        x: updatedElement.x,
        y: updatedElement.y,
        width: updatedElement.width,
        height: updatedElement.height,
        rotation: updatedElement.rotation,
        properties: updatedElement.properties,
        layer_index: updatedElement.layer_index,
        updated_at: updatedElement.updated_at
      })
    }
  }, [elements, updateElementSilent])

  const handleElementDelete = useCallback(async (payload: RealtimePostgresChangesPayload<RealtimeElement>) => {
    const deletedElement = payload.old as RealtimeElement
    const { data: { user } } = await supabase.auth.getUser()
    if (deletedElement && deletedElement.last_modified_by !== user?.id) {
      removeElementSilent(deletedElement.id)
    }
  }, [removeElementSilent])

  useEffect(() => {
    if (!boardId) {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setConnectionStatus('disconnected')
      }
      return
    }

    // Create realtime channel for this board
    const channel = supabase
      .channel(`board:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'elements',
          filter: `board_id=eq.${boardId}`
        },
        handleElementInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'elements',
          filter: `board_id=eq.${boardId}`
        },
        handleElementUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'elements',
          filter: `board_id=eq.${boardId}`
        },
        handleElementDelete
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        setConnectionStatus(
          status === 'SUBSCRIBED' ? 'connected' : 
          status === 'CLOSED' ? 'disconnected' : 
          'connecting'
        )
      })

    channelRef.current = channel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setConnectionStatus('disconnected')
      }
    }
  }, [boardId, handleElementInsert, handleElementUpdate, handleElementDelete, setConnectionStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        setConnectionStatus('disconnected')
      }
    }
  }, [setConnectionStatus])

  return {
    isConnected: channelRef.current?.state === 'joined',
    channel: channelRef.current
  }
}