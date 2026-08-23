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
      counties: {
        Row: {
          id: string;
          name: string;
          fips_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          fips_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          fips_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
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
      people: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          normalized_email: string | null;
          phone: string | null;
          normalized_phone: string | null;
          zip_code: string | null;
          county_id: string | null;
          municipality: string | null;
          engagement_stage: Database["public"]["Enums"]["engagement_stage"];
          assigned_staff_user_id: string | null;
          do_not_contact: boolean;
          archived_at: string | null;
          last_activity_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          normalized_email?: string | null;
          phone?: string | null;
          normalized_phone?: string | null;
          zip_code?: string | null;
          county_id?: string | null;
          municipality?: string | null;
          engagement_stage?: Database["public"]["Enums"]["engagement_stage"];
          assigned_staff_user_id?: string | null;
          do_not_contact?: boolean;
          archived_at?: string | null;
          last_activity_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          normalized_email?: string | null;
          phone?: string | null;
          normalized_phone?: string | null;
          zip_code?: string | null;
          county_id?: string | null;
          municipality?: string | null;
          engagement_stage?: Database["public"]["Enums"]["engagement_stage"];
          assigned_staff_user_id?: string | null;
          do_not_contact?: boolean;
          archived_at?: string | null;
          last_activity_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          person_id: string;
          assignee_staff_user_id: string | null;
          queue_scope: Database["public"]["Enums"]["task_queue_scope"] | null;
          queue_county_id: string | null;
          task_type: string;
          due_at: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          status: Database["public"]["Enums"]["task_status"];
          completed_at: string | null;
          created_by_staff_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          assignee_staff_user_id?: string | null;
          queue_scope?: Database["public"]["Enums"]["task_queue_scope"] | null;
          queue_county_id?: string | null;
          task_type: string;
          due_at?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          completed_at?: string | null;
          created_by_staff_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          assignee_staff_user_id?: string | null;
          queue_scope?: Database["public"]["Enums"]["task_queue_scope"] | null;
          queue_county_id?: string | null;
          task_type?: string;
          due_at?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          completed_at?: string | null;
          created_by_staff_user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          person_id: string;
          activity_type: string;
          actor_staff_user_id: string | null;
          occurred_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          person_id: string;
          activity_type: string;
          actor_staff_user_id?: string | null;
          occurred_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          person_id?: string;
          activity_type?: string;
          actor_staff_user_id?: string | null;
          occurred_at?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          id: string;
          slug: string;
          category: string;
          name: string;
          active: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          category: string;
          name: string;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          category?: string;
          name?: string;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      person_sources: {
        Row: {
          id: string;
          person_id: string;
          source_id: string;
          occurred_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          person_id: string;
          source_id: string;
          occurred_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          person_id?: string;
          source_id?: string;
          occurred_at?: string;
          metadata?: Json;
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
      search_people_directory: {
        Args: {
          p_query?: string | null;
          p_county_id?: string | null;
          p_zip_code?: string | null;
          p_engagement_stage?: Database["public"]["Enums"]["engagement_stage"] | null;
          p_relationship_slug?: string | null;
          p_interest_slug?: string | null;
          p_tag_id?: string | null;
          p_organizer_id?: string | null;
          p_source_slug?: string | null;
          p_joined_after?: string | null;
          p_joined_before_exclusive?: string | null;
          p_last_activity_before?: string | null;
          p_has_open_task?: boolean | null;
          p_candidate_interest?: boolean | null;
          p_member_status?: string | null;
          p_limit?: number | null;
          p_offset?: number | null;
        };
        Returns: Array<{
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          zip_code: string | null;
          county_id: string | null;
          county_name: string | null;
          municipality: string | null;
          engagement_stage: Database["public"]["Enums"]["engagement_stage"];
          assigned_staff_user_id: string | null;
          do_not_contact: boolean;
          last_activity_at: string | null;
          created_at: string;
          has_open_task: boolean;
          total_count: number;
        }>;
      };
    };
    Enums: {
      staff_role: "admin" | "state_organizer" | "county_organizer" | "volunteer_staff";
      staff_status: "active" | "disabled";
      engagement_stage: "new" | "follow_up_needed" | "contacted" | "engaged" | "inactive";
      task_priority: "low" | "normal" | "high";
      task_status: "open" | "completed" | "cancelled";
      task_queue_scope: "statewide" | "county";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
