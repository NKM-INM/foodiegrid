// supabase/functions/validate-scan/index.ts
// Deno runtime (Edge Functions)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type Json = Record<string, unknown>;
type Body = { qr_id?: string; sig?: string };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // secret à ajouter (voir étape Sécrets)
    const client = createClient(supabaseUrl, serviceKey);

    // 1) Auth: extraire le token utilisateur (Bear er ...)
    const auth = req.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ error: "No auth token" }, 401);

    const { data: userRes, error: userErr } = await client.auth.getUser(token);
    if (userErr || !userRes.user) return json({ error: "Invalid session" }, 401);
    const user_id = userRes.user.id;

    // 2) Body
    const { qr_id, sig }: Body = await req.json().catch(() => ({}));
    if (!qr_id || !sig) return json({ error: "Missing qr_id or sig" }, 400);

    // 3) Secret HMAC (stocké en base dans public.settings)
    const { data: settings, error: setErr } = await client
      .from("settings")
      .select("qr_hmac_secret")
      .eq("id", 1)
      .single();
    if (setErr || !settings?.qr_hmac_secret) return json({ error: "Server misconfigured" }, 500);
    const secret = settings.qr_hmac_secret as string;

    // 4) Vérifier la signature: expected = hex(HMAC_SHA256(qr_id, secret))
    const expectedSig = await hmacHex(qr_id, secret);
    if (!timingSafeEqual(expectedSig, String(sig))) {
      return json({ error: "Invalid signature" }, 400);
    }

    // 5) QR existe & actif ?
    const { data: qrRow, error: qrErr } = await client
      .from("qr_codes")
      .select("qr_id, status")
      .eq("qr_id", qr_id)
      .single();
    if (qrErr || !qrRow || qrRow.status !== "active") {
      return json({ error: "QR inconnu ou inactif" }, 400);
    }

    // 6) Tirer une anecdote côté serveur (on ne fait pas confiance au client)
    const { data: anData, error: anErr } = await client.rpc("get_random_anecdote");
    if (anErr || !Array.isArray(anData) || anData.length === 0) {
      return json({ error: "Aucune anecdote active" }, 400);
    }
    const anecdote_id = anData[0].anecdote_id as string;

    // 7) (Anti-spam simple) limiter X validations/min par user
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recent, error: recErr } = await client
      .from("read_events")
      .select("read_id", { count: "exact", head: true })
      .gte("read_at", oneMinAgo)
      .eq("user_id", user_id);
    if (recErr) {
      // ne bloque pas- durcit seulement si le select marche
    } else if ((recent?.length ?? 0) > 10) {
      return json({ error: "Rate limited" }, 429);
    }

    // 8) Insérer l'événement (triggers créditent les points)
    const { error: insErr } = await client.from("read_events").insert({
      user_id,
      qr_id,
      anecdote_id,
      qr_sig: sig,
      qr_ts: new Date().toISOString(),
    });
    if (insErr) return json({ error: insErr.message }, 400);

    return json({ ok: true, points: "credited" }, 200);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

// Utils HMAC SHA-256 (hex)
async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  if (A.length !== B.length) return false;
  let out = 0;
  for (let i = 0; i < A.length; i++) out |= A.charCodeAt(i) ^ B.charCodeAt(i);
  return out === 0;
}
