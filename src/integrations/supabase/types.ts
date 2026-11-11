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
      zoric_ad_campaigns: {
        Row: {
          created_at: string
          daily_budget: number | null
          end_date: string | null
          id: string
          name: string
          objective: string | null
          platform_id: string
          product_id: string | null
          start_date: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          id?: string
          name: string
          objective?: string | null
          platform_id: string
          product_id?: string | null
          start_date?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          id?: string
          name?: string
          objective?: string | null
          platform_id?: string
          product_id?: string | null
          start_date?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_ad_campaigns_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "zoric_ad_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_ad_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "zoric_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_ad_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_ad_metrics: {
        Row: {
          attributed_revenue: number
          campaign_id: string
          clicks: number
          confirmed_orders: number
          created_at: string
          id: string
          impressions: number
          leads: number
          metric_date: string
          purchases: number
          spend: number
          store_id: string
        }
        Insert: {
          attributed_revenue?: number
          campaign_id: string
          clicks?: number
          confirmed_orders?: number
          created_at?: string
          id?: string
          impressions?: number
          leads?: number
          metric_date: string
          purchases?: number
          spend?: number
          store_id: string
        }
        Update: {
          attributed_revenue?: number
          campaign_id?: string
          clicks?: number
          confirmed_orders?: number
          created_at?: string
          id?: string
          impressions?: number
          leads?: number
          metric_date?: string
          purchases?: number
          spend?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_ad_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "zoric_ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_ad_metrics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_ad_platforms: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      zoric_business_profiles: {
        Row: {
          address: string | null
          ai: string | null
          bank_details: string | null
          created_at: string
          email: string | null
          id: string
          is_default: boolean
          legal_name: string | null
          name: string
          nif: string | null
          nis: string | null
          phone: string | null
          rc: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai?: string | null
          bank_details?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean
          legal_name?: string | null
          name: string
          nif?: string | null
          nis?: string | null
          phone?: string | null
          rc?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai?: string | null
          bank_details?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean
          legal_name?: string | null
          name?: string
          nif?: string | null
          nis?: string | null
          phone?: string | null
          rc?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_business_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_customers: {
        Row: {
          address: string | null
          cancelled_orders: number
          city: string | null
          created_at: string
          delivered_orders: number
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          risk_level: string | null
          store_id: string
          tags: string[] | null
          total_orders: number
          total_spent: number
          updated_at: string
          wilaya: string | null
        }
        Insert: {
          address?: string | null
          cancelled_orders?: number
          city?: string | null
          created_at?: string
          delivered_orders?: number
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          risk_level?: string | null
          store_id: string
          tags?: string[] | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
          wilaya?: string | null
        }
        Update: {
          address?: string | null
          cancelled_orders?: number
          city?: string | null
          created_at?: string
          delivered_orders?: number
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          risk_level?: string | null
          store_id?: string
          tags?: string[] | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
          wilaya?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoric_customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_deliveries: {
        Row: {
          cod_amount: number
          cod_collected: boolean
          courier_name: string | null
          created_at: string
          id: string
          last_update: string
          order_id: string
          partner_id: string | null
          status: string
          store_id: string
          timeline: Json
          tracking_code: string
          updated_at: string
        }
        Insert: {
          cod_amount?: number
          cod_collected?: boolean
          courier_name?: string | null
          created_at?: string
          id?: string
          last_update?: string
          order_id: string
          partner_id?: string | null
          status?: string
          store_id: string
          timeline?: Json
          tracking_code: string
          updated_at?: string
        }
        Update: {
          cod_amount?: number
          cod_collected?: boolean
          courier_name?: string | null
          created_at?: string
          id?: string
          last_update?: string
          order_id?: string
          partner_id?: string | null
          status?: string
          store_id?: string
          timeline?: Json
          tracking_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zoric_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_deliveries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "zoric_delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_deliveries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_delivery_partners: {
        Row: {
          api_configured: boolean
          code: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          api_configured?: boolean
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          api_configured?: boolean
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_delivery_partners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          expense_date: string
          id: string
          label: string
          note: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          label: string
          note?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          label?: string
          note?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_inventory: {
        Row: {
          available: number
          created_at: string
          id: string
          incoming: number
          product_id: string
          reorder_level: number
          reserved: number
          store_id: string
          updated_at: string
          variant_id: string | null
          warehouse: string
        }
        Insert: {
          available?: number
          created_at?: string
          id?: string
          incoming?: number
          product_id: string
          reorder_level?: number
          reserved?: number
          store_id: string
          updated_at?: string
          variant_id?: string | null
          warehouse?: string
        }
        Update: {
          available?: number
          created_at?: string
          id?: string
          incoming?: number
          product_id?: string
          reorder_level?: number
          reserved?: number
          store_id?: string
          updated_at?: string
          variant_id?: string | null
          warehouse?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "zoric_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "zoric_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          severity: string
          store_id: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          store_id: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          store_id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoric_notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          store_id: string
          unit_cost: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          store_id: string
          unit_cost?: number
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          store_id?: string
          unit_cost?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoric_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zoric_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "zoric_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "zoric_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_orders: {
        Row: {
          address: string | null
          campaign_id: string | null
          city: string | null
          confirmation_note: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_cost: number
          delivery_partner_id: string | null
          delivery_type: string
          estimated_profit: number
          id: string
          internal_note: string | null
          order_code: string
          order_date: string
          payment_method: string
          product_cost: number
          return_cost: number
          source: string | null
          status: string
          store_id: string
          subtotal: number
          total: number
          updated_at: string
          wilaya: string | null
        }
        Insert: {
          address?: string | null
          campaign_id?: string | null
          city?: string | null
          confirmation_note?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_cost?: number
          delivery_partner_id?: string | null
          delivery_type?: string
          estimated_profit?: number
          id?: string
          internal_note?: string | null
          order_code: string
          order_date?: string
          payment_method?: string
          product_cost?: number
          return_cost?: number
          source?: string | null
          status?: string
          store_id: string
          subtotal?: number
          total?: number
          updated_at?: string
          wilaya?: string | null
        }
        Update: {
          address?: string | null
          campaign_id?: string | null
          city?: string | null
          confirmation_note?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_cost?: number
          delivery_partner_id?: string | null
          delivery_type?: string
          estimated_profit?: number
          id?: string
          internal_note?: string | null
          order_code?: string
          order_date?: string
          payment_method?: string
          product_cost?: number
          return_cost?: number
          source?: string | null
          status?: string
          store_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
          wilaya?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoric_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "zoric_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_orders_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "zoric_delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_product_variants: {
        Row: {
          created_at: string
          id: string
          name: string
          price_override: number | null
          product_id: string
          sku: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_override?: number | null
          product_id: string
          sku?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_override?: number | null
          product_id?: string
          sku?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "zoric_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_product_variants_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          packaging_cost: number
          product_cost: number
          selling_price: number
          sku: string | null
          status: string
          store_id: string
          supplier: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          packaging_cost?: number
          product_cost?: number
          selling_price?: number
          sku?: string | null
          status?: string
          store_id: string
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          packaging_cost?: number
          product_cost?: number
          selling_price?: number
          sku?: string | null
          status?: string
          store_id?: string
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_returns: {
        Row: {
          created_at: string
          financial_impact: number
          id: string
          note: string | null
          order_id: string
          reason: string
          return_date: string
          stock_action: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          financial_impact?: number
          id?: string
          note?: string | null
          order_id: string
          reason: string
          return_date?: string
          stock_action?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          financial_impact?: number
          id?: string
          note?: string | null
          order_id?: string
          reason?: string
          return_date?: string
          stock_action?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zoric_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_returns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_shipping_rates: {
        Row: {
          created_at: string
          home_price: number
          id: string
          return_price: number
          stopdesk_price: number
          store_id: string
          updated_at: string
          wilaya_code: string
          wilaya_name: string
        }
        Insert: {
          created_at?: string
          home_price?: number
          id?: string
          return_price?: number
          stopdesk_price?: number
          store_id: string
          updated_at?: string
          wilaya_code: string
          wilaya_name: string
        }
        Update: {
          created_at?: string
          home_price?: number
          id?: string
          return_price?: number
          stopdesk_price?: number
          store_id?: string
          updated_at?: string
          wilaya_code?: string
          wilaya_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_shipping_rates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_id: string
          quantity: number
          reason: string
          store_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id: string
          quantity: number
          reason: string
          store_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string
          quantity?: number
          reason?: string
          store_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoric_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "zoric_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_stock_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoric_stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "zoric_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_store_members: {
        Row: {
          created_at: string
          id: string
          invited_email: string | null
          role: Database["public"]["Enums"]["zoric_role"]
          status: string
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["zoric_role"]
          status?: string
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["zoric_role"]
          status?: string
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoric_store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "zoric_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      zoric_stores: {
        Row: {
          address: string | null
          cod_fee: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          currency_symbol: string
          default_delivery_cost: number
          id: string
          invoice_footer: string | null
          is_demo: boolean
          language: string
          logo_url: string | null
          low_stock_threshold: number
          name: string
          order_code_prefix: string
          slug: string
          tax_included: boolean
          tax_rate: number
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cod_fee?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          currency_symbol?: string
          default_delivery_cost?: number
          id?: string
          invoice_footer?: string | null
          is_demo?: boolean
          language?: string
          logo_url?: string | null
          low_stock_threshold?: number
          name: string
          order_code_prefix?: string
          slug: string
          tax_included?: boolean
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cod_fee?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          currency_symbol?: string
          default_delivery_cost?: number
          id?: string
          invoice_footer?: string | null
          is_demo?: boolean
          language?: string
          logo_url?: string | null
          low_stock_threshold?: number
          name?: string
          order_code_prefix?: string
          slug?: string
          tax_included?: boolean
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      zoric_ensure_demo_membership: { Args: never; Returns: string }
      zoric_ensure_workspace: { Args: never; Returns: string }
      zoric_has_store_access: { Args: { _store_id: string }; Returns: boolean }
      zoric_has_store_role: {
        Args: {
          _roles: Database["public"]["Enums"]["zoric_role"][]
          _store_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      zoric_role:
        | "owner"
        | "admin"
        | "manager"
        | "media_buyer"
        | "support"
        | "delivery"
        | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      zoric_role: [
        "owner",
        "admin",
        "manager",
        "media_buyer",
        "support",
        "delivery",
        "viewer",
      ],
    },
  },
} as const
