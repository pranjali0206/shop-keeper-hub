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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          parent_id: string | null
          sort_order: number
          show_in_nav: boolean
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          parent_id?: string | null
          sort_order?: number
          show_in_nav?: boolean
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          parent_id?: string | null
          sort_order?: number
          show_in_nav?: boolean
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          category_id: string | null
          price: number
          compare_at_price: number | null
          fit: string | null
          fabric: string | null
          color: string | null
          badges: string[]
          is_published: boolean
          is_bestseller: boolean
          created_at: string
          care: string | null
          model_height: string | null
          model_size: string | null
          tags: string[]
          sales_count: number
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string
          category_id?: string | null
          price: number
          compare_at_price?: number | null
          fit?: string | null
          fabric?: string | null
          color?: string | null
          badges?: string[]
          is_published?: boolean
          is_bestseller?: boolean
          created_at?: string
          care?: string | null
          model_height?: string | null
          model_size?: string | null
          tags?: string[]
          sales_count?: number
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          category_id?: string | null
          price?: number
          compare_at_price?: number | null
          fit?: string | null
          fabric?: string | null
          color?: string | null
          badges?: string[]
          is_published?: boolean
          is_bestseller?: boolean
          created_at?: string
          care?: string | null
          model_height?: string | null
          model_size?: string | null
          tags?: string[]
          sales_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt: string
          sort_order: number
          storage_path: string | null
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt?: string
          sort_order?: number
          storage_path?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          alt?: string
          sort_order?: number
          storage_path?: string | null
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
          id: string
          product_id: string
          size: string
          stock: number
        }
        Insert: {
          id?: string
          product_id: string
          size: string
          stock?: number
        }
        Update: {
          id?: string
          product_id?: string
          size?: string
          stock?: number
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
      bundles: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          is_published: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          price: number
          is_published?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          is_published?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: [
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          bundle_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          bundle_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          id: string
          title: string
          image_url: string | null
          cta_label: string
          cta_link: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          image_url?: string | null
          cta_label?: string
          cta_link?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          image_url?: string | null
          cta_label?: string
          cta_link?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
        ]
      }
      banner_hotspots: {
        Row: {
          id: string
          banner_id: string
          product_id: string
          number: number
          x_percent: number
          y_percent: number
        }
        Insert: {
          id?: string
          banner_id: string
          product_id: string
          number: number
          x_percent: number
          y_percent: number
        }
        Update: {
          id?: string
          banner_id?: string
          product_id?: string
          number?: number
          x_percent?: number
          y_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "banner_hotspots_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "banners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banner_hotspots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
        ]
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          line: string
          city: string
          state: string
          pincode: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          phone: string
          line: string
          city: string
          state: string
          pincode: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          line?: string
          city?: string
          state?: string
          pincode?: string
          created_at?: string
        }
        Relationships: [
        ]
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          status: string
          payment_method: string
          payment_status: string
          subtotal: number
          shipping: number
          total: number
          name: string
          phone: string
          address: string
          pincode: string
          created_at: string
          city: string | null
          state: string | null
          client_token: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          user_id?: string | null
          status?: string
          payment_method: string
          payment_status?: string
          subtotal?: number
          shipping?: number
          total?: number
          name: string
          phone: string
          address: string
          pincode: string
          created_at?: string
          city?: string | null
          state?: string | null
          client_token?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          user_id?: string | null
          status?: string
          payment_method?: string
          payment_status?: string
          subtotal?: number
          shipping?: number
          total?: number
          name?: string
          phone?: string
          address?: string
          pincode?: string
          created_at?: string
          city?: string | null
          state?: string | null
          client_token?: string | null
          updated_at?: string
        }
        Relationships: [
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          name: string
          size: string
          qty: number
          unit_price: number
          bundle_id: string | null
          bundle_name: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          name: string
          size: string
          qty: number
          unit_price: number
          bundle_id?: string | null
          bundle_name?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          name?: string
          size?: string
          qty?: number
          unit_price?: number
          bundle_id?: string | null
          bundle_name?: string | null
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
          {
            foreignKeyName: "order_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          user_id?: string
          product_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          product_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          size: string
          qty: number
          bundle_id: string | null
          group_key: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          product_id: string
          size: string
          qty: number
          bundle_id?: string | null
          group_key?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          size?: string
          qty?: number
          bundle_id?: string | null
          group_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          message?: string
          created_at?: string
        }
        Relationships: [
        ]
      }
      store_settings: {
        Row: {
          id: boolean
          shop_name: string
          address: string
          phone: string
          opening_hours: string
          whatsapp: string
          instagram: string
          free_shipping_min: number
          shipping_fee: number
          return_days: number
          announcement_text: string
          hero_headline: string
          cod_enabled: boolean
          hero_subtext: string
          hero_image_url: string | null
          pincode: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          shop_name?: string
          address?: string
          phone?: string
          opening_hours?: string
          whatsapp?: string
          instagram?: string
          free_shipping_min?: number
          shipping_fee?: number
          return_days?: number
          announcement_text?: string
          hero_headline?: string
          cod_enabled?: boolean
          hero_subtext?: string
          hero_image_url?: string | null
          pincode?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          shop_name?: string
          address?: string
          phone?: string
          opening_hours?: string
          whatsapp?: string
          instagram?: string
          free_shipping_min?: number
          shipping_fee?: number
          return_days?: number
          announcement_text?: string
          hero_headline?: string
          cod_enabled?: boolean
          hero_subtext?: string
          hero_image_url?: string | null
          pincode?: string | null
          updated_at?: string
        }
        Relationships: [
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: [
        ]
      }
      staff_invites: {
        Row: {
          id: string
          email: string
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          invited_by?: string | null
          created_at?: string
        }
        Relationships: [
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grant_staff_by_email: {
        Args: { _email: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: {
        Args: { _user_id: string }
        Returns: boolean
      }
      list_staff: {
        Args: never
        Returns: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      place_order: {
        Args: {
          p_city: string
          p_client_token?: string
          p_items: Json
          p_line: string
          p_name: string
          p_payment_method: string
          p_phone: string
          p_pincode: string
          p_save_address?: boolean
          p_state: string
        }
        Returns: {
          order_id: string
          order_number: string
        }[]
      }
      revoke_staff: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "staff" | "customer"
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
      app_role: ["owner", "staff", "customer"],
    },
  },
} as const
