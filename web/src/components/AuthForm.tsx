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
  const isOAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_OAUTH === 'true'

  async function handleOAuthSignIn(provider: 'google' | 'github') {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setLoading(false)
    }
  }

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
          {isOAuthEnabled && (
            <>
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-md shadow-sm bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('github')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-md shadow-sm bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  Continue with GitHub
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">or</span>
                </div>
              </div>
            </>
          )}

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