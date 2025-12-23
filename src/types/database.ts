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
      apify_scrape_results: {
        Row: {
          actor_id: string
          created_at: string
          dataset_id: string
          id: string
          input_config: Json
          item_count: number
          provider_id: string
          results_data: Json
          run_id: string
          status: string
          usage_usd: number | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          dataset_id: string
          id?: string
          input_config?: Json
          item_count?: number
          provider_id: string
          results_data?: Json
          run_id: string
          status?: string
          usage_usd?: number | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          dataset_id?: string
          id?: string
          input_config?: Json
          item_count?: number
          provider_id?: string
          results_data?: Json
          run_id?: string
          status?: string
          usage_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "apify_scrape_results_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "api_providers"
            referencedColumns: ["id"]
          },
        ]
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
      business_research_runs: {
        Row: {
          apify_dataset_id: string | null
          apify_run_id: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          item_count: number | null
          keywords_used: string[]
          provider_slug: string
          run_type: string
          simulated_posts: Json | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          apify_dataset_id?: string | null
          apify_run_id?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          item_count?: number | null
          keywords_used?: string[]
          provider_slug: string
          run_type: string
          simulated_posts?: Json | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          apify_dataset_id?: string | null
          apify_run_id?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          item_count?: number | null
          keywords_used?: string[]
          provider_slug?: string
          run_type?: string
          simulated_posts?: Json | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_research_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_research_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          auto_approve: boolean | null
          created_at: string | null
          description: string | null
          gmb_targets: Json | null
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
          gmb_targets?: Json | null
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
          gmb_targets?: Json | null
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
      email_replies: {
        Row: {
          id: string
          user_id: string
          campaign_id: number
          lead_email: string
          lead_first_name: string | null
          lead_last_name: string | null
          email_account: string
          subject: string | null
          body: string
          message_id: string | null
          thread_id: string | null
          step_number: number | null
          is_read: boolean
          received_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id: number
          lead_email: string
          lead_first_name?: string | null
          lead_last_name?: string | null
          email_account: string
          subject?: string | null
          body: string
          message_id?: string | null
          thread_id?: string | null
          step_number?: number | null
          is_read?: boolean
          received_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: number
          lead_email?: string
          lead_first_name?: string | null
          lead_last_name?: string | null
          email_account?: string
          subject?: string | null
          body?: string
          message_id?: string | null
          thread_id?: string | null
          step_number?: number | null
          is_read?: boolean
          received_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_queue: {
        Row: {
          created_at: string
          email_count: number
          emails_to_verify: Json
          error_message: string | null
          id: string
          processed_at: string | null
          scrape_result_id: string
          status: string
          verification_dataset_id: string | null
          verification_run_id: string | null
        }
        Insert: {
          created_at?: string
          email_count?: number
          emails_to_verify?: Json
          error_message?: string | null
          id?: string
          processed_at?: string | null
          scrape_result_id: string
          status?: string
          verification_dataset_id?: string | null
          verification_run_id?: string | null
        }
        Update: {
          created_at?: string
          email_count?: number
          emails_to_verify?: Json
          error_message?: string | null
          id?: string
          processed_at?: string | null
          scrape_result_id?: string
          status?: string
          verification_dataset_id?: string | null
          verification_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_verification_queue_scrape_result_id_fkey"
            columns: ["scrape_result_id"]
            isOneToOne: true
            referencedRelation: "apify_scrape_results"
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
      lead_lists: {
        Row: {
          city: string
          country_code: string
          created_at: string
          id: string
          industry: string
          lead_count: number
          lead_type: string
          state: string
          updated_at: string
        }
        Insert: {
          city: string
          country_code: string
          created_at?: string
          id?: string
          industry: string
          lead_count?: number
          lead_type?: string
          state: string
          updated_at?: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          id?: string
          industry?: string
          lead_count?: number
          lead_type?: string
          state?: string
          updated_at?: string
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
          unread_emails_count: number | null
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
          unread_emails_count?: number | null
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
          unread_emails_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reachinbox_campaigns: {
        Row: {
          id: string
          user_id: string
          campaign_id: number
          campaign_name: string
          status: string
          email_accounts: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id: number
          campaign_name: string
          status?: string
          email_accounts?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: number
          campaign_name?: string
          status?: string
          email_accounts?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reachinbox_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reddit_accounts: {
        Row: {
          browserbase_context_created_at: string | null
          browserbase_context_id: string | null
          cookies: string | null
          cookies_updated_at: string | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          password: string
          proxy: string
          token_v2: string | null
          username: string
        }
        Insert: {
          browserbase_context_created_at?: string | null
          browserbase_context_id?: string | null
          cookies?: string | null
          cookies_updated_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          password: string
          proxy: string
          token_v2?: string | null
          username: string
        }
        Update: {
          browserbase_context_created_at?: string | null
          browserbase_context_id?: string | null
          cookies?: string | null
          cookies_updated_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          password?: string
          proxy?: string
          token_v2?: string | null
          username?: string
        }
        Relationships: []
      }
      research_results: {
        Row: {
          business_id: string
          created_at: string
          external_id: string | null
          id: string
          platform: string
          relevance_score: number | null
          research_run_id: string
          result_data: Json
          reveal_at: string
          score: number | null
          title: string | null
          url: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          platform: string
          relevance_score?: number | null
          research_run_id: string
          result_data: Json
          reveal_at: string
          score?: number | null
          title?: string | null
          url?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          platform?: string
          relevance_score?: number | null
          research_run_id?: string
          result_data?: Json
          reveal_at?: string
          score?: number | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_results_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_results_research_run_id_fkey"
            columns: ["research_run_id"]
            isOneToOne: false
            referencedRelation: "business_research_runs"
            referencedColumns: ["id"]
          },
        ]
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
      twitter_accounts: {
        Row: {
          email: string
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          login_cookie: string | null
          login_cookie_updated_at: string | null
          password: string
          proxy: string
          totp_secret: string | null
          username: string
        }
        Insert: {
          email: string
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          login_cookie?: string | null
          login_cookie_updated_at?: string | null
          password: string
          proxy: string
          totp_secret?: string | null
          username: string
        }
        Update: {
          email?: string
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          login_cookie?: string | null
          login_cookie_updated_at?: string | null
          password?: string
          proxy?: string
          totp_secret?: string | null
          username?: string
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
      verified_leads: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country_code: string
          created_at: string
          domain: string
          email: string
          id: string
          industry: string | null
          lead_list_id: string
          lead_type: string
          phone: string | null
          source_scrape_id: string | null
          state: string | null
          verification_data: Json | null
          verification_state: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code: string
          created_at?: string
          domain: string
          email: string
          id?: string
          industry?: string | null
          lead_list_id: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code?: string
          created_at?: string
          domain?: string
          email?: string
          id?: string
          industry?: string | null
          lead_list_id?: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verified_leads_lead_list_id_fkey"
            columns: ["lead_list_id"]
            isOneToOne: false
            referencedRelation: "lead_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_leads_source_scrape_id_fkey"
            columns: ["source_scrape_id"]
            isOneToOne: false
            referencedRelation: "apify_scrape_results"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_leads_au: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country_code: string
          created_at: string
          domain: string
          email: string
          id: string
          industry: string | null
          lead_list_id: string
          lead_type: string
          phone: string | null
          source_scrape_id: string | null
          state: string | null
          verification_data: Json | null
          verification_state: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code: string
          created_at?: string
          domain: string
          email: string
          id?: string
          industry?: string | null
          lead_list_id: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code?: string
          created_at?: string
          domain?: string
          email?: string
          id?: string
          industry?: string | null
          lead_list_id?: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Relationships: []
      }
      verified_leads_ca: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country_code: string
          created_at: string
          domain: string
          email: string
          id: string
          industry: string | null
          lead_list_id: string
          lead_type: string
          phone: string | null
          source_scrape_id: string | null
          state: string | null
          verification_data: Json | null
          verification_state: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code: string
          created_at?: string
          domain: string
          email: string
          id?: string
          industry?: string | null
          lead_list_id: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code?: string
          created_at?: string
          domain?: string
          email?: string
          id?: string
          industry?: string | null
          lead_list_id?: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Relationships: []
      }
      verified_leads_de: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country_code: string
          created_at: string
          domain: string
          email: string
          id: string
          industry: string | null
          lead_list_id: string
          lead_type: string
          phone: string | null
          source_scrape_id: string | null
          state: string | null
          verification_data: Json | null
          verification_state: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code: string
          created_at?: string
          domain: string
          email: string
          id?: string
          industry?: string | null
          lead_list_id: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code?: string
          created_at?: string
          domain?: string
          email?: string
          id?: string
          industry?: string | null
          lead_list_id?: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Relationships: []
      }
      verified_leads_other: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country_code: string
          created_at: string
          domain: string
          email: string
          id: string
          industry: string | null
          lead_list_id: string
          lead_type: string
          phone: string | null
          source_scrape_id: string | null
          state: string | null
          verification_data: Json | null
          verification_state: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code: string
          created_at?: string
          domain: string
          email: string
          id?: string
          industry?: string | null
          lead_list_id: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code?: string
          created_at?: string
          domain?: string
          email?: string
          id?: string
          industry?: string | null
          lead_list_id?: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Relationships: []
      }
      verified_leads_uk: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country_code: string
          created_at: string
          domain: string
          email: string
          id: string
          industry: string | null
          lead_list_id: string
          lead_type: string
          phone: string | null
          source_scrape_id: string | null
          state: string | null
          verification_data: Json | null
          verification_state: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code: string
          created_at?: string
          domain: string
          email: string
          id?: string
          industry?: string | null
          lead_list_id: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code?: string
          created_at?: string
          domain?: string
          email?: string
          id?: string
          industry?: string | null
          lead_list_id?: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Relationships: []
      }
      verified_leads_us: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country_code: string
          created_at: string
          domain: string
          email: string
          id: string
          industry: string | null
          lead_list_id: string
          lead_type: string
          phone: string | null
          source_scrape_id: string | null
          state: string | null
          verification_data: Json | null
          verification_state: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code: string
          created_at?: string
          domain: string
          email: string
          id?: string
          industry?: string | null
          lead_list_id: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country_code?: string
          created_at?: string
          domain?: string
          email?: string
          id?: string
          industry?: string | null
          lead_list_id?: string
          lead_type?: string
          phone?: string | null
          source_scrape_id?: string | null
          state?: string | null
          verification_data?: Json | null
          verification_state?: string
          website?: string | null
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

// Stripe Plans Configuration
export interface StripePlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  actionsPerMonth: number;
  businessLimit: number;
  popular?: boolean;
}

export const STRIPE_PLANS: StripePlan[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    price: 29,
    interval: 'month',
    features: [
      '50 AI-powered comments/month',
      '1 business profile',
      'Reddit monitoring',
      'Basic analytics',
      'Email support',
    ],
    actionsPerMonth: 50,
    businessLimit: 1,
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || '',
    price: 79,
    interval: 'month',
    features: [
      '200 AI-powered comments/month',
      '3 business profiles',
      'Reddit + Twitter monitoring',
      'Advanced analytics',
      'Priority support',
      'Custom tone of voice',
    ],
    actionsPerMonth: 200,
    businessLimit: 3,
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale Plan',
    priceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID || '',
    price: 199,
    interval: 'month',
    features: [
      '500 AI-powered comments/month',
      '10 business profiles',
      'All platform monitoring',
      'Premium analytics & reports',
      'Dedicated account manager',
      'API access',
      'White-label options',
    ],
    actionsPerMonth: 500,
    businessLimit: 10,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
    price: 499,
    interval: 'month',
    features: [
      'Unlimited AI-powered comments',
      'Unlimited business profiles',
      'All platform monitoring',
      'Custom integrations',
      'Dedicated support team',
      'SLA guarantees',
      'On-premise deployment option',
    ],
    actionsPerMonth: -1, // Unlimited
    businessLimit: -1, // Unlimited
  },
]

// Business Lead Finder Target Type
export interface GMBTarget {
  industry: string;
  country: 'US' | 'CA' | 'GB' | 'DE' | 'AU';
  countryName: string;
  state: string | null;      // null = "Anywhere in Country"
  stateCode: string | null;
  city: string | null;       // null = "Anywhere in State/Country"
  // Status tracking (set by backend after scraping)
  fulfilled_at?: string | null;    // When this target was fulfilled (ISO timestamp)
  cache_id?: string | null;        // Reference to gmb_scrape_cache entry used
  result_count?: number | null;    // How many results were found
}

// Business type - uses the Row type from businesses table
export type Business = Database['public']['Tables']['businesses']['Row'];

// Profile type alias
export type Profile = Database['public']['Tables']['profiles']['Row'];

// Subscription types
export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];
export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];

// API Provider type
export type ApiProvider = Database['public']['Tables']['api_providers']['Row'];

// Scraper types
export type ScraperConfig = Database['public']['Tables']['scraper_configs']['Row'];
export type PlatformType = Database['public']['Enums']['platform_type'];
export type ScraperProvider = Database['public']['Enums']['scraper_provider'];

// Service types
export type Service = Database['public']['Tables']['services']['Row'];
export type ServiceMapping = Database['public']['Tables']['service_mappings']['Row'];
