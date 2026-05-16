export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          brand_color: string | null;
          business_hours: Json | null;
          booking_rules: Json | null;
          receipt_settings: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          brand_color?: string | null;
          business_hours?: Json | null;
          booking_rules?: Json | null;
          receipt_settings?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          brand_color?: string | null;
          business_hours?: Json | null;
          booking_rules?: Json | null;
          receipt_settings?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: Database['public']['Enums']['workspace_role'];
          display_name: string;
          phone: string | null;
          active: boolean;
          commission_rate: number;
          specialties: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: Database['public']['Enums']['workspace_role'];
          display_name: string;
          phone?: string | null;
          active?: boolean;
          commission_rate?: number;
          specialties?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['workspace_role'];
          display_name?: string;
          phone?: string | null;
          active?: boolean;
          commission_rate?: number;
          specialties?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          phone: string;
          birthday: string | null;
          line_id: string | null;
          note: string | null;
          preferences: string[];
          cautions: string[];
          tier: string;
          tags: string[];
          last_visit: string | null;
          next_reminder: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          phone: string;
          birthday?: string | null;
          line_id?: string | null;
          note?: string | null;
          preferences?: string[];
          cautions?: string[];
          tier?: string;
          tags?: string[];
          last_visit?: string | null;
          next_reminder?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          phone?: string;
          birthday?: string | null;
          line_id?: string | null;
          note?: string | null;
          preferences?: string[];
          cautions?: string[];
          tier?: string;
          tags?: string[];
          last_visit?: string | null;
          next_reminder?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          workspace_id: string;
          customer_id: string;
          technician_id: string;
          start_at: string;
          end_at: string;
          status: Database['public']['Enums']['appointment_status'];
          source: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          customer_id: string;
          technician_id: string;
          start_at: string;
          end_at: string;
          status?: Database['public']['Enums']['appointment_status'];
          source?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          customer_id?: string;
          technician_id?: string;
          start_at?: string;
          end_at?: string;
          status?: Database['public']['Enums']['appointment_status'];
          source?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      workspace_role: 'owner' | 'admin' | 'technician' | 'front_desk' | 'staff';
      appointment_status: 'pending' | 'confirmed' | 'in_service' | 'completed' | 'cancelled' | 'no_show';
      order_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
      payment_method: 'cash' | 'card' | 'transfer' | 'line_pay' | 'other';
    };
    CompositeTypes: Record<string, never>;
  };
};
