// lib/supabase.ts


import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🔎 Debug (temporaire) — pas de point à la fin de ligne !
console.log("SUPABASE_URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "SUPABASE_ANON =",
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").slice(0, 8) + "..."
);

// Récup env vars
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(url, anon);

// Garde-fous clairs (évite les erreurs floues type "supabaseUrl is required")
if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
if (!anon) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Client unique
export const supabase = createClient(url, anon);
