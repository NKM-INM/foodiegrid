// app/scan/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Anecdote = { anecdote_id: string; text: string; category: string; progression: number };

export default function ScanPage() {
  const params = useSearchParams();
  const router = useRouter();
  const qr = params.get("qr");

  const [anecdote, setAnecdote] = useState<Anecdote | null>(null);
  const [status, setStatus] = useState("");
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    async function load() {
      // Option A: RPC (recommandé)
      const { data, error } = await supabase.rpc("get_random_anecdote");
      if (error) { setStatus("Erreur chargement anecdote"); return; }
      if (data && Array.isArray(data) && data.length > 0) {
        setAnecdote(data[0] as Anecdote);
      } else {
        setStatus("Aucune anecdote active trouvée");
      }

      // Option B (fallback rapide si la RPC n’existe pas) :
      // const { data: rows, error: err } = await supabase
      //   .from("anecdotes")
      //   .select("anecdote_id,text,category,progression")
      //   .eq("is_active", true)
      //   .limit(1);
      // if (!err && rows && rows.length > 0) setAnecdote(rows[0] as Anecdote);
    }
    load();
  }, [qr]);

  async function validateRead() {
    if (!session) { router.push(`/login?qr=${encodeURIComponent(qr || "")}`); return; }
    if (!anecdote) return;
    const user_id = session.user.id;
    const qr_id = String(qr || "");
    const { error } = await supabase.from("read_events").insert({
      user_id, qr_id, anecdote_id: anecdote.anecdote_id});
    if (error) {
      if (String(error.message).includes("duplicate key")) setStatus("Déjà validée ✔️");
      else setStatus("Erreur validation");
      return;
    }
    setStatus("+5 points ajoutés ✔️");
  }

  return (
    <main style={{maxWidth:720, margin:"2rem auto", padding:"1rem"}}>
      <h1>🎉 Anecdote débloquée</h1>
      <p>QR : <code>{qr || ""}</code></p>

      {anecdote ? (
        <>
          <blockquote style={{fontSize:"1.1rem"}}>{anecdote.text}</blockquote>
          <p><em>{anecdote.category} · niveau {anecdote.progression}</em></p>
        </>
      ) : <p>{status || "Chargement…"}</p>}

      <hr />
      <p>{session ? "Connecté : valide ta lecture pour gagner des points." : "Lecture libre. Connecte-toi pour gagner des points."}</p>
      <button onClick={validateRead} disabled={!anecdote}>Valider ma lecture (+5 pts)</button>
      <p style={{marginTop:12}}>{status}</p>
    </main>
  );
}
