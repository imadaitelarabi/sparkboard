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
      } else {
        // Create anonymous user ID for unauthenticated users
        const anonymousId = `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
        setCurrentUser(anonymousId)
        if (!userColor) {
          setUserColor(generateUserColor())
        }
      }
    }
    getCurrentUser()
  }, [userColor, generateUserColor, supabase])

  // Optimized cursor updates with smart throttling
  const lastUpdateRef = useRef(0)
  const lastPositionRef = useRef({ x: 0, y: 0 })
  const CURSOR_UPDATE_THROTTLE = 16 // Update every ~16ms (60fps) for smooth movement
  const MIN_MOVEMENT_DISTANCE = 2 // Only update if cursor moved at least 2px

  // Cursor updates disabled for performance
  const updateCursor = useCallback((x: number, y: number, activeTool?: string) => {
    // Disabled for performance - keeping function for compatibility
    return
  }, [currentUser, userColor])

  // Get other users' cursors (excluding current user)
  const getOtherCursors = useCallback(() => {
    if (!currentUser) return []

    const allPresences = Object.values(presenceState).flat()
    const filteredByUser = allPresences.filter(presence => presence.user_id !== currentUser)

    const filteredByTime = filteredByUser.filter(presence => {
      // Reduced to 2 minutes for better performance
      const staleThreshold = Date.now() - 120000
      return presence.last_seen > staleThreshold
    })

    return filteredByTime
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
        // Minimal logging for debugging
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Minimal logging for debugging
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track basic presence without cursor position
          await channel.track({
            user_id: currentUser,
            user_color: userColor,
            user_name: currentUser.startsWith('anon_') ? 'Anonymous User' : undefined,
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
      if (channelRef.current && channelRef.current.state === 'joined') {
        // Update basic presence to keep alive
        channelRef.current.track({
          user_id: currentUser,
          user_color: userColor,
          user_name: currentUser.startsWith('anon_') ? 'Anonymous User' : undefined,
          last_seen: Date.now()
        })
      }
    }, 30000) // Update every 30 seconds to reduce frequency

    return () => clearInterval(interval)
  }, [currentUser, userColor])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  const totalUsers = Object.values(presenceState).flat().length
  const otherCursors = getOtherCursors()
  
  // Debug logging removed for clean console
  
  return {
    updateCursor,
    otherCursors,
    isConnected: channelRef.current?.state === 'joined',
    userColor,
    onlineUsers: totalUsers
  }
}