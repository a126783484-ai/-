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
      workspace_member_invites: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          display_name: string;
          phone: string | null;
          role: Database['public']['Enums']['workspace_role'];
          commission_rate: number;
          specialties: string[];
          token: string;
          status: 'pending' | 'accepted' | 'revoked';
          invited_by: string | null;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          display_name: string;
          phone?: string | null;
          role?: Database['public']['Enums']['workspace_role'];
          commission_rate?: number;
          specialties?: string[];
          token: string;
          status?: 'pending' | 'accepted' | 'revoked';
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          display_name?: string;
          phone?: string | null;
          role?: Database['public']['Enums']['workspace_role'];
          commission_rate?: number;
          specialties?: string[];
          token?: string;
          status?: 'pending' | 'accepted' | 'revoked';
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
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
      service_categories: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          workspace_id: string;
          category_id: string | null;
          name: string;
          price: number;
          duration_min: number;
          description: string | null;
          enabled: boolean;
          is_add_on: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          category_id?: string | null;
          name: string;
          price: number;
          duration_min: number;
          description?: string | null;
          enabled?: boolean;
          is_add_on?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          category_id?: string | null;
          name?: string;
          price?: number;
          duration_min?: number;
          description?: string | null;
          enabled?: boolean;
          is_add_on?: boolean;
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
      appointment_services: {
        Row: {
          appointment_id: string;
          service_id: string;
        };
        Insert: {
          appointment_id: string;
          service_id: string;
        };
        Update: {
          appointment_id?: string;
          service_id?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          workspace_id: string;
          appointment_id: string | null;
          customer_id: string;
          technician_id: string;
          discount: number;
          tip: number;
          paid_amount: number;
          payment_method: Database['public']['Enums']['payment_method'];
          status: Database['public']['Enums']['order_status'];
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          appointment_id?: string | null;
          customer_id: string;
          technician_id: string;
          discount?: number;
          tip?: number;
          paid_amount?: number;
          payment_method?: Database['public']['Enums']['payment_method'];
          status?: Database['public']['Enums']['order_status'];
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          appointment_id?: string | null;
          customer_id?: string;
          technician_id?: string;
          discount?: number;
          tip?: number;
          paid_amount?: number;
          payment_method?: Database['public']['Enums']['payment_method'];
          status?: Database['public']['Enums']['order_status'];
          created_at?: string;
        };
        Relationships: [];
      };
      order_lines: {
        Row: {
          id: string;
          order_id: string;
          service_id: string | null;
          name: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          service_id?: string | null;
          name: string;
          quantity?: number;
          unit_price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          service_id?: string | null;
          name?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          workspace_id: string;
          brand: string | null;
          category: string;
          name: string;
          cost: number;
          retail_price: number;
          quantity: number;
          low_stock_threshold: number;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          brand?: string | null;
          category: string;
          name: string;
          cost?: number;
          retail_price?: number;
          quantity?: number;
          low_stock_threshold?: number;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          brand?: string | null;
          category?: string;
          name?: string;
          cost?: number;
          retail_price?: number;
          quantity?: number;
          low_stock_threshold?: number;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          workspace_id: string;
          item_id: string;
          order_id: string | null;
          movement_type: 'purchase' | 'consume' | 'adjust';
          quantity: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          item_id: string;
          order_id?: string | null;
          movement_type: 'purchase' | 'consume' | 'adjust';
          quantity: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          item_id?: string;
          order_id?: string | null;
          movement_type?: 'purchase' | 'consume' | 'adjust';
          quantity?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      shifts: {
        Row: {
          id: string;
          workspace_id: string;
          staff_id: string;
          shift_date: string;
          start_time: string;
          end_time: string;
          leave: boolean;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          staff_id: string;
          shift_date: string;
          start_time: string;
          end_time: string;
          leave?: boolean;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          staff_id?: string;
          shift_date?: string;
          start_time?: string;
          end_time?: string;
          leave?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      bootstrap_owner_workspace: {
        Args: {
          workspace_name: string;
          owner_display_name?: string | null;
          owner_phone?: string | null;
        };
        Returns: Database['public']['Tables']['workspaces']['Row'];
      };
      accept_workspace_member_invite: {
        Args: {
          invite_token: string;
        };
        Returns: string;
      };
    };
    Enums: {
      workspace_role: 'owner' | 'admin' | 'technician' | 'front_desk' | 'staff';
      appointment_status: 'pending' | 'confirmed' | 'in_service' | 'completed' | 'cancelled' | 'no_show';
      order_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
      payment_method: 'cash' | 'card' | 'transfer' | 'line_pay' | 'other';
    };
    CompositeTypes: Record<string, never>;
  };
};
