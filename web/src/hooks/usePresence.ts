import { useEffect, useRef, useCallback, useState } from 'react'
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase'

interface UserPresence {
  user_id: string
  cursor_x: number
  cursor_y: number
  user_color: string
  active_tool?: string
  user_name?: string
  last_seen: number
}

interface PresenceState {
  [key: string]: UserPresence[]
}

export function usePresence(boardId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()
  const [presenceState, setPresenceState] = useState<PresenceState>({})
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [userColor, setUserColor] = useState<string>('')

  // Generate a random color for the user
  const generateUserColor = useCallback(() => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', 
      '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }, [])

  // Get current user info
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user.id)
        if (!userColor) {
          setUserColor(generateUserColor())
        }
      }
    }
    getCurrentUser()
  }, [userColor, generateUserColor, supabase])

  // Update cursor position
  const updateCursor = useCallback((x: number, y: number, activeTool?: string) => {
    if (!channelRef.current || !currentUser) return

    const presenceData: Partial<UserPresence> = {
      cursor_x: x,
      cursor_y: y,
      user_color: userColor,
      user_id: currentUser,
      last_seen: Date.now()
    }

    if (activeTool) {
      presenceData.active_tool = activeTool
    }

    channelRef.current.track(presenceData)
  }, [currentUser, userColor])

  // Get other users' cursors (excluding current user)
  const getOtherCursors = useCallback(() => {
    if (!currentUser) return []

    return Object.values(presenceState)
      .flat()
      .filter(presence => presence.user_id !== currentUser)
      .filter(presence => {
        // Filter out stale presence (older than 30 seconds)
        const staleThreshold = Date.now() - 30000
        return presence.last_seen > staleThreshold
      })
  }, [presenceState, currentUser])

  // Setup presence channel
  useEffect(() => {
    if (!boardId || !currentUser) {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setPresenceState({})
      }
      return
    }

    // Create presence channel for this board
    const channel = supabase
      .channel(`presence:board:${boardId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState() as PresenceState
        setPresenceState(newState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        console.log('Presence subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          // Track initial presence
          await channel.track({
            user_id: currentUser,
            cursor_x: 0,
            cursor_y: 0,
            user_color: userColor,
            last_seen: Date.now()
          })
        }
      })

    channelRef.current = channel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setPresenceState({})
      }
    }
  }, [boardId, currentUser, userColor])

  // Periodic presence updates to keep alive
  useEffect(() => {
    if (!channelRef.current || !currentUser) return

    const interval = setInterval(() => {
      if (channelRef.current) {
        // Update presence with current timestamp to keep alive
        const currentPresence = channelRef.current.presenceState()[currentUser]
        if (currentPresence && currentPresence.length > 0) {
          const presence = currentPresence[0]
          channelRef.current.track({
            ...presence,
            last_seen: Date.now()
          })
        }
      }
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [currentUser])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  return {
    updateCursor,
    otherCursors: getOtherCursors(),
    isConnected: channelRef.current?.state === 'joined',
    userColor,
    onlineUsers: Object.keys(presenceState).length
  }
}