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
    Functions: {
      process_get_involved_intake: {
        Args: {
          p_first_name: string;
          p_last_name: string;
          p_email: string | null;
          p_normalized_email: string | null;
          p_phone: string | null;
          p_normalized_phone: string | null;
          p_zip_code: string;
          p_county_name: string | null;
          p_municipality: string | null;
          p_interest_slugs: string[];
          p_email_opt_in: boolean;
          p_phone_opt_in: boolean;
        };
        Returns: string;
      };
    };
    Enums: {
      staff_role: "admin" | "state_organizer" | "county_organizer" | "volunteer_staff";
      staff_status: "active" | "disabled";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
