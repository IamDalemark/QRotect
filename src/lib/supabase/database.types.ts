export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      administrators: {
        Row: {
          active: boolean;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          user_id: string;
        };
        Update: {
          active?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          draft_revision: number | null;
          id: number;
          publication_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          draft_revision?: number | null;
          id?: never;
          publication_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          draft_revision?: number | null;
          id?: never;
          publication_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_events_publication_id_fkey';
            columns: ['publication_id'];
            isOneToOne: false;
            referencedRelation: 'publications';
            referencedColumns: ['id'];
          },
        ];
      };
      campus_maps: {
        Row: {
          approved: boolean;
          asset_path: string;
          description_en: string;
          description_hil: string;
          draft_id: boolean;
          id: string;
          instructions: NonNullable<Json>;
          reviewed_at: string;
          reviewer_name: string;
          source_url: string;
        };
        ComputedFields: never;
        Insert: {
          approved?: boolean;
          asset_path: string;
          description_en: string;
          description_hil: string;
          draft_id?: boolean;
          id: string;
          instructions: NonNullable<Json>;
          reviewed_at: string;
          reviewer_name: string;
          source_url: string;
        };
        Update: {
          approved?: boolean;
          asset_path?: string;
          description_en?: string;
          description_hil?: string;
          draft_id?: boolean;
          id?: string;
          instructions?: NonNullable<Json>;
          reviewed_at?: string;
          reviewer_name?: string;
          source_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'campus_maps_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: true;
            referencedRelation: 'directory_drafts';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name_en: string;
          name_hil: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          name_en: string;
          name_hil: string;
          sort_order: number;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_hil?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      contact_numbers: {
        Row: {
          channel: string;
          contact_id: string;
          dial_number: string;
          display_number: string;
          extension: string;
          id: string;
          label_en: string;
          label_hil: string;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          channel: string;
          contact_id: string;
          dial_number: string;
          display_number: string;
          extension?: string;
          id: string;
          label_en: string;
          label_hil?: string;
          position: number;
        };
        Update: {
          channel?: string;
          contact_id?: string;
          dial_number?: string;
          display_number?: string;
          extension?: string;
          id?: string;
          label_en?: string;
          label_hil?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_numbers_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      contacts: {
        Row: {
          active: boolean;
          agency: string;
          aliases: string[];
          approved: boolean;
          branch: string;
          category_id: string;
          description_en: string;
          description_hil: string;
          draft_id: boolean;
          hours: string;
          id: string;
          legacy_priority: boolean;
          position: number;
          service_area_id: string;
          source_url: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          agency: string;
          aliases?: string[];
          approved?: boolean;
          branch?: string;
          category_id: string;
          description_en: string;
          description_hil?: string;
          draft_id?: boolean;
          hours?: string;
          id: string;
          legacy_priority?: boolean;
          position: number;
          service_area_id: string;
          source_url?: string;
          verified_at?: string | null;
        };
        Update: {
          active?: boolean;
          agency?: string;
          aliases?: string[];
          approved?: boolean;
          branch?: string;
          category_id?: string;
          description_en?: string;
          description_hil?: string;
          draft_id?: boolean;
          hours?: string;
          id?: string;
          legacy_priority?: boolean;
          position?: number;
          service_area_id?: string;
          source_url?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contacts_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contacts_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: false;
            referencedRelation: 'directory_drafts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contacts_service_area_id_fkey';
            columns: ['service_area_id'];
            isOneToOne: false;
            referencedRelation: 'service_areas';
            referencedColumns: ['id'];
          },
        ];
      };
      directory_drafts: {
        Row: {
          document_published_at: string | null;
          document_version: string;
          id: boolean;
          legacy_test_contact: Json | null;
          quick_calls_defined: boolean;
          revision: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          document_published_at?: string | null;
          document_version?: string;
          id?: boolean;
          legacy_test_contact?: Json | null;
          quick_calls_defined?: boolean;
          revision?: number;
          updated_at?: string;
        };
        Update: {
          document_published_at?: string | null;
          document_version?: string;
          id?: boolean;
          legacy_test_contact?: Json | null;
          quick_calls_defined?: boolean;
          revision?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      guidance: {
        Row: {
          approved: boolean;
          category_id: string;
          draft_id: boolean;
          id: string;
          position: number;
          reviewed_at: string;
          reviewer_name: string;
          source_url: string;
          steps: NonNullable<Json>;
          title_en: string;
          title_hil: string;
        };
        ComputedFields: never;
        Insert: {
          approved?: boolean;
          category_id: string;
          draft_id?: boolean;
          id: string;
          position: number;
          reviewed_at: string;
          reviewer_name: string;
          source_url: string;
          steps: NonNullable<Json>;
          title_en: string;
          title_hil: string;
        };
        Update: {
          approved?: boolean;
          category_id?: string;
          draft_id?: boolean;
          id?: string;
          position?: number;
          reviewed_at?: string;
          reviewer_name?: string;
          source_url?: string;
          steps?: NonNullable<Json>;
          title_en?: string;
          title_hil?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'guidance_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guidance_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: false;
            referencedRelation: 'directory_drafts';
            referencedColumns: ['id'];
          },
        ];
      };
      publications: {
        Row: {
          created_at: string;
          current: boolean;
          id: string;
          published_by: string | null;
          snapshot: NonNullable<Json>;
          source_revision: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          current?: boolean;
          id?: string;
          published_by?: string | null;
          snapshot: NonNullable<Json>;
          source_revision?: number | null;
        };
        Update: {
          created_at?: string;
          current?: boolean;
          id?: string;
          published_by?: string | null;
          snapshot?: NonNullable<Json>;
          source_revision?: number | null;
        };
        Relationships: [];
      };
      quick_call_assignments: {
        Row: {
          category_id: string;
          draft_id: boolean;
          number_id: string;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          draft_id?: boolean;
          number_id: string;
          position: number;
        };
        Update: {
          category_id?: string;
          draft_id?: boolean;
          number_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quick_call_assignments_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: true;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quick_call_assignments_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: false;
            referencedRelation: 'directory_drafts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quick_call_assignments_number_id_fkey';
            columns: ['number_id'];
            isOneToOne: true;
            referencedRelation: 'contact_numbers';
            referencedColumns: ['id'];
          },
        ];
      };
      service_areas: {
        Row: {
          id: string;
          name_en: string;
          name_hil: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          name_en: string;
          name_hil: string;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_hil?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _directory_document: { Args: Record<PropertyKey, never>; Returns: Json };
      _replace_directory_content: { Args: { document: Json }; Returns: undefined };
      get_directory_draft: {
        Args: Record<PropertyKey, never>;
        Returns: {
          payload: Json;
          revision: number;
        }[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      publish_directory: { Args: { expected_revision: number }; Returns: string };
      restore_directory: {
        Args: { expected_revision: number; source_id: string };
        Returns: string;
      };
      save_directory: { Args: { document: Json; expected_revision: number }; Returns: number };
      valid_directory: { Args: { document: Json }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
