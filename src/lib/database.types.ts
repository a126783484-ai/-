export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          brand_color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          brand_color?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          phone: string;
          tier: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          phone: string;
          tier?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          workspace_id: string;
          customer_id: string;
          technician_id: string;
          start_at: string;
          end_at: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          customer_id: string;
          technician_id: string;
          start_at: string;
          end_at: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
    };
  };
}
