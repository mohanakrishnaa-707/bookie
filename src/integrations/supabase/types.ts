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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_requests: {
        Row: {
          author: string
          book_name: string
          created_at: string | null
          edition: string
          id: string
          quantity: number
          sheet_id: string | null
          status: string | null
          teacher_id: string | null
          teacher_name: string
          updated_at: string | null
        }
        Insert: {
          author: string
          book_name: string
          created_at?: string | null
          edition: string
          id?: string
          quantity: number
          sheet_id?: string | null
          status?: string | null
          teacher_id?: string | null
          teacher_name: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          book_name?: string
          created_at?: string | null
          edition?: string
          id?: string
          quantity?: number
          sheet_id?: string | null
          status?: string | null
          teacher_id?: string | null
          teacher_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_requests_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "purchase_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_requests_history: {
        Row: {
          author: string
          book_name: string
          created_at: string
          cycle_id: string
          edition: string
          id: string
          original_request_id: string | null
          quantity: number
          status: string | null
          teacher_id: string | null
          teacher_name: string
        }
        Insert: {
          author: string
          book_name: string
          created_at?: string
          cycle_id: string
          edition: string
          id?: string
          original_request_id?: string | null
          quantity: number
          status?: string | null
          teacher_id?: string | null
          teacher_name: string
        }
        Update: {
          author?: string
          book_name?: string
          created_at?: string
          cycle_id?: string
          edition?: string
          id?: string
          original_request_id?: string | null
          quantity?: number
          status?: string | null
          teacher_id?: string | null
          teacher_name?: string
        }
        Relationships: []
      }
      finalized_purchases: {
        Row: {
          book_request_id: string | null
          created_at: string | null
          finalized_by: string | null
          id: string
          price_per_unit: number
          shop_name: string
          total_amount: number
        }
        Insert: {
          book_request_id?: string | null
          created_at?: string | null
          finalized_by?: string | null
          id?: string
          price_per_unit: number
          shop_name: string
          total_amount: number
        }
        Update: {
          book_request_id?: string | null
          created_at?: string | null
          finalized_by?: string | null
          id?: string
          price_per_unit?: number
          shop_name?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "finalized_purchases_book_request_id_fkey"
            columns: ["book_request_id"]
            isOneToOne: false
            referencedRelation: "book_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finalized_purchases_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finalized_purchases_history: {
        Row: {
          author: string
          book_name: string
          created_at: string
          cycle_id: string
          edition: string
          finalized_by: string | null
          id: string
          original_book_request_id: string | null
          original_purchase_id: string | null
          price_per_unit: number
          quantity: number
          shop_name: string
          teacher_name: string
          total_amount: number
        }
        Insert: {
          author: string
          book_name: string
          created_at?: string
          cycle_id: string
          edition: string
          finalized_by?: string | null
          id?: string
          original_book_request_id?: string | null
          original_purchase_id?: string | null
          price_per_unit: number
          quantity: number
          shop_name: string
          teacher_name: string
          total_amount: number
        }
        Update: {
          author?: string
          book_name?: string
          created_at?: string
          cycle_id?: string
          edition?: string
          finalized_by?: string | null
          id?: string
          original_book_request_id?: string | null
          original_purchase_id?: string | null
          price_per_unit?: number
          quantity?: number
          shop_name?: string
          teacher_name?: string
          total_amount?: number
        }
        Relationships: []
      }
      price_comparisons: {
        Row: {
          book_request_id: string | null
          created_at: string | null
          id: string
          is_selected: boolean | null
          price: number
          shop_name: string
        }
        Insert: {
          book_request_id?: string | null
          created_at?: string | null
          id?: string
          is_selected?: boolean | null
          price: number
          shop_name: string
        }
        Update: {
          book_request_id?: string | null
          created_at?: string | null
          id?: string
          is_selected?: boolean | null
          price?: number
          shop_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_comparisons_book_request_id_fkey"
            columns: ["book_request_id"]
            isOneToOne: false
            referencedRelation: "book_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: Database["public"]["Enums"]["department_name"]
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department: Database["public"]["Enums"]["department_name"]
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_name"]
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_history: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          cycle_closed_at: string
          cycle_closed_by: string | null
          cycle_id: string
          department: Database["public"]["Enums"]["department_name"] | null
          id: string
          original_sheet_id: string | null
          sheet_name: string
          status: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          cycle_closed_at?: string
          cycle_closed_by?: string | null
          cycle_id?: string
          department?: Database["public"]["Enums"]["department_name"] | null
          id?: string
          original_sheet_id?: string | null
          sheet_name: string
          status: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          cycle_closed_at?: string
          cycle_closed_by?: string | null
          cycle_id?: string
          department?: Database["public"]["Enums"]["department_name"] | null
          id?: string
          original_sheet_id?: string | null
          sheet_name?: string
          status?: string
        }
        Relationships: []
      }
      purchase_sheets: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          department: Database["public"]["Enums"]["department_name"] | null
          id: string
          sheet_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_name"] | null
          id?: string
          sheet_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_name"] | null
          id?: string
          sheet_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_sheets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          admin_registration_enabled: boolean
          created_at: string
          id: string
          request_deadline: string | null
          teacher_registration_enabled: boolean
          updated_at: string
        }
        Insert: {
          admin_registration_enabled?: boolean
          created_at?: string
          id?: string
          request_deadline?: string | null
          teacher_registration_enabled?: boolean
          updated_at?: string
        }
        Update: {
          admin_registration_enabled?: boolean
          created_at?: string
          id?: string
          request_deadline?: string | null
          teacher_registration_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      teacher_notes: {
        Row: {
          created_at: string | null
          id: string
          note_content: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_content: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          note_content?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_notes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      department_name:
        | "computer_science"
        | "electrical"
        | "mechanical"
        | "civil"
        | "electronics"
        | "information_technology"
        | "biotechnology"
        | "chemical"
        | "automobile_engineering"
        | "civil_engineering"
        | "mechanical_engineering"
        | "electrical_and_electronics_engineering"
        | "electronics_and_communication_engineering"
        | "vlsi"
        | "advanced_communication_technology"
        | "artificial_intelligence_and_data_science"
        | "computer_science_and_engineering"
        | "artificial_intelligence_and_machine_learning"
        | "cse_cybersecurity"
        | "computer_application_mca"
        | "science_and_humanities"
        | "me_applied_electronics"
        | "me_cad_cam"
        | "me_computer_science_and_engineer"
        | "me_communication_systems"
        | "me_structural_engineer"
      user_role: "admin" | "teacher"
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
    Enums: {
      department_name: [
        "computer_science",
        "electrical",
        "mechanical",
        "civil",
        "electronics",
        "information_technology",
        "biotechnology",
        "chemical",
        "automobile_engineering",
        "civil_engineering",
        "mechanical_engineering",
        "electrical_and_electronics_engineering",
        "electronics_and_communication_engineering",
        "vlsi",
        "advanced_communication_technology",
        "artificial_intelligence_and_data_science",
        "computer_science_and_engineering",
        "artificial_intelligence_and_machine_learning",
        "cse_cybersecurity",
        "computer_application_mca",
        "science_and_humanities",
        "me_applied_electronics",
        "me_cad_cam",
        "me_computer_science_and_engineer",
        "me_communication_systems",
        "me_structural_engineer",
      ],
      user_role: ["admin", "teacher"],
    },
  },
} as const
