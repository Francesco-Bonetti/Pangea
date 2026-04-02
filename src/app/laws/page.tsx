"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import CategoryTree from "@/components/CategoryTree";
import { ArrowLeft, Scale, Loader2 } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  created_by: string;
}

interface Law {
  id: string;
  title: string;
  content: string;
  status: "closed" | "repealed";
  category_id: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

export default function LawsPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profile) {
          setUser(profile);
        }

        // Load categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        // Load closed and repealed proposals (these are "laws")
        const { data: lawsData, error: lawsError } = await supabase
          .from("proposals")
          .select("*")
          .in("status", ["closed", "repealed"])
          .order("created_at", { ascending: false });

        if (lawsError) throw lawsError;
        setLaws(lawsData || []);
      } catch (err) {
        console.error("Error loading laws data:", err);
        setError("Errore nel caricamento del catalogo leggi.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCreateSubcategory = async (
    parentCategoryId: string,
    name: string
  ) => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: newCategory, error } = await supabase
        .from("categories")
        .insert([
          {
            name,
            description: "",
            parent_id: parentCategoryId,
            created_by: authUser.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, newCategory]);
    } catch (err) {
      console.error("Error creating subcategory:", err);
      setError("Errore nella creazione della sottocategoria.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} userName={user?.full_name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla Piazza
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-8 h-8 text-pangea-400" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-white">Catalogo Leggi</h1>
          </div>
          <p className="text-slate-400">
            Esplora il catalogo delle leggi deliberate e abrogate della
            Repubblica Democratica Globale Pangea.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 card p-4 bg-red-900/20 border-red-700/50">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-pangea-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Caricamento catalogo leggi...</p>
            </div>
          </div>
        ) : (
          <div className="card p-6">
            {categories.length === 0 && laws.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  Catalogo vuoto
                </h3>
                <p className="text-slate-500">
                  Non sono ancora state deliberate leggi sulla piattaforma.
                </p>
              </div>
            ) : (
              <CategoryTree
                categories={categories}
                laws={laws}
                onCreateSubcategory={handleCreateSubcategory}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
