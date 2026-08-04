import type { Database } from './database.types'

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Source = Database['public']['Tables']['sources']['Row']
export type Discussion = Database['public']['Tables']['discussions']['Row']
export type DiscussionScore = Database['public']['Tables']['discussion_scores']['Row']
export type DiscussionPriority = Database['public']['Tables']['discussion_priority']['Row']
export type Cluster = Database['public']['Tables']['clusters']['Row']
export type Trend = Database['public']['Tables']['trends']['Row']
export type KnowledgeBaseItem = Database['public']['Tables']['knowledge_base_items']['Row']
export type KnowledgeBaseEmbedding =
  Database['public']['Tables']['knowledge_base_embeddings']['Row']
export type KnowledgeBaseDocument = Database['public']['Tables']['knowledge_base_documents']['Row']
export type DiscussionCoverage = Database['public']['Tables']['discussion_coverage']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type CourseSection = Database['public']['Tables']['course_sections']['Row']
export type CourseLesson = Database['public']['Tables']['course_lessons']['Row']
export type CourseDiscussionMatch = Database['public']['Tables']['course_discussion_matches']['Row']
