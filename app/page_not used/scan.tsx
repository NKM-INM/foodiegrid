// pages/scan.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

console.log("ENV URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("ENV ANON =", (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").slice(0, 8) + "...");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type Anecdote = { anecdote_id: string; text: string; category: string; progression: number };

export default function Scan() {
  const router = useRouter();
  const { qr } = router.query;
  const [anecdote, setAnecdote] = useState<Anecdote | null>(null);
  const [status, setStatus] = useState<string>("");
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!qr) return;
    async function load() {
      const { data, error } = await supabase.from("anecdotes").select("*").eq("is_active", true).limit(1);
      if (error) { setStatus("Erreur chargement anecdote"); return; }
      if (data && data.length > 0) setAnecdote(data[0] as Anecdote);
    }
    load();
  }, [qr]);

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

useEffect(() => {
  async function testSupabase() {
    // 1) Test simple: ping la table 'anecdotes'
    const { data, error } = await supabase
      .from("anecdotes")
      .select("anecdote_id, text")
      .limit(1);

    if (error) {
      console.error("❌ Supabase error:", error);
    } else {
      console.log("✅ Supabase OK, 1ère anecdote:", data);
    }
  }
  testSupabase();
}, []);

  async function validateRead() {
    if (!session) { setStatus("Connecte-toi pour valider et gagner des points."); return; }
    if (!anecdote) return;
    const user_id = session.user.id;
    const qr_id = String(qr);
    const { error } = await supabase.from("read_events").insert({
      user_id, qr_id, anecdote_id: anecdote.anecdote_id, points_awarded: 5, validated: true,
    });
    if (error) {
      if (String(error.message).includes("duplicate key")) setStatus("Déjà validée pour ce compte ✔️");
      else setStatus("Erreur validation");
      return;
    }
    setStatus("+5 points ajoutés ✔️");
  }

  return (
    <main style={{maxWidth: 720, margin: "2rem auto", padding: "1rem"}}>
      <h1>🎉 Anecdote débloquée</h1>
      <p>QR: <code>{String(qr || "")}</code></p>
      {anecdote ? (
        <>
          <blockquote style={{fontSize: "1.1rem"}}>{anecdote.text}</blockquote>
          <p><em>{anecdote.category} · niveau {anecdote.progression}</em></p>
        </>
      ) : <p>Chargement…</p>}
      <hr />
      <p>{session ? "Connecté. Valide ta lecture pour gagner des points." : "Lecture libre. Crée un compte pour gagner des points."}</p>
      <button onClick={validateRead}>Valider ma lecture (+5 pts)</button>
    </main>
  );
}
