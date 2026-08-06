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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_chat_logs: {
        Row: {
          context_enabled: boolean
          created_at: string
          id: string
          model_used: string
          prompt: string
          response: string | null
          source: string
          user_id: string
        }
        Insert: {
          context_enabled?: boolean
          created_at?: string
          id?: string
          model_used: string
          prompt: string
          response?: string | null
          source?: string
          user_id: string
        }
        Update: {
          context_enabled?: boolean
          created_at?: string
          id?: string
          model_used?: string
          prompt?: string
          response?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          account_masked_number: string | null
          bank_name: string | null
          connected_at: string
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          account_masked_number?: string | null
          bank_name?: string | null
          connected_at?: string
          id?: string
          provider: string
          user_id: string
        }
        Update: {
          account_masked_number?: string | null
          bank_name?: string | null
          connected_at?: string
          id?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_feeds: {
        Row: {
          created_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      code_files: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_imports: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          kind: string
          rows_imported: number
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          kind: string
          rows_imported?: number
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          kind?: string
          rows_imported?: number
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      diet_plans: {
        Row: {
          calorie_target: number
          carbs_target: number
          created_at: string
          explanation: string | null
          fat_target: number
          guidelines_json: Json
          id: string
          is_active: boolean
          protein_target: number
          user_id: string
        }
        Insert: {
          calorie_target: number
          carbs_target: number
          created_at?: string
          explanation?: string | null
          fat_target: number
          guidelines_json?: Json
          id?: string
          is_active?: boolean
          protein_target: number
          user_id: string
        }
        Update: {
          calorie_target?: number
          carbs_target?: number
          created_at?: string
          explanation?: string | null
          fat_target?: number
          guidelines_json?: Json
          id?: string
          is_active?: boolean
          protein_target?: number
          user_id?: string
        }
        Relationships: []
      }
      finance_records: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          note: string | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          source?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          user_id: string
          weekly_plan_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          user_id: string
          weekly_plan_json?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
          weekly_plan_json?: Json
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          habit_name: string
          id: string
          is_complete: boolean
          log_date: string
          user_id: string
        }
        Insert: {
          habit_name: string
          id?: string
          is_complete?: boolean
          log_date?: string
          user_id: string
        }
        Update: {
          habit_name?: string
          id?: string
          is_complete?: boolean
          log_date?: string
          user_id?: string
        }
        Relationships: []
      }
      health_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          log_type: string
          match_rating: number | null
          minutes_played: number | null
          notes: string | null
          position_played: string | null
          sleep_hours: number | null
          source: string
          user_id: string
          workout_duration: number | null
          workout_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          log_type?: string
          match_rating?: number | null
          minutes_played?: number | null
          notes?: string | null
          position_played?: string | null
          sleep_hours?: number | null
          source?: string
          user_id: string
          workout_duration?: number | null
          workout_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          log_type?: string
          match_rating?: number | null
          minutes_played?: number | null
          notes?: string | null
          position_played?: string | null
          sleep_hours?: number | null
          source?: string
          user_id?: string
          workout_duration?: number | null
          workout_type?: string | null
        }
        Relationships: []
      }
      income_records: {
        Row: {
          confidence_score: number | null
          detected_from: string | null
          estimated_monthly_income: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          detected_from?: string | null
          estimated_monthly_income: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          detected_from?: string | null
          estimated_monthly_income?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_photos: {
        Row: {
          created_at: string
          id: string
          nutrition_log_id: string | null
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nutrition_log_id?: string | null
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nutrition_log_id?: string | null
          photo_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_photos_nutrition_log_id_fkey"
            columns: ["nutrition_log_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_logs: {
        Row: {
          id: string
          log_date: string
          mood_rating: number
          user_id: string
        }
        Insert: {
          id?: string
          log_date?: string
          mood_rating: number
          user_id: string
        }
        Update: {
          id?: string
          log_date?: string
          mood_rating?: number
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          calories: number
          carbs_g: number
          fat_g: number
          id: string
          items_json: Json
          logged_at: string
          plan_conflict: string | null
          protein_g: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          fat_g?: number
          id?: string
          items_json?: Json
          logged_at?: string
          plan_conflict?: string | null
          protein_g?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          fat_g?: number
          id?: string
          items_json?: Json
          logged_at?: string
          plan_conflict?: string | null
          protein_g?: number
          user_id?: string
        }
        Relationships: []
      }
      personal_intel_data: {
        Row: {
          id: string
          reflection_answers_json: Json
          user_id: string
          week_date: string
        }
        Insert: {
          id?: string
          reflection_answers_json?: Json
          user_id: string
          week_date?: string
        }
        Update: {
          id?: string
          reflection_answers_json?: Json
          user_id?: string
          week_date?: string
        }
        Relationships: []
      }
      school_checklist: {
        Row: {
          created_at: string
          id: string
          is_complete: boolean
          item_name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_complete?: boolean
          item_name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_complete?: boolean
          item_name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_checklist_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "target_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_profiles: {
        Row: {
          extracurriculars: string | null
          gpa: string | null
          id: string
          intended_major: string | null
          test_scores: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          extracurriculars?: string | null
          gpa?: string | null
          id?: string
          intended_major?: string | null
          test_scores?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          extracurriculars?: string | null
          gpa?: string | null
          id?: string
          intended_major?: string | null
          test_scores?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      target_schools: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          notes: string | null
          school_name: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          school_name: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          school_name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_complete: boolean
          is_priority: boolean
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_complete?: boolean
          is_priority?: boolean
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_complete?: boolean
          is_priority?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          country_code: string | null
          created_at: string
          daily_calorie_target: number | null
          daily_protein_target: number | null
          dream_body_goal: string | null
          email: string | null
          full_name: string | null
          id: string
          primary_goal: string | null
          subscription_active_until: string | null
          subscription_tier: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          daily_calorie_target?: number | null
          daily_protein_target?: number | null
          dream_body_goal?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          primary_goal?: string | null
          subscription_active_until?: string | null
          subscription_tier?: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          daily_calorie_target?: number | null
          daily_protein_target?: number | null
          dream_body_goal?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          primary_goal?: string | null
          subscription_active_until?: string | null
          subscription_tier?: string
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
