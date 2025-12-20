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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          auto_create_lead: boolean | null
          id: string
          min_claim_probability: number | null
          min_severity: number | null
          nightly_export: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_create_lead?: boolean | null
          id?: string
          min_claim_probability?: number | null
          min_severity?: number | null
          nightly_export?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_create_lead?: boolean | null
          id?: string
          min_claim_probability?: number | null
          min_severity?: number | null
          nightly_export?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      loss_events: {
        Row: {
          claim_probability: number | null
          created_at: string | null
          event_timestamp: string
          event_type: string
          id: string
          income_band: string | null
          lat: number | null
          lng: number | null
          priority_score: number | null
          property_type: string | null
          severity: number
          status: string
          updated_at: string | null
          zip: string
        }
        Insert: {
          claim_probability?: number | null
          created_at?: string | null
          event_timestamp: string
          event_type: string
          id?: string
          income_band?: string | null
          lat?: number | null
          lng?: number | null
          priority_score?: number | null
          property_type?: string | null
          severity: number
          status?: string
          updated_at?: string | null
          zip: string
        }
        Update: {
          claim_probability?: number | null
          created_at?: string | null
          event_timestamp?: string
          event_type?: string
          id?: string
          income_band?: string | null
          lat?: number | null
          lng?: number | null
          priority_score?: number | null
          property_type?: string | null
          severity?: number
          status?: string
          updated_at?: string | null
          zip?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          created_at: string | null
          id: string
          property_type: string | null
          recommended_actions: string[] | null
          risk_tags: string[] | null
          roof_age: string | null
          timeline: Json | null
          updated_at: string | null
          zip: string
          zip_income_band: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          property_type?: string | null
          recommended_actions?: string[] | null
          risk_tags?: string[] | null
          roof_age?: string | null
          timeline?: Json | null
          updated_at?: string | null
          zip: string
          zip_income_band?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          property_type?: string | null
          recommended_actions?: string[] | null
          risk_tags?: string[] | null
          roof_age?: string | null
          timeline?: Json | null
          updated_at?: string | null
          zip?: string
          zip_income_band?: string | null
        }
        Relationships: []
      }
      property_events: {
        Row: {
          created_at: string | null
          id: string
          loss_event_id: string | null
          property_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          loss_event_id?: string | null
          property_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          loss_event_id?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_events_loss_event_id_fkey"
            columns: ["loss_event_id"]
            isOneToOne: false
            referencedRelation: "loss_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_queue: {
        Row: {
          assigned_to: string | null
          assignee_type: string | null
          created_at: string | null
          id: string
          loss_event_id: string | null
          notes: string | null
          priority: string | null
          property_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          assignee_type?: string | null
          created_at?: string | null
          id?: string
          loss_event_id?: string | null
          notes?: string | null
          priority?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          assignee_type?: string | null
          created_at?: string | null
          id?: string
          loss_event_id?: string | null
          notes?: string | null
          priority?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_queue_loss_event_id_fkey"
            columns: ["loss_event_id"]
            isOneToOne: false
            referencedRelation: "loss_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_queue_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
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
    Enums: {},
  },
} as const

// Type aliases for convenience
export type LossEvent = Database['public']['Tables']['loss_events']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyEvent = Database['public']['Tables']['property_events']['Row']
export type RoutingQueueEntry = Database['public']['Tables']['routing_queue']['Row']
export type AdminSettings = Database['public']['Tables']['admin_settings']['Row']
export type TimelineEntry = {
  timestamp: string
  action: string
  user?: string
  details?: string
}
export type TablesUpdate<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update']