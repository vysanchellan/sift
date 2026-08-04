import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

interface HealthCheckResult {
  name: string
  status: 'ok' | 'degraded' | 'down' | 'na'
  latencyMs?: number
  error?: string
  details?: Record<string, unknown>
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: HealthCheckResult[]
}

const STATUS_CONFIG = {
  ok: { label: 'Operational', icon: CheckCircle, variant: 'success' as const, color: 'text-green-600' },
  degraded: { label: 'Degraded', icon: AlertTriangle, variant: 'warning' as const, color: 'text-amber-600' },
  down: { label: 'Down', icon: AlertCircle, variant: 'destructive' as const, color: 'text-red-600' },
  na: { label: 'Not Applicable', icon: AlertTriangle, variant: 'secondary' as const, color: 'text-muted-foreground' },
}

async function fetchHealth(): Promise<HealthResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' })
  return res.json()
}

export default async function HealthPage() {
  const health = await fetchHealth()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">System Health</h1>
        <p className="text-muted-foreground">
          Real-time connectivity status for all external providers and services.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="size-4" />
            Overall Status
          </CardTitle>
          <CardDescription>
            Last checked: {new Date(health.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant={health.status === 'healthy' ? 'success' : health.status === 'degraded' ? 'warning' : 'destructive'} className="text-lg px-3 py-1">
            {health.status.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {health.checks.map((check) => {
          const config = STATUS_CONFIG[check.status]
          const Icon = config.icon
          return (
            <Card key={check.name} className="transition-colors hover:bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`${config.color} size-5 flex-shrink-0`} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{check.name}</p>
                      <p className="text-muted-foreground text-sm truncate">
                        {check.details && Object.entries(check.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    {check.latencyMs != null && (
                      <span className="text-muted-foreground text-sm tabular-nums">
                        {check.latencyMs}ms
                      </span>
                    )}
                  </div>
                </div>
                {check.error && (
                  <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs font-mono">
                    {check.error}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
        <span>Sift v0.1.0</span>
        <a
          href="/api/health"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Raw JSON
        </a>
      </div>
    </div>
  )
}