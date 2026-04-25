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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          accent_color: string | null
          auth_accent_color: string | null
          auth_image_url: string | null
          auth_subtitle: string | null
          auth_title: string | null
          background_color: string | null
          body_font: string | null
          client_accent_color: string | null
          client_background_color: string | null
          client_foreground_color: string | null
          client_login_cta: string | null
          client_logo_url: string | null
          client_primary_color: string | null
          client_secondary_color: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          footer_links: Json | null
          footer_text: string | null
          foreground_color: string | null
          heading_font: string | null
          hero_background_url: string | null
          hero_badge: string | null
          hero_cta_label: string | null
          hero_overlay_opacity: number | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          logo_url: string | null
          nav_links: Json | null
          nome_fantasia: string | null
          paypal_env: string
          pix_key: string | null
          pix_key_type: string | null
          primary_color: string | null
          proposal_accent_color: string | null
          proposal_after_accept: string | null
          proposal_intro: string | null
          proposal_title: string | null
          razao_social: string | null
          secondary_color: string | null
          site_description: string | null
          site_title: string | null
          success_message: string | null
          success_title: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          auth_accent_color?: string | null
          auth_image_url?: string | null
          auth_subtitle?: string | null
          auth_title?: string | null
          background_color?: string | null
          body_font?: string | null
          client_accent_color?: string | null
          client_background_color?: string | null
          client_foreground_color?: string | null
          client_login_cta?: string | null
          client_logo_url?: string | null
          client_primary_color?: string | null
          client_secondary_color?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          footer_links?: Json | null
          footer_text?: string | null
          foreground_color?: string | null
          heading_font?: string | null
          hero_background_url?: string | null
          hero_badge?: string | null
          hero_cta_label?: string | null
          hero_overlay_opacity?: number | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          nav_links?: Json | null
          nome_fantasia?: string | null
          paypal_env?: string
          pix_key?: string | null
          pix_key_type?: string | null
          primary_color?: string | null
          proposal_accent_color?: string | null
          proposal_after_accept?: string | null
          proposal_intro?: string | null
          proposal_title?: string | null
          razao_social?: string | null
          secondary_color?: string | null
          site_description?: string | null
          site_title?: string | null
          success_message?: string | null
          success_title?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          auth_accent_color?: string | null
          auth_image_url?: string | null
          auth_subtitle?: string | null
          auth_title?: string | null
          background_color?: string | null
          body_font?: string | null
          client_accent_color?: string | null
          client_background_color?: string | null
          client_foreground_color?: string | null
          client_login_cta?: string | null
          client_logo_url?: string | null
          client_primary_color?: string | null
          client_secondary_color?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          footer_links?: Json | null
          footer_text?: string | null
          foreground_color?: string | null
          heading_font?: string | null
          hero_background_url?: string | null
          hero_badge?: string | null
          hero_cta_label?: string | null
          hero_overlay_opacity?: number | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          nav_links?: Json | null
          nome_fantasia?: string | null
          paypal_env?: string
          pix_key?: string | null
          pix_key_type?: string | null
          primary_color?: string | null
          proposal_accent_color?: string | null
          proposal_after_accept?: string | null
          proposal_intro?: string | null
          proposal_title?: string | null
          razao_social?: string | null
          secondary_color?: string | null
          site_description?: string | null
          site_title?: string | null
          success_message?: string | null
          success_title?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_items: {
        Row: {
          active: boolean
          billing_cycle: string
          contract_id: string
          created_at: string
          custom_name: string | null
          custom_price_cents: number | null
          id: string
          next_billing_at: string | null
          product_id: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_cycle: string
          contract_id: string
          created_at?: string
          custom_name?: string | null
          custom_price_cents?: number | null
          id?: string
          next_billing_at?: string | null
          product_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_cycle?: string
          contract_id?: string
          created_at?: string
          custom_name?: string | null
          custom_price_cents?: number | null
          id?: string
          next_billing_at?: string | null
          product_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          accepted_at: string | null
          accepted_ip: string | null
          client_id: string
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_ip?: string | null
          client_id: string
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_ip?: string | null
          client_id?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      form_questions: {
        Row: {
          created_at: string
          depends_on: string | null
          depends_value: string | null
          field_type: string
          id: string
          label: string
          mask: string | null
          options: Json | null
          order_index: number
          required: boolean | null
          step: number
          step_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          depends_on?: string | null
          depends_value?: string | null
          field_type: string
          id?: string
          label: string
          mask?: string | null
          options?: Json | null
          order_index?: number
          required?: boolean | null
          step?: number
          step_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          depends_on?: string | null
          depends_value?: string | null
          field_type?: string
          id?: string
          label?: string
          mask?: string | null
          options?: Json | null
          order_index?: number
          required?: boolean | null
          step?: number
          step_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          kind: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          kind: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          kind?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount_cents: number
          contract_item_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
        }
        Insert: {
          amount_cents?: number
          contract_item_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
        }
        Update: {
          amount_cents?: number
          contract_item_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_contract_item_id_fkey"
            columns: ["contract_item_id"]
            isOneToOne: false
            referencedRelation: "contract_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          contract_id: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_proof_url: string | null
          period_end: string | null
          period_start: string | null
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          client_id: string
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_answers: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          lead_id: string
          question_id: string
          question_label: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          lead_id: string
          question_id: string
          question_label: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          question_id?: string
          question_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_answers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_proposed_items: {
        Row: {
          billing_cycle: string
          created_at: string
          custom_name: string | null
          custom_price_cents: number | null
          id: string
          lead_id: string
          notes: string | null
          product_id: string | null
          quantity: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          created_at?: string
          custom_name?: string | null
          custom_price_cents?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          custom_name?: string | null
          custom_price_cents?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_proposed_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_proposed_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_whatsapp: string | null
          created_at: string
          id: string
          solution_type: string | null
          status: string | null
          technical_solution: string | null
          technical_solution_updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          solution_type?: string | null
          status?: string | null
          technical_solution?: string | null
          technical_solution_updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          solution_type?: string | null
          status?: string | null
          technical_solution?: string | null
          technical_solution_updated_at?: string | null
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          copy_paste: string | null
          created_at: string
          expires_at: string | null
          id: string
          invoice_id: string
          provider: string
          provider_ref: string | null
          qr_code: string | null
          raw_payload: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          copy_paste?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invoice_id: string
          provider: string
          provider_ref?: string | null
          qr_code?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          copy_paste?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invoice_id?: string
          provider?: string
          provider_ref?: string | null
          qr_code?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_change_requests: {
        Row: {
          client_id: string
          client_note: string | null
          consultor_note: string | null
          contract_id: string
          created_at: string
          current_item_id: string | null
          current_product_id: string | null
          decided_at: string | null
          decided_by: string | null
          desired_product_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_note?: string | null
          consultor_note?: string | null
          contract_id: string
          created_at?: string
          current_item_id?: string | null
          current_product_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          desired_product_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_note?: string | null
          consultor_note?: string | null
          contract_id?: string
          created_at?: string
          current_item_id?: string | null
          current_product_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          desired_product_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          billing_cycle: string
          created_at: string
          description: string | null
          id: string
          name: string
          price_cents: number
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_cycle: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_cents?: number
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          doc_number: string | null
          doc_type: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          full_name: string | null
          id: string
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          doc_number?: string | null
          doc_type?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          full_name?: string | null
          id: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          doc_number?: string | null
          doc_type?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          full_name?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_public_brand: {
        Args: never
        Returns: {
          accent_color: string
          auth_accent_color: string
          auth_image_url: string
          auth_subtitle: string
          auth_title: string
          background_color: string
          body_font: string
          client_accent_color: string
          client_background_color: string
          client_foreground_color: string
          client_login_cta: string
          client_logo_url: string
          client_primary_color: string
          client_secondary_color: string
          created_at: string
          footer_links: Json
          footer_text: string
          foreground_color: string
          heading_font: string
          hero_background_url: string
          hero_badge: string
          hero_cta_label: string
          hero_overlay_opacity: number
          hero_subtitle: string
          hero_title: string
          id: string
          logo_url: string
          nav_links: Json
          nome_fantasia: string
          primary_color: string
          proposal_accent_color: string
          proposal_after_accept: string
          proposal_intro: string
          proposal_title: string
          razao_social: string
          secondary_color: string
          site_description: string
          site_title: string
          success_message: string
          success_title: string
        }[]
      }
      get_public_proposal: {
        Args: { _lead_id: string }
        Returns: {
          accepted: boolean
          billing_cycle: string
          contact_name: string
          custom_name: string
          custom_price_cents: number
          item_id: string
          lead_created_at: string
          lead_id: string
          product_id: string
          product_name: string
          product_price_cents: number
          quantity: number
          solution_type: string
          sort_order: number
          technical_solution: string
          technical_solution_updated_at: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "consultor" | "cliente"
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
      app_role: ["consultor", "cliente"],
    },
  },
} as const
