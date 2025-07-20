'use client'

import { useRouter } from 'next/navigation'
import { Shield, Lock, ArrowRight } from 'lucide-react'

interface AuthGateProps {
  resourceName: string
  resourceType: 'project' | 'board'
  message?: string
  redirectUrl?: string
}

export default function AuthGate({ 
  resourceName, 
  resourceType, 
  message,
  redirectUrl 
}: AuthGateProps) {
  const router = useRouter()

  const handleSignIn = () => {
    const currentUrl = redirectUrl || window.location.href
    const encodedRedirect = encodeURIComponent(currentUrl)
    router.push(`/?redirect=${encodedRedirect}`)
  }

  const defaultMessage = `Admin access to this ${resourceType} requires authentication. Please sign in or create an account to continue.`

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Authentication Required
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {message || defaultMessage}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mb-6 border border-border/50">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium text-foreground">
                {resourceName}
              </div>
              <div className="text-sm text-muted-foreground">
                Admin access required
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            Sign In or Create Account
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Go to SparkBoard
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            After signing in, you&apos;ll be redirected back to access this {resourceType}.
          </p>
        </div>
      </div>
    </div>
  )
}