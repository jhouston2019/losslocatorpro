// Generated types for Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'ops' | 'admin' | 'viewer'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'ops' | 'admin' | 'viewer'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'ops' | 'admin' | 'viewer'
          created_at?: string
        }
      }
      loss_events: {
        Row: {
          id: string
          event_type: 'Hail' | 'Wind' | 'Fire' | 'Freeze'
          severity: number
          event_timestamp: string
          zip: string
          lat: number | null
          lng: number | null
          income_band: string | null
          property_type: string | null
          claim_probability: number | null
          priority_score: number | null
          status: 'Unreviewed' | 'Contacted' | 'Qualified' | 'Converted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_type: 'Hail' | 'Wind' | 'Fire' | 'Freeze'
          severity: number
          event_timestamp: string
          zip: string
          lat?: number | null
          lng?: number | null
          income_band?: string | null
          property_type?: string | null
          claim_probability?: number | null
          priority_score?: number | null
          status?: 'Unreviewed' | 'Contacted' | 'Qualified' | 'Converted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_type?: 'Hail' | 'Wind' | 'Fire' | 'Freeze'
          severity?: number
          event_timestamp?: string
          zip?: string
          lat?: number | null
          lng?: number | null
          income_band?: string | null
          property_type?: string | null
          claim_probability?: number | null
          priority_score?: number | null
          status?: 'Unreviewed' | 'Contacted' | 'Qualified' | 'Converted'
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          address: string
          zip: string
          property_type: string | null
          roof_age: string | null
          zip_income_band: string | null
          risk_tags: string[] | null
          timeline: Json | null
          recommended_actions: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          address: string
          zip: string
          property_type?: string | null
          roof_age?: string | null
          zip_income_band?: string | null
          risk_tags?: string[] | null
          timeline?: Json | null
          recommended_actions?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          address?: string
          zip?: string
          property_type?: string | null
          roof_age?: string | null
          zip_income_band?: string | null
          risk_tags?: string[] | null
          timeline?: Json | null
          recommended_actions?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      property_events: {
        Row: {
          id: string
          property_id: string | null
          loss_event_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          loss_event_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          loss_event_id?: string | null
          created_at?: string
        }
      }
      routing_queue: {
        Row: {
          id: string
          loss_event_id: string | null
          property_id: string | null
          assigned_to: string | null
          assignee_type: 'internal-ops' | 'adjuster-partner' | 'contractor-partner' | null
          priority: 'High' | 'Medium' | 'Low' | null
          notes: string | null
          status: 'Unassigned' | 'Assigned' | 'Contacted' | 'Qualified' | 'Converted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          loss_event_id?: string | null
          property_id?: string | null
          assigned_to?: string | null
          assignee_type?: 'internal-ops' | 'adjuster-partner' | 'contractor-partner' | null
          priority?: 'High' | 'Medium' | 'Low' | null
          notes?: string | null
          status?: 'Unassigned' | 'Assigned' | 'Contacted' | 'Qualified' | 'Converted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          loss_event_id?: string | null
          property_id?: string | null
          assigned_to?: string | null
          assignee_type?: 'internal-ops' | 'adjuster-partner' | 'contractor-partner' | null
          priority?: 'High' | 'Medium' | 'Low' | null
          notes?: string | null
          status?: 'Unassigned' | 'Assigned' | 'Contacted' | 'Qualified' | 'Converted'
          created_at?: string
          updated_at?: string
        }
      }
      admin_settings: {
        Row: {
          id: string
          min_severity: number | null
          min_claim_probability: number | null
          auto_create_lead: boolean | null
          nightly_export: boolean | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          min_severity?: number | null
          min_claim_probability?: number | null
          auto_create_lead?: boolean | null
          nightly_export?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          min_severity?: number | null
          min_claim_probability?: number | null
          auto_create_lead?: boolean | null
          nightly_export?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
      }
    }
  }
}

// Convenience types
export type LossEvent = Database['public']['Tables']['loss_events']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type RoutingQueueEntry = Database['public']['Tables']['routing_queue']['Row']
export type AdminSettings = Database['public']['Tables']['admin_settings']['Row']
export type User = Database['public']['Tables']['users']['Row']

export type TimelineEntry = {
  type: string
  value: string
  date: string
}


