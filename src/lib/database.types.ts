export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          query?: string
          variables?: Json
          extensions?: Json
          operationName?: string
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
      batch_events: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          is_public: boolean
          message: string | null
          type: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          message?: string | null
          type: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          message?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          auto_open_next: boolean
          closed_at: string | null
          closes_at: string
          created_at: string
          cutoff_run_id: string | null
          drop_id: string
          expected_delivery_at: string | null
          freight_finalised_at: string | null
          freight_mode: Database["public"]["Enums"]["freight_mode"]
          freight_rate_estimate: number
          freight_total_actual: number | null
          freight_units_total: number | null
          id: string
          number: number
          opens_at: string
          order_seq: number
          status: Database["public"]["Enums"]["batch_status"]
          updated_at: string
        }
        Insert: {
          auto_open_next?: boolean
          closed_at?: string | null
          closes_at: string
          created_at?: string
          cutoff_run_id?: string | null
          drop_id: string
          expected_delivery_at?: string | null
          freight_finalised_at?: string | null
          freight_mode: Database["public"]["Enums"]["freight_mode"]
          freight_rate_estimate?: number
          freight_total_actual?: number | null
          freight_units_total?: number | null
          id?: string
          number: number
          opens_at?: string
          order_seq?: number
          status?: Database["public"]["Enums"]["batch_status"]
          updated_at?: string
        }
        Update: {
          auto_open_next?: boolean
          closed_at?: string | null
          closes_at?: string
          created_at?: string
          cutoff_run_id?: string | null
          drop_id?: string
          expected_delivery_at?: string | null
          freight_finalised_at?: string | null
          freight_mode?: Database["public"]["Enums"]["freight_mode"]
          freight_rate_estimate?: number
          freight_total_actual?: number | null
          freight_units_total?: number | null
          id?: string
          number?: number
          opens_at?: string
          order_seq?: number
          status?: Database["public"]["Enums"]["batch_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          drop_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          drop_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          drop_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          portal_token: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          portal_token?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          portal_token?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      drop_waitlist: {
        Row: {
          created_at: string
          drop_id: string
          email: string
          id: string
          notified_at: string | null
        }
        Insert: {
          created_at?: string
          drop_id: string
          email: string
          id?: string
          notified_at?: string | null
        }
        Update: {
          created_at?: string
          drop_id?: string
          email?: string
          id?: string
          notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drop_waitlist_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      drops: {
        Row: {
          archived_at: string | null
          cover_path: string | null
          created_at: string
          default_freight_mode: Database["public"]["Enums"]["freight_mode"]
          description: string | null
          id: string
          published: boolean
          settings: Json
          slug: string
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          archived_at?: string | null
          cover_path?: string | null
          created_at?: string
          default_freight_mode?: Database["public"]["Enums"]["freight_mode"]
          description?: string | null
          id?: string
          published?: boolean
          settings?: Json
          slug: string
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          archived_at?: string | null
          cover_path?: string | null
          created_at?: string
          default_freight_mode?: Database["public"]["Enums"]["freight_mode"]
          description?: string | null
          id?: string
          published?: boolean
          settings?: Json
          slug?: string
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drops_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          qty: number
          snapshot: Json
          unit_price: number
          variant_ids: string[]
          volume_cm3: number
          weight_grams: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          qty: number
          snapshot?: Json
          unit_price: number
          variant_ids?: string[]
          volume_cm3?: number
          weight_grams?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          qty?: number
          snapshot?: Json
          unit_price?: number
          variant_ids?: string[]
          volume_cm3?: number
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_display_name: string
          id: string
          order_id: string
          rating: number
          vendor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_display_name: string
          id?: string
          order_id: string
          rating: number
          vendor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_display_name?: string
          id?: string
          order_id?: string
          rating?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          batch_id: string
          cancelled_at: string | null
          code: string
          collected_at: string | null
          collected_by: string | null
          created_at: string
          customer_id: string
          delivery_note: string | null
          freight_amount: number | null
          freight_estimate: number
          freight_invoiced_at: string | null
          freight_paid_at: string | null
          freight_units: number
          fulfilment: Database["public"]["Enums"]["fulfilment_method"]
          goods_paid_at: string | null
          goods_total: number
          hold_expires_at: string | null
          id: string
          public_token: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          batch_id: string
          cancelled_at?: string | null
          code: string
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          customer_id: string
          delivery_note?: string | null
          freight_amount?: number | null
          freight_estimate?: number
          freight_invoiced_at?: string | null
          freight_paid_at?: string | null
          freight_units?: number
          fulfilment?: Database["public"]["Enums"]["fulfilment_method"]
          goods_paid_at?: string | null
          goods_total?: number
          hold_expires_at?: string | null
          id?: string
          public_token?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          batch_id?: string
          cancelled_at?: string | null
          code?: string
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          customer_id?: string
          delivery_note?: string | null
          freight_amount?: number | null
          freight_estimate?: number
          freight_invoiced_at?: string | null
          freight_paid_at?: string | null
          freight_units?: number
          fulfilment?: Database["public"]["Enums"]["fulfilment_method"]
          goods_paid_at?: string | null
          goods_total?: number
          hold_expires_at?: string | null
          id?: string
          public_token?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          paid_at: string | null
          provider: string
          provider_ref: string
          raw: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          provider?: string
          provider_ref: string
          raw?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string
          raw?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          blurhash: string | null
          created_at: string
          height: number | null
          id: string
          position: number
          product_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          blurhash?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          product_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          blurhash?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          product_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          name: string
          position: number
          price_delta: number
          product_id: string
          stock_limit: number | null
          value: string
          volume_cm3: number | null
          weight_grams: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          name: string
          position?: number
          price_delta?: number
          product_id: string
          stock_limit?: number | null
          value: string
          volume_cm3?: number | null
          weight_grams?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          name?: string
          position?: number
          price_delta?: number
          product_id?: string
          stock_limit?: number | null
          value?: string
          volume_cm3?: number | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          drop_id: string
          id: string
          moq: number
          name: string
          position: number
          price: number
          published: boolean
          stock_limit: number | null
          updated_at: string
          volume_cm3: number | null
          weight_grams: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          drop_id: string
          id?: string
          moq?: number
          name: string
          position?: number
          price: number
          published?: boolean
          stock_limit?: number | null
          updated_at?: string
          volume_cm3?: number | null
          weight_grams?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          drop_id?: string
          id?: string
          moq?: number
          name?: string
          position?: number
          price?: number
          published?: boolean
          stock_limit?: number | null
          updated_at?: string
          volume_cm3?: number | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["vendor_role"]
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["vendor_role"]
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["vendor_role"]
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_members_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          business_name: string
          created_at: string
          id: string
          logo_path: string | null
          payout_account_name: string | null
          payout_account_number: string | null
          payout_bank_code: string | null
          payout_channel: string | null
          payout_verified_at: string | null
          paystack_subaccount_code: string | null
          pickup_maps_url: string | null
          slug: string
          support_email: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          business_name: string
          created_at?: string
          id?: string
          logo_path?: string | null
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_bank_code?: string | null
          payout_channel?: string | null
          payout_verified_at?: string | null
          paystack_subaccount_code?: string | null
          pickup_maps_url?: string | null
          slug: string
          support_email?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          logo_path?: string | null
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_bank_code?: string | null
          payout_channel?: string | null
          payout_verified_at?: string | null
          paystack_subaccount_code?: string | null
          pickup_maps_url?: string | null
          slug?: string
          support_email?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      drop_is_public: {
        Args: { p_drop_id: string }
        Returns: boolean
      }
      generate_order_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_batch_member: {
        Args: { p_batch_id: string }
        Returns: boolean
      }
      is_drop_member: {
        Args: { p_drop_id: string }
        Returns: boolean
      }
      is_order_member: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      is_product_member: {
        Args: { p_product_id: string }
        Returns: boolean
      }
      is_vendor_member: {
        Args: { p_vendor_id: string }
        Returns: boolean
      }
      next_order_code: {
        Args: { p_batch_id: string }
        Returns: string
      }
      storage_object_vendor_id: {
        Args: { p_name: string }
        Returns: string
      }
    }
    Enums: {
      batch_status:
        | "scheduled"
        | "open"
        | "closed"
        | "purchasing"
        | "in_transit"
        | "arrived"
        | "freight_invoiced"
        | "settled"
      freight_mode: "air_kg" | "sea_cbm"
      fulfilment_method: "pickup" | "delivery"
      order_status:
        | "pending_payment"
        | "paid"
        | "purchased"
        | "in_transit"
        | "awaiting_freight"
        | "freight_paid"
        | "collected"
        | "cancelled"
      payment_status:
        | "pending"
        | "success"
        | "failed"
        | "abandoned"
        | "refunded"
      payment_type: "goods" | "freight"
      vendor_role: "owner" | "staff"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      batch_status: [
        "scheduled",
        "open",
        "closed",
        "purchasing",
        "in_transit",
        "arrived",
        "freight_invoiced",
        "settled",
      ],
      freight_mode: ["air_kg", "sea_cbm"],
      fulfilment_method: ["pickup", "delivery"],
      order_status: [
        "pending_payment",
        "paid",
        "purchased",
        "in_transit",
        "awaiting_freight",
        "freight_paid",
        "collected",
        "cancelled",
      ],
      payment_status: ["pending", "success", "failed", "abandoned", "refunded"],
      payment_type: ["goods", "freight"],
      vendor_role: ["owner", "staff"],
    },
  },
} as const

