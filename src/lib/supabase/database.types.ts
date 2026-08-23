export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      staff_users: {
        Row: {
          id: string;
          auth_user_id: string;
          display_name: string;
          role: Database["public"]["Enums"]["staff_role"];
          status: Database["public"]["Enums"]["staff_status"];
          invited_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          display_name: string;
          role: Database["public"]["Enums"]["staff_role"];
          status?: Database["public"]["Enums"]["staff_status"];
          invited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          display_name?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          status?: Database["public"]["Enums"]["staff_status"];
          invited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      staff_role: "admin" | "state_organizer" | "county_organizer" | "volunteer_staff";
      staff_status: "active" | "disabled";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
