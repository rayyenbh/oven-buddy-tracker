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
      operation_cables: {
        Row: {
          couleur: string | null
          created_at: string
          id: string
          operation_id: string
          position: number
          section: string | null
          type: string | null
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          id?: string
          operation_id: string
          position?: number
          section?: string | null
          type?: string | null
        }
        Update: {
          couleur?: string | null
          created_at?: string
          id?: string
          operation_id?: string
          position?: number
          section?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_cables_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          cdc: string | null
          couleur: string | null
          created_at: string
          date_debut: string
          date_fin: string | null
          demandeur: string
          duree_heures: number | null
          ended_at: string | null
          essai: string | null
          heure_debut: string
          heure_fin: string | null
          id: string
          notes: string | null
          oven_id: string
          projet: string | null
          realisateur: string
          section: string | null
          specification: string | null
          status: string
          temperature: number | null
          type: string | null
        }
        Insert: {
          cdc?: string | null
          couleur?: string | null
          created_at?: string
          date_debut: string
          date_fin?: string | null
          demandeur: string
          duree_heures?: number | null
          ended_at?: string | null
          essai?: string | null
          heure_debut: string
          heure_fin?: string | null
          id?: string
          notes?: string | null
          oven_id: string
          projet?: string | null
          realisateur: string
          section?: string | null
          specification?: string | null
          status?: string
          temperature?: number | null
          type?: string | null
        }
        Update: {
          cdc?: string | null
          couleur?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          demandeur?: string
          duree_heures?: number | null
          ended_at?: string | null
          essai?: string | null
          heure_debut?: string
          heure_fin?: string | null
          id?: string
          notes?: string | null
          oven_id?: string
          projet?: string | null
          realisateur?: string
          section?: string | null
          specification?: string | null
          status?: string
          temperature?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_oven_id_fkey"
            columns: ["oven_id"]
            isOneToOne: false
            referencedRelation: "ovens"
            referencedColumns: ["id"]
          },
        ]
      }
      ovens: {
        Row: {
          created_at: string
          id: string
          internal_number: string
          position: number
          serial_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          internal_number: string
          position: number
          serial_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          internal_number?: string
          position?: number
          serial_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          date_debut: string
          date_fin: string
          demandeur: string
          duree_heures: number | null
          heure_debut: string
          heure_fin: string
          id: string
          notes: string | null
          oven_id: string
          projet: string | null
          temperature: number | null
        }
        Insert: {
          created_at?: string
          date_debut: string
          date_fin: string
          demandeur: string
          duree_heures?: number | null
          heure_debut: string
          heure_fin: string
          id?: string
          notes?: string | null
          oven_id: string
          projet?: string | null
          temperature?: number | null
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string
          demandeur?: string
          duree_heures?: number | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          notes?: string | null
          oven_id?: string
          projet?: string | null
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_oven_id_fkey"
            columns: ["oven_id"]
            isOneToOne: false
            referencedRelation: "ovens"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "technicien"
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
      app_role: ["admin", "technicien"],
    },
  },
} as const
