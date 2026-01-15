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
          min_income_percentile: number | null
          min_phone_confidence: number | null
          enable_residential_leads: boolean | null
          phone_required_routing: boolean | null
          commercial_only_routing: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_create_lead?: boolean | null
          id?: string
          min_claim_probability?: number | null
          min_severity?: number | null
          nightly_export?: boolean | null
          min_income_percentile?: number | null
          min_phone_confidence?: number | null
          enable_residential_leads?: boolean | null
          phone_required_routing?: boolean | null
          commercial_only_routing?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_create_lead?: boolean | null
          id?: string
          min_claim_probability?: number | null
          min_severity?: number | null
          nightly_export?: boolean | null
          min_income_percentile?: number | null
          min_phone_confidence?: number | null
          enable_residential_leads?: boolean | null
          phone_required_routing?: boolean | null
          commercial_only_routing?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      loss_properties: {
        Row: {
          id: string
          loss_id: string | null
          address: string
          city: string | null
          state_code: string | null
          zip: string | null
          owner_name: string | null
          owner_type: string | null
          mailing_address: string | null
          phone_primary: string | null
          phone_secondary: string | null
          phone_type: string | null
          phone_confidence: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          loss_id?: string | null
          address: string
          city?: string | null
          state_code?: string | null
          zip?: string | null
          owner_name?: string | null
          owner_type?: string | null
          mailing_address?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          phone_type?: string | null
          phone_confidence?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          loss_id?: string | null
          address?: string
          city?: string | null
          state_code?: string | null
          zip?: string | null
          owner_name?: string | null
          owner_type?: string | null
          mailing_address?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          phone_type?: string | null
          phone_confidence?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_properties_loss_id_fkey"
            columns: ["loss_id"]
            isOneToOne: false
            referencedRelation: "loss_events"
            referencedColumns: ["id"]
          }
        ]
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
          state_code: string | null
          property_type: string | null
          is_commercial: boolean | null
          severity: number
          status: string
          updated_at: string | null
          zip: string
          source: string | null
          source_event_id: string | null
          latitude: number | null
          longitude: number | null
          county_fips: string | null
          zip_codes: string[] | null
          geo_resolution_level: string | null
          confidence_level: string | null
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
          state_code?: string | null
          property_type?: string | null
          severity: number
          status?: string
          updated_at?: string | null
          zip: string
          source?: string | null
          source_event_id?: string | null
          latitude?: number | null
          longitude?: number | null
          county_fips?: string | null
          zip_codes?: string[] | null
          geo_resolution_level?: string | null
          confidence_level?: string | null
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
          state_code?: string | null
          property_type?: string | null
          severity?: number
          status?: string
          updated_at?: string | null
          zip?: string
          source?: string | null
          source_event_id?: string | null
          latitude?: number | null
          longitude?: number | null
          county_fips?: string | null
          zip_codes?: string[] | null
          geo_resolution_level?: string | null
          confidence_level?: string | null
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
      zip_demographics: {
        Row: {
          zip: string
          state_code: string
          median_household_income: number | null
          per_capita_income: number | null
          income_percentile: number | null
          population: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          zip: string
          state_code: string
          median_household_income?: number | null
          per_capita_income?: number | null
          income_percentile?: number | null
          population?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          zip?: string
          state_code?: string
          median_household_income?: number | null
          per_capita_income?: number | null
          income_percentile?: number | null
          population?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      loss_signals: {
        Row: {
          id: string
          source_type: string
          source_name: string
          external_id: string | null
          event_type: string
          occurred_at: string
          reported_at: string
          lat: number | null
          lng: number | null
          geometry: Json | null
          address_text: string | null
          city: string | null
          state_code: string | null
          zip: string | null
          severity_raw: number | null
          confidence_raw: number | null
          raw_data: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          source_type: string
          source_name: string
          external_id?: string | null
          event_type: string
          occurred_at: string
          reported_at: string
          lat?: number | null
          lng?: number | null
          geometry?: Json | null
          address_text?: string | null
          city?: string | null
          state_code?: string | null
          zip?: string | null
          severity_raw?: number | null
          confidence_raw?: number | null
          raw_data?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          source_type?: string
          source_name?: string
          external_id?: string | null
          event_type?: string
          occurred_at?: string
          reported_at?: string
          lat?: number | null
          lng?: number | null
          geometry?: Json | null
          address_text?: string | null
          city?: string | null
          state_code?: string | null
          zip?: string | null
          severity_raw?: number | null
          confidence_raw?: number | null
          raw_data?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      loss_clusters: {
        Row: {
          id: string
          event_type: string
          center_lat: number
          center_lng: number
          geometry: Json | null
          address_text: string | null
          city: string | null
          state_code: string | null
          zip: string | null
          time_window_start: string
          time_window_end: string
          confidence_score: number
          verification_status: string
          signal_count: number
          source_types: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_type: string
          center_lat: number
          center_lng: number
          geometry?: Json | null
          address_text?: string | null
          city?: string | null
          state_code?: string | null
          zip?: string | null
          time_window_start: string
          time_window_end: string
          confidence_score: number
          verification_status: string
          signal_count?: number
          source_types?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          center_lat?: number
          center_lng?: number
          geometry?: Json | null
          address_text?: string | null
          city?: string | null
          state_code?: string | null
          zip?: string | null
          time_window_start?: string
          time_window_end?: string
          confidence_score?: number
          verification_status?: string
          signal_count?: number
          source_types?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      loss_cluster_signals: {
        Row: {
          id: string
          cluster_id: string
          signal_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          cluster_id: string
          signal_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          cluster_id?: string
          signal_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_cluster_signals_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "loss_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_cluster_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "loss_signals"
            referencedColumns: ["id"]
          }
        ]
      }
      loss_signal_ingestion_log: {
        Row: {
          id: string
          source_type: string
          source_name: string
          started_at: string
          completed_at: string | null
          status: string
          signals_ingested: number | null
          signals_skipped: number | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          source_type: string
          source_name: string
          started_at: string
          completed_at?: string | null
          status: string
          signals_ingested?: number | null
          signals_skipped?: number | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          source_type?: string
          source_name?: string
          started_at?: string
          completed_at?: string | null
          status?: string
          signals_ingested?: number | null
          signals_skipped?: number | null
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      loss_geo_aggregates: {
        Row: {
          id: string
          event_id: string
          state_code: string
          county_fips: string | null
          zip_code: string
          event_type: string
          severity_score: number
          claim_probability: number
          event_timestamp: string
          confidence_level: string
          source: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          state_code: string
          county_fips?: string | null
          zip_code: string
          event_type: string
          severity_score: number
          claim_probability: number
          event_timestamp: string
          confidence_level: string
          source?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          state_code?: string
          county_fips?: string | null
          zip_code?: string
          event_type?: string
          severity_score?: number
          claim_probability?: number
          event_timestamp?: string
          confidence_level?: string
          source?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_geo_aggregates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "loss_events"
            referencedColumns: ["id"]
          }
        ]
      }
      loss_property_candidates: {
        Row: {
          id: string
          zip_code: string
          county_fips: string | null
          state_code: string | null
          address: string
          city: string | null
          property_type: string | null
          resolution_source: string
          resolution_trigger: string | null
          event_id: string | null
          event_type: string | null
          estimated_claim_probability: number | null
          zip_level_probability: number | null
          property_score_adjustment: number | null
          status: string
          resolved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          zip_code: string
          county_fips?: string | null
          state_code?: string | null
          address: string
          city?: string | null
          property_type?: string | null
          resolution_source: string
          resolution_trigger?: string | null
          event_id?: string | null
          event_type?: string | null
          estimated_claim_probability?: number | null
          zip_level_probability?: number | null
          property_score_adjustment?: number | null
          status?: string
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          zip_code?: string
          county_fips?: string | null
          state_code?: string | null
          address?: string
          city?: string | null
          property_type?: string | null
          resolution_source?: string
          resolution_trigger?: string | null
          event_id?: string | null
          event_type?: string | null
          estimated_claim_probability?: number | null
          zip_level_probability?: number | null
          property_score_adjustment?: number | null
          status?: string
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_property_candidates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "loss_events"
            referencedColumns: ["id"]
          }
        ]
      }
      zip_county_crosswalk: {
        Row: {
          id: string
          zip_code: string
          county_fips: string
          state_code: string
          county_name: string | null
          residential_ratio: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          zip_code: string
          county_fips: string
          state_code: string
          county_name?: string | null
          residential_ratio?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          zip_code?: string
          county_fips?: string
          state_code?: string
          county_name?: string | null
          residential_ratio?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      address_resolution_log: {
        Row: {
          id: string
          zip_code: string
          event_id: string | null
          trigger_type: string
          triggered_by: string | null
          resolution_source: string
          properties_found: number | null
          properties_inserted: number | null
          started_at: string | null
          completed_at: string | null
          status: string
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          zip_code: string
          event_id?: string | null
          trigger_type: string
          triggered_by?: string | null
          resolution_source: string
          properties_found?: number | null
          properties_inserted?: number | null
          started_at?: string | null
          completed_at?: string | null
          status?: string
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          zip_code?: string
          event_id?: string | null
          trigger_type?: string
          triggered_by?: string | null
          resolution_source?: string
          properties_found?: number | null
          properties_inserted?: number | null
          started_at?: string | null
          completed_at?: string | null
          status?: string
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "address_resolution_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "loss_events"
            referencedColumns: ["id"]
          }
        ]
      }
      address_resolution_settings: {
        Row: {
          id: string
          auto_resolve_threshold: number | null
          min_event_count: number | null
          max_properties_per_zip: number | null
          source_priority: Json | null
          enable_auto_resolution: boolean | null
          enable_user_triggered: boolean | null
          enable_downstream_triggered: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          auto_resolve_threshold?: number | null
          min_event_count?: number | null
          max_properties_per_zip?: number | null
          source_priority?: Json | null
          enable_auto_resolution?: boolean | null
          enable_user_triggered?: boolean | null
          enable_downstream_triggered?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          auto_resolve_threshold?: number | null
          min_event_count?: number | null
          max_properties_per_zip?: number | null
          source_priority?: Json | null
          enable_auto_resolution?: boolean | null
          enable_user_triggered?: boolean | null
          enable_downstream_triggered?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
export type LossProperty = Database['public']['Tables']['loss_properties']['Row']
export type ZipDemographic = Database['public']['Tables']['zip_demographics']['Row']
export type LossSignal = Database['public']['Tables']['loss_signals']['Row']
export type LossCluster = Database['public']['Tables']['loss_clusters']['Row']
export type LossClusterSignal = Database['public']['Tables']['loss_cluster_signals']['Row']
export type LossSignalIngestionLog = Database['public']['Tables']['loss_signal_ingestion_log']['Row']
export type LossGeoAggregate = Database['public']['Tables']['loss_geo_aggregates']['Row']
export type LossPropertyCandidate = Database['public']['Tables']['loss_property_candidates']['Row']
export type ZipCountyCrosswalk = Database['public']['Tables']['zip_county_crosswalk']['Row']
export type AddressResolutionLog = Database['public']['Tables']['address_resolution_log']['Row']
export type AddressResolutionSettings = Database['public']['Tables']['address_resolution_settings']['Row']
export type TimelineEntry = {
  date: string
  type: string
  value: string
  timestamp?: string
  action?: string
  user?: string
  details?: string
}