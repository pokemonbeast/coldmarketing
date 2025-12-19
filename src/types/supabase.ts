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
        Relationships: []
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
      apify_scrape_results: {
        Row: {
          id: string
          provider_id: string
          actor_id: string
          run_id: string
          dataset_id: string
          input_config: Json
          results_data: Json
          item_count: number
          usage_usd: number | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          actor_id: string
          run_id: string
          dataset_id: string
          input_config?: Json
          results_data?: Json
          item_count?: number
          usage_usd?: number | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          actor_id?: string
          run_id?: string
          dataset_id?: string
          input_config?: Json
          results_data?: Json
          item_count?: number
          usage_usd?: number | null
          status?: string
          created_at?: string
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
        Relationships: []
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
        Relationships: []
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
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["platform_type"]
          relevance_score?: number | null
          scraped_pool_id?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      planned_actions: {
        Row: {
          auto_approved: boolean | null
          business_id: string
          created_at: string | null
          edited_comment: string | null
          embedding_id: string | null
          generated_comment: string
          id: string
          platform: Database["public"]["Enums"]["platform_type"]
          relevance_score: number | null
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
          created_at?: string | null
          edited_comment?: string | null
          embedding_id?: string | null
          generated_comment: string
          id?: string
          platform: Database["public"]["Enums"]["platform_type"]
          relevance_score?: number | null
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
          created_at?: string | null
          edited_comment?: string | null
          embedding_id?: string | null
          generated_comment?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          relevance_score?: number | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["action_status"] | null
          target_snippet?: string | null
          target_title?: string | null
          target_url?: string
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      service_mappings: {
        Row: {
          config: Json | null
          created_at: string
          external_service_id: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          provider_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          external_service_id?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          provider_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          external_service_id?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          provider_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: []
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
      lead_lists: {
        Row: {
          id: string
          lead_type: string
          industry: string
          city: string
          state: string
          country_code: string
          lead_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_type?: string
          industry: string
          city: string
          state: string
          country_code: string
          lead_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_type?: string
          industry?: string
          city?: string
          state?: string
          country_code?: string
          lead_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      verified_leads: {
        Row: {
          id: string
          lead_list_id: string
          email: string
          domain: string
          company_name: string | null
          lead_type: string
          phone: string | null
          website: string | null
          address: string | null
          city: string | null
          state: string | null
          country_code: string
          industry: string | null
          verification_state: string
          verification_data: Json | null
          source_scrape_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_list_id: string
          email: string
          domain: string
          company_name?: string | null
          lead_type?: string
          phone?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country_code: string
          industry?: string | null
          verification_state?: string
          verification_data?: Json | null
          source_scrape_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_list_id?: string
          email?: string
          domain?: string
          company_name?: string | null
          lead_type?: string
          phone?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country_code?: string
          industry?: string | null
          verification_state?: string
          verification_data?: Json | null
          source_scrape_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      email_verification_queue: {
        Row: {
          id: string
          scrape_result_id: string
          emails_to_verify: Json
          email_count: number
          status: string
          verification_run_id: string | null
          verification_dataset_id: string | null
          error_message: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          scrape_result_id: string
          emails_to_verify?: Json
          email_count?: number
          status?: string
          verification_run_id?: string | null
          verification_dataset_id?: string | null
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          scrape_result_id?: string
          emails_to_verify?: Json
          email_count?: number
          status?: string
          verification_run_id?: string | null
          verification_dataset_id?: string | null
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
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
        Relationships: []
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

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]




