'use client'

import { Component, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <Alert variant="destructive" className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-medium">Something went wrong</p>
                  <p className="text-muted-foreground text-sm">
                    {this.state.error?.message ?? 'An unexpected error occurred'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={this.handleRetry}>
                    <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
                    Try again
                  </Button>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )
    }

    return this.props.children
  }
}
