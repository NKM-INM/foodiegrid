// app/login/page.tsx
"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const params = useSearchParams();
  const qr = params.get("qr");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Envoi du lien magique...");
    const redirect = typeof window !== "undefined"
      ? `${window.location.origin}/scan?qr=${encodeURIComponent(qr || "")}`
      : undefined;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect }});
    setStatus(error ? "Erreur: " + error.message : "Vérifie ta boîte mail.");
  }

  return (
    <main style={{maxWidth:480, margin:"2rem auto", padding:"1rem"}}>
      <h1>Connexion</h1>
      <p>Entre ton email pour recevoir un lien magique.</p>
      <form onSubmit={sendMagicLink}>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{width:"100%",padding:"0.75rem",marginBottom:"1rem"}} />
        <button type="submit">Recevoir le lien</button>
      </form>
      <p style={{marginTop:12}}>{status}</p>
    </main>
  );
}
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const params = useSearchParams();
  const qr = params.get("qr");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Envoi du lien magique…");

    const redirect =
      typeof window !== "undefined"
        ? `${window.location.origin}/scan?qr=${encodeURIComponent(qr || "")}`
        : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect },
    });

    setStatus(error ? "Erreur: " + error.message : "Vérifie ta boîte mail.");
  }

  return (
    <main style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem" }}>
      <h1>Connexion</h1>
      <p>Entre ton email pour recevoir un lien magique.</p>
      <form onSubmit={sendMagicLink}>
        <input
          type="email"
          placeholder="ton@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "0.75rem", marginBottom: "1rem" }}
        />
        <button type="submit">Recevoir le lien</button>
      </form>
      <p style={{ marginTop: 12 }}>{status}</p>
    </main>
  );
}
