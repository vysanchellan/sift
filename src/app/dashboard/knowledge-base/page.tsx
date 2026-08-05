import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CoverageBadge } from '@/features/knowledge-base/components/coverage-badge'
import { RefreshCoverageButton } from '@/features/knowledge-base/components/refresh-coverage'
import { KnowledgeBaseUploadForm } from '@/features/knowledge-base/components/upload-form'
import {
  listEnrichedDiscussionsWithCoverage,
  listKnowledgeBaseDocuments,
} from '@/features/knowledge-base/queries'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function KnowledgeBasePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-sand-500 dark:text-sand-400">Sign in to view your knowledge base.</p>
  }

  const [documentsResult, discussionsResult] = await Promise.all([
    listKnowledgeBaseDocuments(user.id),
    listEnrichedDiscussionsWithCoverage(user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge base</h1>
        <p className="text-sand-500 dark:text-sand-400">
          Upload PDFs, Markdown, or plain text. Each discussion is compared against your documents
          to surface whether it is already answered, partially covered, or a gap.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload a document</CardTitle>
          <CardDescription>
            Files are stored in your private Supabase Storage bucket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KnowledgeBaseUploadForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Extracted, chunked, and embedded files.</CardDescription>
        </CardHeader>
        <CardContent>
          {documentsResult.documents.length === 0 ? (
            <p className="text-sand-500 dark:text-sand-400">No documents uploaded yet.</p>
          ) : (
            <ul className="divide-y">
              {documentsResult.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.file_name}</p>
                    <p className="text-sand-500 dark:text-sand-400 text-xs">
                      {doc.mime_type} · {doc.chunk_count ?? 0} chunks · {doc.char_count ?? 0} chars
                    </p>
                  </div>
                  <span className="text-sand-500 dark:text-sand-400 shrink-0 text-xs capitalize">
                    {doc.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discussion coverage</CardTitle>
          <CardDescription>Semantic comparison against your knowledge base.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RefreshCoverageButton />
          {discussionsResult.items.length === 0 ? (
            <p className="text-sand-500 dark:text-sand-400">
              No enriched discussions yet. Import and enrich discussions first.
            </p>
          ) : (
            <ul className="divide-y">
              {discussionsResult.items.map(({ discussion, coverage }) => (
                <li key={discussion.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{discussion.title}</p>
                    <p className="text-sand-500 dark:text-sand-400 truncate text-xs">
                      {discussion.summary ?? 'No summary'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <CoverageBadge
                      status={coverage?.status ?? null}
                      similarity={coverage?.best_similarity}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
