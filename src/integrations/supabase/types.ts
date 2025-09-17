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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          adresse: string | null
          created_at: string
          id: string
          nom: string
          telephone: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          id?: string
          nom: string
          telephone: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          id?: string
          nom?: string
          telephone?: string
          updated_at?: string
        }
        Relationships: []
      }
      commande_items: {
        Row: {
          commande_id: string
          created_at: string
          id: string
          prix_unitaire: number
          produit_id: string
          quantite: number
          remarque: string | null
        }
        Insert: {
          commande_id: string
          created_at?: string
          id?: string
          prix_unitaire: number
          produit_id: string
          quantite?: number
          remarque?: string | null
        }
        Update: {
          commande_id?: string
          created_at?: string
          id?: string
          prix_unitaire?: number
          produit_id?: string
          quantite?: number
          remarque?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commande_items_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commande_items_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      commandes: {
        Row: {
          caissier_id: string | null
          client_id: string | null
          commerce_principal: Database["public"]["Enums"]["commerce_type"]
          created_at: string
          id: string
          livreur_id: string | null
          mode_paiement: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          numero_commande: string
          pizzaiolo_id: string | null
          statut: Database["public"]["Enums"]["order_status"]
          total: number
          type_commande: Database["public"]["Enums"]["order_type"]
          updated_at: string
        }
        Insert: {
          caissier_id?: string | null
          client_id?: string | null
          commerce_principal: Database["public"]["Enums"]["commerce_type"]
          created_at?: string
          id?: string
          livreur_id?: string | null
          mode_paiement?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          numero_commande: string
          pizzaiolo_id?: string | null
          statut?: Database["public"]["Enums"]["order_status"]
          total: number
          type_commande: Database["public"]["Enums"]["order_type"]
          updated_at?: string
        }
        Update: {
          caissier_id?: string | null
          client_id?: string | null
          commerce_principal?: Database["public"]["Enums"]["commerce_type"]
          created_at?: string
          id?: string
          livreur_id?: string | null
          mode_paiement?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          numero_commande?: string
          pizzaiolo_id?: string | null
          statut?: Database["public"]["Enums"]["order_status"]
          total?: number
          type_commande?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commandes_caissier_id_fkey"
            columns: ["caissier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_livreur_id_fkey"
            columns: ["livreur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_pizzaiolo_id_fkey"
            columns: ["pizzaiolo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          commande_id: string | null
          created_at: string
          id: string
          lu: boolean
          message: string
          titre: string
          user_id: string
        }
        Insert: {
          commande_id?: string | null
          created_at?: string
          id?: string
          lu?: boolean
          message: string
          titre: string
          user_id: string
        }
        Update: {
          commande_id?: string | null
          created_at?: string
          id?: string
          lu?: boolean
          message?: string
          titre?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produits: {
        Row: {
          categorie: Database["public"]["Enums"]["product_category"]
          commerce: Database["public"]["Enums"]["commerce_type"]
          created_at: string
          disponible: boolean
          id: string
          nom: string
          prix: number
          updated_at: string
        }
        Insert: {
          categorie: Database["public"]["Enums"]["product_category"]
          commerce?: Database["public"]["Enums"]["commerce_type"]
          created_at?: string
          disponible?: boolean
          id?: string
          nom: string
          prix: number
          updated_at?: string
        }
        Update: {
          categorie?: Database["public"]["Enums"]["product_category"]
          commerce?: Database["public"]["Enums"]["commerce_type"]
          created_at?: string
          disponible?: boolean
          id?: string
          nom?: string
          prix?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nom: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      determine_commerce_principal: {
        Args: { commande_uuid: string }
        Returns: Database["public"]["Enums"]["commerce_type"]
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      commerce_type: "dolce_italia" | "961_lsf"
      order_status:
        | "nouveau"
        | "en_preparation"
        | "pret"
        | "en_livraison"
        | "livre"
        | "termine"
      order_type: "sur_place" | "a_emporter" | "livraison"
      payment_method: "bancontact" | "visa" | "mastercard" | "cash"
      product_category:
        | "pizzas"
        | "pates"
        | "desserts"
        | "boissons"
        | "entrees"
        | "bowls_salades"
        | "frites"
        | "sandwiches"
      user_role: "caissier" | "pizzaiolo" | "livreur" | "cuisinier"
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
      commerce_type: ["dolce_italia", "961_lsf"],
      order_status: [
        "nouveau",
        "en_preparation",
        "pret",
        "en_livraison",
        "livre",
        "termine",
      ],
      order_type: ["sur_place", "a_emporter", "livraison"],
      payment_method: ["bancontact", "visa", "mastercard", "cash"],
      product_category: [
        "pizzas",
        "pates",
        "desserts",
        "boissons",
        "entrees",
        "bowls_salades",
        "frites",
        "sandwiches",
      ],
      user_role: ["caissier", "pizzaiolo", "livreur", "cuisinier"],
    },
  },
} as const
