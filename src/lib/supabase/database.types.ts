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
        Row: { id: string; name: string; fips_code: string; created_at: string };
        Insert: { id?: string; name: string; fips_code: string; created_at?: string };
        Update: { id?: string; name?: string; fips_code?: string; created_at?: string };
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
      staff_counties: {
        Row: { staff_user_id: string; county_id: string; created_at: string };
        Insert: { staff_user_id: string; county_id: string; created_at?: string };
        Update: { staff_user_id?: string; county_id?: string; created_at?: string };
        Relationships: [];
      };
      staff_person_assignments: {
        Row: { staff_user_id: string; person_id: string; created_at: string };
        Insert: { staff_user_id: string; person_id: string; created_at?: string };
        Update: { staff_user_id?: string; person_id?: string; created_at?: string };
        Relationships: [];
      };
      supporter_accounts: {
        Row: { id: string; auth_user_id: string; person_id: string; created_at: string };
        Insert: { id?: string; auth_user_id: string; person_id: string; created_at?: string };
        Update: { id?: string; auth_user_id?: string; person_id?: string; created_at?: string };
        Relationships: [];
      };
      admin_audit_events: {
        Row: {
          id: string;
          actor_staff_user_id: string;
          action_type: string;
          target_type: string;
          target_id: string | null;
          metadata: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          actor_staff_user_id: string;
          action_type: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          actor_staff_user_id?: string;
          action_type?: string;
          target_type?: string;
          target_id?: string | null;
          metadata?: Json;
          occurred_at?: string;
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
          merged_into_person_id: string | null;
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
          merged_into_person_id?: string | null;
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
          merged_into_person_id?: string | null;
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
      crm_events: {
        Row: { id: string; title: string; description: string | null; location: string | null; starts_at: string; ends_at: string | null; created_by_staff_user_id: string; created_at: string; visibility: Database["public"]["Enums"]["crm_event_visibility"] };
        Insert: { id?: string; title: string; description?: string | null; location?: string | null; starts_at: string; ends_at?: string | null; created_by_staff_user_id: string; created_at?: string; visibility?: Database["public"]["Enums"]["crm_event_visibility"] };
        Update: { id?: string; title?: string; description?: string | null; location?: string | null; starts_at?: string; ends_at?: string | null; created_by_staff_user_id?: string; created_at?: string; visibility?: Database["public"]["Enums"]["crm_event_visibility"] };
        Relationships: [];
      };
      activities: {
        Row: { id: string; person_id: string; activity_type: string; actor_staff_user_id: string | null; occurred_at: string; metadata: Json };
        Insert: { id?: string; person_id: string; activity_type: string; actor_staff_user_id?: string | null; occurred_at?: string; metadata?: Json };
        Update: { id?: string; person_id?: string; activity_type?: string; actor_staff_user_id?: string | null; occurred_at?: string; metadata?: Json };
        Relationships: [];
      };
      relationship_types: {
        Row: { id: string; slug: string; name: string; active: boolean };
        Insert: { id?: string; slug: string; name: string; active?: boolean };
        Update: { id?: string; slug?: string; name?: string; active?: boolean };
        Relationships: [];
      };
      person_relationships: {
        Row: { person_id: string; relationship_type_id: string; created_at: string };
        Insert: { person_id: string; relationship_type_id: string; created_at?: string };
        Update: { person_id?: string; relationship_type_id?: string; created_at?: string };
        Relationships: [];
      };
      interests: {
        Row: { id: string; slug: string; name: string; active: boolean };
        Insert: { id?: string; slug: string; name: string; active?: boolean };
        Update: { id?: string; slug?: string; name?: string; active?: boolean };
        Relationships: [];
      };
      person_interests: {
        Row: { person_id: string; interest_id: string; created_at: string };
        Insert: { person_id: string; interest_id: string; created_at?: string };
        Update: { person_id?: string; interest_id?: string; created_at?: string };
        Relationships: [];
      };
      tags: {
        Row: { id: string; name: string; active: boolean; created_by_staff_user_id: string | null; created_at: string };
        Insert: { id?: string; name: string; active?: boolean; created_by_staff_user_id?: string | null; created_at?: string };
        Update: { id?: string; name?: string; active?: boolean; created_by_staff_user_id?: string | null; created_at?: string };
        Relationships: [];
      };
      person_tags: {
        Row: { person_id: string; tag_id: string; created_at: string };
        Insert: { person_id: string; tag_id: string; created_at?: string };
        Update: { person_id?: string; tag_id?: string; created_at?: string };
        Relationships: [];
      };
      sources: {
        Row: { id: string; slug: string; category: string; name: string; active: boolean; metadata: Json; created_at: string };
        Insert: { id?: string; slug: string; category: string; name: string; active?: boolean; metadata?: Json; created_at?: string };
        Update: { id?: string; slug?: string; category?: string; name?: string; active?: boolean; metadata?: Json; created_at?: string };
        Relationships: [];
      };
      person_sources: {
        Row: { id: string; person_id: string; source_id: string; occurred_at: string; metadata: Json };
        Insert: { id?: string; person_id: string; source_id: string; occurred_at?: string; metadata?: Json };
        Update: { id?: string; person_id?: string; source_id?: string; occurred_at?: string; metadata?: Json };
        Relationships: [];
      };
      consent_events: {
        Row: {
          id: string;
          person_id: string;
          channel: Database["public"]["Enums"]["consent_channel"];
          state: Database["public"]["Enums"]["consent_state"];
          effective_at: string;
          source_id: string | null;
          actor_staff_user_id: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          person_id: string;
          channel: Database["public"]["Enums"]["consent_channel"];
          state: Database["public"]["Enums"]["consent_state"];
          effective_at?: string;
          source_id?: string | null;
          actor_staff_user_id?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          person_id?: string;
          channel?: Database["public"]["Enums"]["consent_channel"];
          state?: Database["public"]["Enums"]["consent_state"];
          effective_at?: string;
          source_id?: string | null;
          actor_staff_user_id?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      internal_notes: {
        Row: { id: string; person_id: string; author_staff_user_id: string; body: string; created_at: string; edited_at: string | null };
        Insert: { id?: string; person_id: string; author_staff_user_id: string; body: string; created_at?: string; edited_at?: string | null };
        Update: { id?: string; person_id?: string; author_staff_user_id?: string; body?: string; created_at?: string; edited_at?: string | null };
        Relationships: [];
      };
      duplicate_candidates: {
        Row: {
          id: string;
          person_a_id: string;
          person_b_id: string;
          reason: string;
          confidence: number | null;
          status: Database["public"]["Enums"]["duplicate_status"];
          created_at: string;
          reviewed_at: string | null;
          reviewed_by_staff_user_id: string | null;
        };
        Insert: {
          id?: string;
          person_a_id: string;
          person_b_id: string;
          reason: string;
          confidence?: number | null;
          status?: Database["public"]["Enums"]["duplicate_status"];
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by_staff_user_id?: string | null;
        };
        Update: {
          id?: string;
          person_a_id?: string;
          person_b_id?: string;
          reason?: string;
          confidence?: number | null;
          status?: Database["public"]["Enums"]["duplicate_status"];
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by_staff_user_id?: string | null;
        };
        Relationships: [];
      };
      saved_views: {
        Row: {
          id: string;
          staff_user_id: string;
          name: string;
          filters: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_user_id: string;
          name: string;
          filters?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          staff_user_id?: string;
          name?: string;
          filters?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      claim_supporter_account: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_my_supporter_profile: {
        Args: Record<string, never>;
        Returns: Array<{
          person_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          zip_code: string | null;
          county_name: string | null;
          municipality: string | null;
          interests: string[];
          email_opt_in: boolean;
          sms_opt_in: boolean;
          phone_opt_in: boolean;
        }>;
      };
      list_supporter_interests: {
        Args: Record<string, never>;
        Returns: Array<{ slug: string; name: string; selected: boolean }>;
      };
      update_my_supporter_profile: {
        Args: {
          p_first_name: string;
          p_last_name: string;
          p_phone: string | null;
          p_normalized_phone: string | null;
          p_zip_code: string;
          p_county_id: string | null;
          p_municipality: string | null;
          p_interest_slugs: string[];
          p_email_opt_in: boolean;
          p_phone_opt_in: boolean;
        };
        Returns: undefined;
      };
      list_my_upcoming_events: {
        Args: { p_limit?: number | null };
        Returns: Array<{
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          starts_at: string;
          ends_at: string | null;
        }>;
      };
      set_crm_event_visibility: {
        Args: {
          p_event_id: string;
          p_visibility: Database["public"]["Enums"]["crm_event_visibility"];
        };
        Returns: undefined;
      };
      create_crm_event: {
        Args: { p_title: string; p_description?: string | null; p_location?: string | null; p_starts_at: string; p_ends_at?: string | null; p_visibility?: Database["public"]["Enums"]["crm_event_visibility"] };
        Returns: string;
      };
      create_person_task: {
        Args: { p_person_id: string; p_task_type: string; p_due_at: string; p_priority: Database["public"]["Enums"]["task_priority"] };
        Returns: string;
      };
      admin_register_staff_user: {
        Args: {
          p_auth_user_id: string;
          p_display_name: string;
          p_role: Database["public"]["Enums"]["staff_role"];
          p_county_ids?: string[];
        };
        Returns: string;
      };
      admin_update_staff_access: {
        Args: {
          p_staff_user_id: string;
          p_role: Database["public"]["Enums"]["staff_role"];
          p_status: Database["public"]["Enums"]["staff_status"];
          p_county_ids?: string[];
        };
        Returns: undefined;
      };
      manage_interest: {
        Args: {
          p_interest_id: string | null;
          p_name: string;
          p_slug: string;
          p_active: boolean;
        };
        Returns: string;
      };
      manage_tag: {
        Args: {
          p_tag_id: string | null;
          p_name: string;
          p_active: boolean;
        };
        Returns: string;
      };
      manage_source: {
        Args: {
          p_source_id: string | null;
          p_name: string;
          p_slug: string;
          p_category: string;
          p_active: boolean;
        };
        Returns: string;
      };
      resolve_duplicate_candidate: {
        Args: {
          p_candidate_id: string;
          p_resolution: string;
          p_primary_person_id?: string | null;
        };
        Returns: undefined;
      };
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
      consent_channel: "email" | "sms" | "phone";
      consent_state: "opted_in" | "opted_out";
      duplicate_status: "open" | "merged" | "kept_separate";
      crm_event_visibility: "staff" | "supporters" | "public";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
