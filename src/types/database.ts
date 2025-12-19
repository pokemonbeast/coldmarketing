export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_usage: {
        Row: {
          actions_limit: number
          actions_used: number | null
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions_limit: number
          actions_used?: number | null
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions_limit?: number
          actions_used?: number | null
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_providers: {
        Row: {
          api_key_encrypted: string | null
          api_url: string
          config: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          provider_type: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          api_url: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider_type?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          api_url?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider_type?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_platform_configs: {
        Row: {
          auto_approve_override: boolean | null
          business_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          max_results_override: number | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_settings: Json | null
          scraper_config_id: string
          updated_at: string | null
        }
        Insert: {
          auto_approve_override?: boolean | null
          business_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_results_override?: number | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_settings?: Json | null
          scraper_config_id: string
          updated_at?: string | null
        }
        Update: {
          auto_approve_override?: boolean | null
          business_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_results_override?: number | null
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_settings?: Json | null
          scraper_config_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_platform_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_platform_configs_scraper_config_id_fkey"
            columns: ["scraper_config_id"]
            isOneToOne: false
            referencedRelation: "scraper_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          auto_approve: boolean | null
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          keywords: string[] | null
          name: string
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          auto_approve?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          name: string
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          auto_approve?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          name?: string
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_embeddings: {
        Row: {
          business_id: string
          content_hash: string
          content_text: string
          content_url: string | null
          created_at: string | null
          embedding: string | null
          id: string
          is_used: boolean
          metadata: Json | null
          platform: Database["public"]["Enums"]["platform_type"]
          relevance_score: number | null
          scraped_pool_id: string
        }
        Insert: {
          business_id: string
          content_hash: string
          content_text: string
          content_url?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          is_used?: boolean
          metadata?: Json | null
          platform: Database["public"]["Enums"]["platform_type"]
          relevance_score?: number | null
          scraped_pool_id: string
        }
        Update: {
          business_id?: string
          content_hash?: string
          content_text?: string
          content_url?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          is_used?: boolean
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["platform_type"]
          relevance_score?: number | null
          scraped_pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_embeddings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_embeddings_scraped_pool_id_fkey"
            columns: ["scraped_pool_id"]
            isOneToOne: false
            referencedRelation: "scraped_content_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      executed_actions: {
        Row: {
          business_id: string
          comment_text: string
          completed_at: string | null
          cost: number | null
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          planned_action_id: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          provider_order_id: string | null
          provider_response: Json | null
          status: string | null
          target_url: string
          user_id: string
        }
        Insert: {
          business_id: string
          comment_text: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          planned_action_id?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          provider_order_id?: string | null
          provider_response?: Json | null
          status?: string | null
          target_url: string
          user_id: string
        }
        Update: {
          business_id?: string
          comment_text?: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          planned_action_id?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          provider_order_id?: string | null
          provider_response?: Json | null
          status?: string | null
          target_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executed_actions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executed_actions_planned_action_id_fkey"
            columns: ["planned_action_id"]
            isOneToOne: false
            referencedRelation: "planned_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executed_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          charge: number | null
          comments: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          error_message: string | null
          external_order_id: string
          id: string
          last_checked_at: string | null
          link: string
          provider_id: string
          provider_response: Json | null
          quantity: number | null
          remains: string | null
          service_id: string
          service_name: string | null
          start_count: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          charge?: number | null
          comments?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          external_order_id: string
          id?: string
          last_checked_at?: string | null
          link: string
          provider_id: string
          provider_response?: Json | null
          quantity?: number | null
          remains?: string | null
          service_id: string
          service_name?: string | null
          start_count?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          charge?: number | null
          comments?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          external_order_id?: string
          id?: string
          last_checked_at?: string | null
          link?: string
          provider_id?: string
          provider_response?: Json | null
          quantity?: number | null
          remains?: string | null
          service_id?: string
          service_name?: string | null
          start_count?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "api_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_actions: {
        Row: {
          auto_approved: boolean | null
          business_id: string
          content_embedding_id: string | null
          created_at: string | null
          edited_comment: string | null
          embedding_id: string | null
          error_message: string | null
          executed_at: string | null
          generated_comment: string
          id: string
          panel_order_id: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          relevance_score: number | null
          retry_count: number | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["action_status"] | null
          target_snippet: string | null
          target_title: string | null
          target_url: string
          updated_at: string | null
        }
        Insert: {
          auto_approved?: boolean | null
          business_id: string
          content_embedding_id?: string | null
          created_at?: string | null
          edited_comment?: string | null
          embedding_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          generated_comment: string
          id?: string
          panel_order_id?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          relevance_score?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["action_status"] | null
          target_snippet?: string | null
          target_title?: string | null
          target_url: string
          updated_at?: string | null
        }
        Update: {
          auto_approved?: boolean | null
          business_id?: string
          content_embedding_id?: string | null
          created_at?: string | null
          edited_comment?: string | null
          embedding_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          generated_comment?: string
          id?: string
          panel_order_id?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          relevance_score?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["action_status"] | null
          target_snippet?: string | null
          target_title?: string | null
          target_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_actions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_actions_content_embedding_id_fkey"
            columns: ["content_embedding_id"]
            isOneToOne: false
            referencedRelation: "content_embeddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_actions_embedding_id_fkey"
            columns: ["embedding_id"]
            isOneToOne: false
            referencedRelation: "content_embeddings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_actions_limit: number | null
          subscription_current_period_end: string | null
          subscription_plan_name: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_actions_limit?: number | null
          subscription_current_period_end?: string | null
          subscription_plan_name?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_actions_limit?: number | null
          subscription_current_period_end?: string | null
          subscription_plan_name?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scraped_content_pool: {
        Row: {
          batch_data: Json
          business_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          item_count: number
          platform: Database["public"]["Enums"]["platform_type"]
          scrape_run_id: string | null
          scraped_at: string | null
          scraper_config_id: string | null
        }
        Insert: {
          batch_data: Json
          business_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          item_count?: number
          platform: Database["public"]["Enums"]["platform_type"]
          scrape_run_id?: string | null
          scraped_at?: string | null
          scraper_config_id?: string | null
        }
        Update: {
          batch_data?: Json
          business_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          item_count?: number
          platform?: Database["public"]["Enums"]["platform_type"]
          scrape_run_id?: string | null
          scraped_at?: string | null
          scraper_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_content_pool_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_content_pool_scraper_config_id_fkey"
            columns: ["scraper_config_id"]
            isOneToOne: false
            referencedRelation: "scraper_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_configs: {
        Row: {
          actor_id: string | null
          api_endpoint: string | null
          api_token_encrypted: string | null
          created_at: string | null
          default_config: Json | null
          default_max_results_per_run: number | null
          estimated_cost_per_result: number | null
          id: string
          is_active: boolean | null
          max_runs_per_week: number | null
          monthly_budget_limit: number | null
          name: string
          platform: Database["public"]["Enums"]["platform_type"]
          provider: Database["public"]["Enums"]["scraper_provider"]
          slug: string
          updated_at: string | null
        }
        Insert: {
          actor_id?: string | null
          api_endpoint?: string | null
          api_token_encrypted?: string | null
          created_at?: string | null
          default_config?: Json | null
          default_max_results_per_run?: number | null
          estimated_cost_per_result?: number | null
          id?: string
          is_active?: boolean | null
          max_runs_per_week?: number | null
          monthly_budget_limit?: number | null
          name: string
          platform: Database["public"]["Enums"]["platform_type"]
          provider?: Database["public"]["Enums"]["scraper_provider"]
          slug: string
          updated_at?: string | null
        }
        Update: {
          actor_id?: string | null
          api_endpoint?: string | null
          api_token_encrypted?: string | null
          created_at?: string | null
          default_config?: Json | null
          default_max_results_per_run?: number | null
          estimated_cost_per_result?: number | null
          id?: string
          is_active?: boolean | null
          max_runs_per_week?: number | null
          monthly_budget_limit?: number | null
          name?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          provider?: Database["public"]["Enums"]["scraper_provider"]
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scraper_run_logs: {
        Row: {
          business_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          estimated_cost: number | null
          id: string
          results_count: number | null
          run_id: string | null
          scraper_config_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          business_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          results_count?: number | null
          run_id?: string | null
          scraper_config_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          results_count?: number | null
          run_id?: string | null
          scraper_config_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraper_run_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraper_run_logs_scraper_config_id_fkey"
            columns: ["scraper_config_id"]
            isOneToOne: false
            referencedRelation: "scraper_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_mappings: {
        Row: {
          action_type: string | null
          config: Json | null
          created_at: string
          external_service_id: string | null
          id: string
          is_active: boolean | null
          platform: string | null
          priority: number | null
          provider_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          config?: Json | null
          created_at?: string
          external_service_id?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
          priority?: number | null
          provider_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          config?: Json | null
          created_at?: string
          external_service_id?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
          priority?: number | null
          provider_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_mappings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "api_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_mappings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_override: boolean | null
          override_by: string | null
          override_reason: string | null
          plan_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_override?: boolean | null
          override_by?: string | null
          override_reason?: string | null
          plan_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_override?: boolean | null
          override_by?: string | null
          override_reason?: string | null
          plan_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      action_status:
        | "pending_review"
        | "approved"
        | "scheduled"
        | "executing"
        | "completed"
        | "failed"
        | "skipped"
      platform_type:
        | "reddit"
        | "instagram"
        | "tiktok"
        | "linkedin"
        | "youtube"
        | "twitter"
      scraper_provider: "apify" | "rapidapi" | "custom"
      subscription_status: "active" | "inactive" | "cancelled" | "overridden"
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_status: [
        "pending_review",
        "approved",
        "scheduled",
        "executing",
        "completed",
        "failed",
        "skipped",
      ],
      platform_type: [
        "reddit",
        "instagram",
        "tiktok",
        "linkedin",
        "youtube",
        "twitter",
      ],
      scraper_provider: ["apify", "rapidapi", "custom"],
      subscription_status: ["active", "inactive", "cancelled", "overridden"],
      user_role: ["user", "admin"],
    },
  },
} as const

// Type aliases for convenience
export type Business = Tables<'businesses'>
export type Profile = Tables<'profiles'>
export type UserSubscription = Tables<'user_subscriptions'>
export type SubscriptionPlan = Tables<'subscription_plans'>
export type ActionUsage = Tables<'action_usage'>
export type PlannedAction = Tables<'planned_actions'>
export type ExecutedAction = Tables<'executed_actions'>
export type ContentEmbedding = Tables<'content_embeddings'>
export type ScrapedContentPool = Tables<'scraped_content_pool'>
export type ScraperConfig = Tables<'scraper_configs'>
export type ScraperRunLog = Tables<'scraper_run_logs'>
export type ApiProvider = Tables<'api_providers'>
export type Service = Tables<'services'>
export type ServiceMapping = Tables<'service_mappings'>
export type BusinessPlatformConfig = Tables<'business_platform_configs'>
export type Order = Tables<'orders'>

// Manual type for Apify scrape results (not yet in Supabase types)
export interface ApifyScrapeResult {
  id: string;
  provider_id: string;
  actor_id: string;
  run_id: string;
  dataset_id: string;
  input_config: Record<string, unknown>;
  results_data: unknown[];
  item_count: number;
  usage_usd: number | null;
  status: string;
  created_at: string;
}

// Enum type aliases
export type PlatformType = Database['public']['Enums']['platform_type']
export type ScraperProvider = Database['public']['Enums']['scraper_provider']
export type ActionStatus = Database['public']['Enums']['action_status']
export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
export type UserRole = Database['public']['Enums']['user_role']

// Stripe Plan Types
export interface StripePlan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  actionsPerMonth: number;
  businessLimit: number;
  features: string[];
  popular?: boolean;
}

export const STRIPE_PLANS: StripePlan[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 79.95,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    actionsPerMonth: 70,
    businessLimit: 1,
    features: [
      '70 Monthly Actions',
      '1 Business Profile',
      'Reddit Platform',
      'AI Comment Generation',
      'Email Support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    price: 199.95,
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || '',
    actionsPerMonth: 200,
    businessLimit: 3,
    features: [
      '200 Monthly Actions',
      '3 Business Profiles',
      'All Platforms',
      'AI Comment Generation',
      'Priority Support',
      'Analytics Dashboard',
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Scale Plan',
    price: 395.95,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
    actionsPerMonth: 450,
    businessLimit: 10,
    features: [
      '450 Monthly Actions',
      '10 Business Profiles',
      'All Platforms',
      'AI Comment Generation',
      'Priority Support',
      'Advanced Analytics',
      'API Access',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: 995.95,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
    actionsPerMonth: 1200,
    businessLimit: 999,
    features: [
      '1200 Monthly Actions',
      'Unlimited Business Profiles',
      'All Platforms',
      'AI Comment Generation',
      'Dedicated Support',
      'Custom Analytics',
      'API Access',
      'White Label Options',
    ],
  },
]
