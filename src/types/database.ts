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
      admin_users: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          email: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          id: number
          new_row: Json | null
          occurred_at: string
          old_row: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          id?: never
          new_row?: Json | null
          occurred_at?: string
          old_row?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          id?: never
          new_row?: Json | null
          occurred_at?: string
          old_row?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          categoria: string | null
          codigo: string
          codigo_normalizado: string
          created_at: string
          created_by: string | null
          descritivo: string | null
          id: string
          linha_origem: number | null
          observacoes: string | null
          quantidade: number | null
          sort_order: number
          unidade: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          cart_id: string
          categoria?: string | null
          codigo: string
          codigo_normalizado: string
          created_at?: string
          created_by?: string | null
          descritivo?: string | null
          id: string
          linha_origem?: number | null
          observacoes?: string | null
          quantidade?: number | null
          sort_order?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          cart_id?: string
          categoria?: string | null
          codigo?: string
          codigo_normalizado?: string
          created_at?: string
          created_by?: string | null
          descritivo?: string | null
          id?: string
          linha_origem?: number | null
          observacoes?: string | null
          quantidade?: number | null
          sort_order?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "luminaire_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          aliases: string[]
          arquivo_origem: string | null
          bombona: string
          codigo: string
          codigo_normalizado: string
          codigo_original: string | null
          created_at: string
          created_by: string | null
          descritivo: string | null
          duplicate_override: boolean
          endereco: string
          endereco_original: string | null
          grupo: string | null
          id: string
          observacoes: string | null
          quantidade: number | null
          registro_tipo: string | null
          rua: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          aliases?: string[]
          arquivo_origem?: string | null
          bombona: string
          codigo: string
          codigo_normalizado: string
          codigo_original?: string | null
          created_at?: string
          created_by?: string | null
          descritivo?: string | null
          duplicate_override?: boolean
          endereco: string
          endereco_original?: string | null
          grupo?: string | null
          id?: string
          observacoes?: string | null
          quantidade?: number | null
          registro_tipo?: string | null
          rua?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          aliases?: string[]
          arquivo_origem?: string | null
          bombona?: string
          codigo?: string
          codigo_normalizado?: string
          codigo_original?: string | null
          created_at?: string
          created_by?: string | null
          descritivo?: string | null
          duplicate_override?: boolean
          endereco?: string
          endereco_original?: string | null
          grupo?: string | null
          id?: string
          observacoes?: string | null
          quantidade?: number | null
          registro_tipo?: string | null
          rua?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      luminaire_carts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nome: string
          sort_order: number
          source_sheet: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id: string
          nome: string
          sort_order?: number
          source_sheet: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          sort_order?: number
          source_sheet?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
