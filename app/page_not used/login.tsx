// pages/login.tsx
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Envoi du lien magique...");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/scan" : undefined },
    });
    if (error) setStatus("Erreur: " + error.message);
    else setStatus("Vérifie ta boîte mail (lien magique envoyé).");
  }

  return (
    <main style={{maxWidth: 480, margin: "2rem auto", padding: "1rem"}}>
      <h1>Connexion</h1>
      <p>Entre ton email pour recevoir un lien magique.</p>
      <form onSubmit={sendMagicLink}>
        <input
          type="email"
          placeholder="ton@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{width: "100%", padding: "0.75rem", marginBottom: "1rem"}}
        />
        <button type="submit">Recevoir le lien</button>
      </form>
      <p>{status}</p>
    </main>
  );
}
