'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'

interface AuthFormProps {
  onSuccess?: () => void
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })

        if (error) throw error

        if (data.user && !data.user.email_confirmed_at) {
          setMessage('Please check your email and click the confirmation link to complete your registration.')
        } else {
          onSuccess?.()
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        onSuccess?.()
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-10 sm:px-5 lg:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="SparkBoard Logo" className="h-16 w-48 mx-auto" />
          <h2 className="text-lg text-muted-foreground mt-2">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="bg-card py-6 px-4 shadow-lg rounded-lg sm:px-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required={mode === 'signup'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full pl-8 pr-3 py-2 bg-input border border-border rounded-md placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-8 pr-3 py-2 bg-input border border-border rounded-md placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-8 pr-10 py-2 bg-input border border-border rounded-md placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                  placeholder="Enter your password"
                  minLength={6}
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            {error && (
              <div className="bg-destructive-50 border border-destructive-200 rounded-md p-2">
                <p className="text-sm text-destructive-600">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-primary-50 border border-primary-200 rounded-md p-2">
                <p className="text-sm text-primary-600">{message}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setError('')
                  setMessage('')
                  setEmail('')
                  setPassword('')
                  setFullName('')
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {mode === 'login' 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}