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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action_type: string
          changed_at: string
          changed_by_role: Database["public"]["Enums"]["app_role"] | null
          changed_by_user_id: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          person_id: string | null
        }
        Insert: {
          action_type: string
          changed_at?: string
          changed_by_role?: Database["public"]["Enums"]["app_role"] | null
          changed_by_user_id?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          person_id?: string | null
        }
        Update: {
          action_type?: string
          changed_at?: string
          changed_by_role?: Database["public"]["Enums"]["app_role"] | null
          changed_by_user_id?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_flags: {
        Row: {
          confidence: string
          created_at: string
          existing_person_id: string
          id: string
          match_reasons: string[]
          new_person_id: string
          resolution: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          confidence?: string
          created_at?: string
          existing_person_id: string
          id?: string
          match_reasons?: string[]
          new_person_id: string
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string
          existing_person_id?: string
          id?: string
          match_reasons?: string[]
          new_person_id?: string
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_flags_existing_person_id_fkey"
            columns: ["existing_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_flags_new_person_id_fkey"
            columns: ["new_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address_detail: string | null
          category: Database["public"]["Enums"]["establishment_category"]
          created_at: string
          created_by: string | null
          email: string | null
          employee_count: number | null
          established_date: string | null
          id: string
          license_number: string | null
          manager_name: string | null
          name: string
          notes: string | null
          owner_name: string | null
          primary_phone: string | null
          registration_no: string
          secondary_phone: string | null
          status: Database["public"]["Enums"]["establishment_status"]
          tin_number: string | null
          updated_at: string
          verification_note: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          woreda_id: string
          zone_id: string | null
        }
        Insert: {
          address_detail?: string | null
          category?: Database["public"]["Enums"]["establishment_category"]
          created_at?: string
          created_by?: string | null
          email?: string | null
          employee_count?: number | null
          established_date?: string | null
          id?: string
          license_number?: string | null
          manager_name?: string | null
          name: string
          notes?: string | null
          owner_name?: string | null
          primary_phone?: string | null
          registration_no: string
          secondary_phone?: string | null
          status?: Database["public"]["Enums"]["establishment_status"]
          tin_number?: string | null
          updated_at?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          woreda_id: string
          zone_id?: string | null
        }
        Update: {
          address_detail?: string | null
          category?: Database["public"]["Enums"]["establishment_category"]
          created_at?: string
          created_by?: string | null
          email?: string | null
          employee_count?: number | null
          established_date?: string | null
          id?: string
          license_number?: string | null
          manager_name?: string | null
          name?: string
          notes?: string | null
          owner_name?: string | null
          primary_phone?: string | null
          registration_no?: string
          secondary_phone?: string | null
          status?: Database["public"]["Enums"]["establishment_status"]
          tin_number?: string | null
          updated_at?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          woreda_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishments_woreda_id_fkey"
            columns: ["woreda_id"]
            isOneToOne: false
            referencedRelation: "woredas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address_detail: string | null
          created_at: string
          created_by: string | null
          head_person_id: string | null
          household_code: string
          id: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          address_detail?: string | null
          created_at?: string
          created_by?: string | null
          head_person_id?: string | null
          household_code: string
          id?: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          address_detail?: string | null
          created_at?: string
          created_by?: string | null
          head_person_id?: string | null
          household_code?: string
          id?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_head_person_id_fkey"
            columns: ["head_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      life_events: {
        Row: {
          created_at: string
          event_date: string | null
          event_type: Database["public"]["Enums"]["life_event_type"]
          id: string
          notes: string | null
          person_id: string
          recorded_by: string | null
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          event_type: Database["public"]["Enums"]["life_event_type"]
          id?: string
          notes?: string | null
          person_id: string
          recorded_by?: string | null
        }
        Update: {
          created_at?: string
          event_date?: string | null
          event_type?: Database["public"]["Enums"]["life_event_type"]
          id?: string
          notes?: string | null
          person_id?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "life_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          address_detail: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          duplicate_of: string | null
          education_level: string | null
          employment_status: string | null
          fan_number: string | null
          fin_number: string | null
          full_name: string
          guardian_full_name: string | null
          guardian_id: string | null
          guardian_primary_phone: string | null
          guardian_secondary_phone: string | null
          has_national_id: boolean
          household_id: string | null
          id: string
          is_stub: boolean
          marital_status: string | null
          nationality_status:
            | Database["public"]["Enums"]["nationality_status"]
            | null
          notes: string | null
          occupation: string | null
          pension_status: string | null
          phone_unreachable: boolean
          primary_phone: string | null
          registration_no: string
          relationship_to_head: string | null
          religion: string | null
          secondary_phone: string | null
          sex: Database["public"]["Enums"]["sex_type"] | null
          source: string
          status: Database["public"]["Enums"]["person_status"]
          updated_at: string
          verification_note: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          zone_id: string
        }
        Insert: {
          address_detail?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          duplicate_of?: string | null
          education_level?: string | null
          employment_status?: string | null
          fan_number?: string | null
          fin_number?: string | null
          full_name: string
          guardian_full_name?: string | null
          guardian_id?: string | null
          guardian_primary_phone?: string | null
          guardian_secondary_phone?: string | null
          has_national_id?: boolean
          household_id?: string | null
          id?: string
          is_stub?: boolean
          marital_status?: string | null
          nationality_status?:
            | Database["public"]["Enums"]["nationality_status"]
            | null
          notes?: string | null
          occupation?: string | null
          pension_status?: string | null
          phone_unreachable?: boolean
          primary_phone?: string | null
          registration_no: string
          relationship_to_head?: string | null
          religion?: string | null
          secondary_phone?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          source?: string
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          zone_id: string
        }
        Update: {
          address_detail?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          duplicate_of?: string | null
          education_level?: string | null
          employment_status?: string | null
          fan_number?: string | null
          fin_number?: string | null
          full_name?: string
          guardian_full_name?: string | null
          guardian_id?: string | null
          guardian_primary_phone?: string | null
          guardian_secondary_phone?: string | null
          has_national_id?: boolean
          household_id?: string | null
          id?: string
          is_stub?: boolean
          marital_status?: string | null
          nationality_status?:
            | Database["public"]["Enums"]["nationality_status"]
            | null
          notes?: string | null
          occupation?: string | null
          pension_status?: string | null
          phone_unreachable?: boolean
          primary_phone?: string | null
          registration_no?: string
          relationship_to_head?: string | null
          religion?: string | null
          secondary_phone?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          source?: string
          status?: Database["public"]["Enums"]["person_status"]
          updated_at?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persons_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      registration_requests: {
        Row: {
          created_at: string
          created_by: string | null
          person_id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          person_id: string
          request_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          person_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          disabled_at: string | null
          disabled_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          woreda_id: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          woreda_id?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          woreda_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_woreda_id_fkey"
            columns: ["woreda_id"]
            isOneToOne: false
            referencedRelation: "woredas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      woredas: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          created_at: string
          id: string
          name: string
          woreda_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          woreda_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          woreda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_woreda_id_fkey"
            columns: ["woreda_id"]
            isOneToOne: false
            referencedRelation: "woredas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_woreda: { Args: { _woreda_id: string }; Returns: boolean }
      can_access_zone: { Args: { _zone_id: string }; Returns: boolean }
      can_edit: { Args: { _zone_id: string }; Returns: boolean }
      can_edit_woreda: { Args: { _woreda_id: string }; Returns: boolean }
      can_register: { Args: { _zone_id: string }; Returns: boolean }
      find_duplicate_candidates: {
        Args: {
          _dob: string
          _fan: string
          _fin: string
          _full_name: string
          _household_id: string
          _person_id: string
          _phone1: string
          _phone2: string
          _zone_id: string
        }
        Returns: {
          confidence: string
          person_id: string
          reasons: string[]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_residents: { Args: { rows_in: Json }; Returns: Json }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] }
      my_woreda_id: { Args: never; Returns: string }
      my_zone_id: { Args: never; Returns: string }
      norm_name: { Args: { _t: string }; Returns: string }
      norm_phone: { Args: { _t: string }; Returns: string }
      register_resident: { Args: { payload: Json }; Returns: Json }
      registry_overview: { Args: never; Returns: Json }
      search_residents: {
        Args: {
          _household_id?: string
          _limit?: number
          _offset?: number
          _q?: string
          _sex?: string
          _status?: string
          _verification?: string
          _woreda_id?: string
          _zone_id?: string
        }
        Returns: {
          created_at: string
          date_of_birth: string
          duplicate_of: string
          full_name: string
          has_national_id: boolean
          household_code: string
          id: string
          is_stub: boolean
          primary_phone: string
          registration_no: string
          sex: string
          status: string
          total_count: number
          verification_status: string
          woreda_name: string
          zone_id: string
          zone_name: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "subcity_admin" | "woreda_admin" | "zone_account"
      establishment_category:
        | "company"
        | "government"
        | "religious"
        | "school"
        | "health"
        | "shop"
        | "mall"
        | "ngo"
        | "bank"
        | "hotel"
        | "factory"
        | "restaurant"
        | "market"
        | "transport"
        | "other"
      establishment_status: "active" | "closed" | "relocated" | "suspended"
      life_event_type: "birth" | "marriage" | "death" | "relocation" | "divorce"
      nationality_status: "citizen" | "foreign_resident" | "other"
      person_status: "active" | "deceased" | "relocated"
      sex_type: "male" | "female"
      verification_status: "registered" | "verified" | "needs_correction"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["subcity_admin", "woreda_admin", "zone_account"],
      establishment_category: [
        "company",
        "government",
        "religious",
        "school",
        "health",
        "shop",
        "mall",
        "ngo",
        "bank",
        "hotel",
        "factory",
        "restaurant",
        "market",
        "transport",
        "other",
      ],
      establishment_status: ["active", "closed", "relocated", "suspended"],
      life_event_type: ["birth", "marriage", "death", "relocation", "divorce"],
      nationality_status: ["citizen", "foreign_resident", "other"],
      person_status: ["active", "deceased", "relocated"],
      sex_type: ["male", "female"],
      verification_status: ["registered", "verified", "needs_correction"],
    },
  },
} as const
