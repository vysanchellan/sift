export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clusters: {
        Row: {
          created_at: string
          discussion_ids: string[]
          id: string
          metadata: Json
          model: string | null
          provider: string | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_ids?: string[]
          id?: string
          metadata?: Json
          model?: string | null
          provider?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_ids?: string[]
          id?: string
          metadata?: Json
          model?: string | null
          provider?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_discussion_matches: {
        Row: {
          course_lesson_id: string | null
          course_section_id: string
          created_at: string
          discussion_id: string | null
          id: string
          knowledge_base_item_id: string | null
          reason: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          course_lesson_id?: string | null
          course_section_id: string
          created_at?: string
          discussion_id?: string | null
          id?: string
          knowledge_base_item_id?: string | null
          reason?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          course_lesson_id?: string | null
          course_section_id?: string
          created_at?: string
          discussion_id?: string | null
          id?: string
          knowledge_base_item_id?: string | null
          reason?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'course_discussion_matches_course_lesson_id_fkey'
            columns: ['course_lesson_id']
            isOneToOne: false
            referencedRelation: 'course_lessons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_discussion_matches_course_section_id_fkey'
            columns: ['course_section_id']
            isOneToOne: false
            referencedRelation: 'course_sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_discussion_matches_discussion_id_fkey'
            columns: ['discussion_id']
            isOneToOne: false
            referencedRelation: 'discussions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_discussion_matches_knowledge_base_item_id_fkey'
            columns: ['knowledge_base_item_id']
            isOneToOne: false
            referencedRelation: 'knowledge_base_items'
            referencedColumns: ['id']
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          embedding: string | null
          embedding_model: string | null
          embedding_provider: string | null
          embedding_updated_at: string | null
          id: string
          position: number
          section_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string | null
          embedding_provider?: string | null
          embedding_updated_at?: string | null
          id?: string
          position?: number
          section_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string | null
          embedding_provider?: string | null
          embedding_updated_at?: string | null
          id?: string
          position?: number
          section_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'course_lessons_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_lessons_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'course_sections'
            referencedColumns: ['id']
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          embedding: string | null
          embedding_model: string | null
          embedding_provider: string | null
          embedding_updated_at: string | null
          id: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          embedding_model?: string | null
          embedding_provider?: string | null
          embedding_updated_at?: string | null
          id?: string
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          embedding?: string | null
          embedding_model?: string | null
          embedding_provider?: string | null
          embedding_updated_at?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'course_sections_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discussion_coverage: {
        Row: {
          best_chunk_id: string | null
          best_similarity: number | null
          created_at: string
          discussion_id: string
          id: string
          matched_content: string | null
          matched_document_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_chunk_id?: string | null
          best_similarity?: number | null
          created_at?: string
          discussion_id: string
          id?: string
          matched_content?: string | null
          matched_document_id?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_chunk_id?: string | null
          best_similarity?: number | null
          created_at?: string
          discussion_id?: string
          id?: string
          matched_content?: string | null
          matched_document_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'discussion_coverage_best_chunk_id_fkey'
            columns: ['best_chunk_id']
            isOneToOne: false
            referencedRelation: 'knowledge_base_embeddings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discussion_coverage_discussion_id_fkey'
            columns: ['discussion_id']
            isOneToOne: true
            referencedRelation: 'discussions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discussion_coverage_matched_document_id_fkey'
            columns: ['matched_document_id']
            isOneToOne: false
            referencedRelation: 'knowledge_base_documents'
            referencedColumns: ['id']
          },
        ]
      }
      discussion_priority: {
        Row: {
          components: Json
          created_at: string
          discussion_id: string
          id: string
          provider: string
          reasoning: string
          score: number
          scored_at: string
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          components?: Json
          created_at?: string
          discussion_id: string
          id?: string
          provider?: string
          reasoning?: string
          score: number
          scored_at?: string
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          components?: Json
          created_at?: string
          discussion_id?: string
          id?: string
          provider?: string
          reasoning?: string
          score?: number
          scored_at?: string
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: 'discussion_priority_discussion_id_fkey'
            columns: ['discussion_id']
            isOneToOne: false
            referencedRelation: 'discussions'
            referencedColumns: ['id']
          },
        ]
      }
      discussion_scores: {
        Row: {
          confidence: number | null
          created_at: string
          discussion_id: string
          embedding: Json | null
          embedding_model: string | null
          embedding_vector: string | null
          id: string
          model: string | null
          provider: string
          rationale: string | null
          score: number
          scored_at: string
          signals: Json
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          discussion_id: string
          embedding?: Json | null
          embedding_model?: string | null
          embedding_vector?: string | null
          id?: string
          model?: string | null
          provider: string
          rationale?: string | null
          score: number
          scored_at?: string
          signals?: Json
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          discussion_id?: string
          embedding?: Json | null
          embedding_model?: string | null
          embedding_vector?: string | null
          id?: string
          model?: string | null
          provider?: string
          rationale?: string | null
          score?: number
          scored_at?: string
          signals?: Json
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: 'discussion_scores_discussion_id_fkey'
            columns: ['discussion_id']
            isOneToOne: false
            referencedRelation: 'discussions'
            referencedColumns: ['id']
          },
        ]
      }
      discussions: {
        Row: {
          author: string | null
          body: string | null
          category: string | null
          created_at: string
          external_id: string
          fetched_at: string
          id: string
          keywords: string[]
          metadata: Json
          num_comments: number | null
          published_at: string | null
          score: number | null
          source_id: string
          subreddit: string | null
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          upvote_ratio: number | null
          url: string | null
          user_id: string
        }
        Insert: {
          author?: string | null
          body?: string | null
          category?: string | null
          created_at?: string
          external_id: string
          fetched_at?: string
          id?: string
          keywords?: string[]
          metadata?: Json
          num_comments?: number | null
          published_at?: string | null
          score?: number | null
          source_id: string
          subreddit?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          upvote_ratio?: number | null
          url?: string | null
          user_id: string
        }
        Update: {
          author?: string | null
          body?: string | null
          category?: string | null
          created_at?: string
          external_id?: string
          fetched_at?: string
          id?: string
          keywords?: string[]
          metadata?: Json
          num_comments?: number | null
          published_at?: string | null
          score?: number | null
          source_id?: string
          subreddit?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          upvote_ratio?: number | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'discussions_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'sources'
            referencedColumns: ['id']
          },
        ]
      }
      knowledge_base_documents: {
        Row: {
          char_count: number | null
          chunk_count: number | null
          created_at: string
          embedding_model: string | null
          embedding_provider: string | null
          error: string | null
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          char_count?: number | null
          chunk_count?: number | null
          created_at?: string
          embedding_model?: string | null
          embedding_provider?: string | null
          error?: string | null
          file_name: string
          id?: string
          mime_type?: string
          size_bytes?: number
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          char_count?: number | null
          chunk_count?: number | null
          created_at?: string
          embedding_model?: string | null
          embedding_provider?: string | null
          error?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base_embeddings: {
        Row: {
          chunk_index: number
          content: string | null
          created_at: string
          document_id: string | null
          embedding: string
          id: string
          knowledge_base_item_id: string | null
          model: string
          provider: string
          user_id: string
        }
        Insert: {
          chunk_index?: number
          content?: string | null
          created_at?: string
          document_id?: string | null
          embedding: string
          id?: string
          knowledge_base_item_id?: string | null
          model: string
          provider: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string | null
          created_at?: string
          document_id?: string | null
          embedding?: string
          id?: string
          knowledge_base_item_id?: string | null
          model?: string
          provider?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'knowledge_base_embeddings_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'knowledge_base_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'knowledge_base_embeddings_knowledge_base_item_id_fkey'
            columns: ['knowledge_base_item_id']
            isOneToOne: false
            referencedRelation: 'knowledge_base_items'
            referencedColumns: ['id']
          },
        ]
      }
      knowledge_base_items: {
        Row: {
          cluster_id: string | null
          content: string
          created_at: string
          id: string
          metadata: Json
          provider: string | null
          source_discussion_ids: string[]
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cluster_id?: string | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          provider?: string | null
          source_discussion_ids?: string[]
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cluster_id?: string | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          provider?: string | null
          source_discussion_ids?: string[]
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'knowledge_base_items_cluster_id_fkey'
            columns: ['cluster_id']
            isOneToOne: false
            referencedRelation: 'clusters'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          plan: string
          settings: Json
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          plan?: string
          settings?: Json
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          plan?: string
          settings?: Json
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          config: Json
          created_at: string
          external_id: string | null
          id: string
          is_enabled: boolean
          kind: string
          last_synced_at: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          is_enabled?: boolean
          kind: string
          last_synced_at?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          is_enabled?: boolean
          kind?: string
          last_synced_at?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trends: {
        Row: {
          created_at: string
          direction: string
          engagement_change: number
          engagement_current: number
          engagement_previous: number
          id: string
          reasoning: string
          score: number
          topic: string
          user_id: string
          volume_change: number
          volume_current: number
          volume_previous: number
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          direction?: string
          engagement_change?: number
          engagement_current?: number
          engagement_previous?: number
          id?: string
          reasoning?: string
          score?: number
          topic: string
          user_id: string
          volume_change?: number
          volume_current?: number
          volume_previous?: number
          window_end: string
          window_start: string
        }
        Update: {
          created_at?: string
          direction?: string
          engagement_change?: number
          engagement_current?: number
          engagement_previous?: number
          id?: string
          reasoning?: string
          score?: number
          topic?: string
          user_id?: string
          volume_change?: number
          volume_current?: number
          volume_previous?: number
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cluster_discussions: {
        Args: {
          p_min_cluster_size?: number
          p_threshold?: number
          p_user_id: string
        }
        Returns: number
      }
      match_course_content: {
        Args: {
          p_match_count?: number
          p_provider?: string
          p_query_embedding: string
          p_threshold?: number
          p_user_id: string
        }
        Returns: {
          course_id: string
          lesson_id: string
          section_id: string
          similarity: number
          target_type: string
          title: string
        }[]
      }
      match_discussions: {
        Args: {
          p_match_count?: number
          p_query_embedding: string
          p_threshold?: number
          p_user_id: string
        }
        Returns: {
          discussion_id: string
          similarity: number
        }[]
      }
      match_knowledge_base: {
        Args: {
          p_match_count?: number
          p_provider?: string
          p_query_embedding: string
          p_threshold?: number
          p_user_id: string
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          similarity: number
        }[]
      }
      sync_embedding_vectors: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
