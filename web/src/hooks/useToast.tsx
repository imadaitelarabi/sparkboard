'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { 
      ...toast, 
      id,
      duration: toast.duration ?? 4000
    }
    
    setToasts((current) => [...current, newToast])
    
    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => dismiss(id), newToast.duration)
    }
  }, [dismiss])

  const success = useCallback((title: string, message?: string) => {
    toast({ type: 'success', title, message })
  }, [toast])

  const error = useCallback((title: string, message?: string) => {
    toast({ type: 'error', title, message })
  }, [toast])

  const info = useCallback((title: string, message?: string) => {
    toast({ type: 'info', title, message })
  }, [toast])

  const warning = useCallback((title: string, message?: string) => {
    toast({ type: 'warning', title, message })
  }, [toast])

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, info, warning, dismiss }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((toast) => (
        <ToastNotification key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

interface ToastNotificationProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastNotification({ toast, onDismiss }: ToastNotificationProps) {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          background: 'var(--color-success-50)',
          border: '1px solid var(--color-success-200)',
          iconColor: 'var(--color-success-600)',
          titleColor: 'var(--color-success-800)'
        }
      case 'error':
        return {
          background: 'var(--color-destructive-50)',
          border: '1px solid var(--color-destructive-200)',
          iconColor: 'var(--color-destructive-600)',
          titleColor: 'var(--color-destructive-800)'
        }
      case 'warning':
        return {
          background: 'var(--color-warning-50)',
          border: '1px solid var(--color-warning-200)',
          iconColor: 'var(--color-warning-600)',
          titleColor: 'var(--color-warning-800)'
        }
      case 'info':
        return {
          background: 'var(--color-primary-50)',
          border: '1px solid var(--color-primary-200)',
          iconColor: 'var(--color-primary-600)',
          titleColor: 'var(--color-primary-800)'
        }
    }
  }

  const getIcon = (type: ToastType) => {
    const iconProps = { className: 'h-5 w-5', style: { color: getToastStyles(type).iconColor } }
    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} />
      case 'error':
        return <AlertCircle {...iconProps} />
      case 'warning':
        return <AlertTriangle {...iconProps} />
      case 'info':
        return <Info {...iconProps} />
    }
  }

  const styles = getToastStyles(toast.type)

  return (
    <div
      className="relative max-w-sm w-full rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-floating)] animate-in slide-in-from-right-full duration-[var(--duration-normal)]"
      style={{
        background: styles.background,
        border: styles.border,
      }}
    >
      <div className="flex items-start gap-3">
        {getIcon(toast.type)}
        
        <div className="flex-1 min-w-0">
          <div 
            className="text-sm font-medium leading-5"
            style={{ color: styles.titleColor }}
          >
            {toast.title}
          </div>
          {toast.message && (
            <div className="mt-1 text-xs text-[var(--color-muted-foreground)] leading-4">
              {toast.message}
            </div>
          )}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-0.5 rounded-[var(--radius-sm)] hover:bg-black/10 transition-colors duration-[var(--duration-fast)]"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" style={{ color: styles.titleColor }} />
        </button>
      </div>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}