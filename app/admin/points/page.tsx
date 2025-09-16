"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, PostgrestSingleResponse } from "@supabase/supabase-js";

/**
 * Mini page admin pour le suivi des points attribués (Yummy / FoodieGrid)
 *
 * 📌 Installation côté projet
 * - Next.js 13+ (App Router ou Pages Router). Ce composant peut être placé en `app/admin/points/page.tsx`.
 * - Tailwind CSS (facultatif mais recommandé). Les classes sont déjà prêtes.
 * - Variables d'env requises (côté client) :
 *    NEXT_PUBLIC_SUPABASE_URL
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 🔐 Sécurité (RLS)
 * - Assurez-vous que les RLS Policies n'autorisent la lecture de la table qu'aux admins.
 *   Ex: créer un rôle logique "admin" (custom claim) ou une table `profiles` avec champ is_admin=true.
 * - Cette page est un client component : AUCUNE clé service ne doit être exposée ici.
 *
 * 🗄️ Schéma attendu (à adapter si besoin)
 * Table `point_events` (exemple minimal) :
 *   id uuid pk default gen_random_uuid()
 *   user_id uuid not null
 *   user_email text
 *   type text check in ('earn','redeem') not null
 *   amount integer not null  -- positif pour earn, positif pour redeem (on soustrait côté UI)
 *   source text              -- 'qr','anecdote','defi','manuel', etc.
 *   ref_id uuid              -- lien vers l'objet source
 *   metadata jsonb           -- infos libres
 *   created_at timestamptz   default now()
 *
 * ⚡ Temps réel
 * - Activez Realtime sur la table `point_events` dans Supabase si vous souhaitez le live update.
 */

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

type PointEvent = {
  id: string;
  user_id: string;
  user_email: string | null;
  type: "earn" | "redeem" | string;
  amount: number;
  source: string | null;
  ref_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

// ────────────────────────────────────────────────────────────────────────────────
// Supabase client (navigateur)
// ────────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ────────────────────────────────────────────────────────────────────────────────
// Utils
// ────────────────────────────────────────────────────────────────────────────────

function fmtDate(d: string | Date) {
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return String(d);
  }
}

function downloadCSV(filename: string, rows: object[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: any) =>
    typeof val === "string"
      ? `"${val.replace(/"/g, '""')}"`
      : typeof val === "object" && val !== null
      ? `"${JSON.stringify(val).replace(/"/g, '""')}"`
      : String(val ?? "");
  const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ────────────────────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────────────────────

export default function AdminPointsPage() {
  // Filtres
  const [query, setQuery] = useState(""); // recherche email / user_id / ref_id / source
  const [typeFilter, setTypeFilter] = useState<"all" | "earn" | "redeem">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [rows, setRows] = useState<PointEvent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [live, setLive] = useState<boolean>(true);

  const mounted = useRef(false);

  // Lecture
  const fetchRows = async () => {
    setLoading(true);
    setError("");

    try {
      let q = supabase
        .from("point_events")
        .select("id, created_at, user_id, user_email, type, amount, source, ref_id, metadata", { count: "exact" })
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        q = q.eq("type", typeFilter);
      }

      if (dateFrom) {
        // inclure toute la journée de début
        q = q.gte("created_at", new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        // inclure la fin de journée
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }

      if (query.trim()) {
        const term = query.trim();
        // On fait plusieurs filtres ; côté PostgREST on ne peut pas grouper OR facilement
        // donc on commence simple : email ilike, source ilike, sinon égalité sur user_id/ref_id
        q = q.or(
          `user_email.ilike.%${term}%,source.ilike.%${term}%,user_id.eq.${term},ref_id.eq.${term}`
        );
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, error: e, count } = (await q) as PostgrestSingleResponse<PointEvent[]> & { count: number | null };
      if (e) throw e;
      setRows(data ?? []);
      setTotalCount(count ?? 0);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch + on filters change
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, typeFilter, dateFrom, dateTo, page, pageSize]);

  // Realtime
  useEffect(() => {
    if (!live) return;
    if (!mounted.current) mounted.current = true;

    const channel = supabase
      .channel("realtime-point-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "point_events" },
        () => {
          // Recharger la page courante
          fetchRows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  // Agrégats rapides (sur la page courante)
  const { sumEarn, sumRedeem, net } = useMemo(() => {
    const earn = rows.filter((r) => r.type === "earn").reduce((acc, r) => acc + (r.amount || 0), 0);
    const redeem = rows.filter((r) => r.type === "redeem").reduce((acc, r) => acc + (r.amount || 0), 0);
    return { sumEarn: earn, sumRedeem: redeem, net: earn - redeem };
  }, [rows]);

  // Classe utilitaire
  const badge = (t: string) =>
    t === "earn"
      ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
      : t === "redeem"
      ? "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
      : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800";

  // Export CSV
  const exportCsv = () => {
    const flat = rows.map((r) => ({
      id: r.id,
      date: r.created_at,
      user_id: r.user_id,
      user_email: r.user_email ?? "",
      type: r.type,
      amount: r.amount,
      source: r.source ?? "",
      ref_id: r.ref_id ?? "",
      metadata: r.metadata ?? {},
    }));
    downloadCSV(`points_page_${page + 1}.csv`, flat);
  };

  // Top utilisateurs (sur la page courante, à titre indicatif)
  const topUsers = useMemo(() => {
    const map = new Map<string, { email: string; earn: number; redeem: number }>();
    for (const r of rows) {
      const key = r.user_email || r.user_id;
      if (!map.has(key)) map.set(key, { email: r.user_email || r.user_id, earn: 0, redeem: 0 });
      const obj = map.get(key)!;
      if (r.type === "earn") obj.earn += r.amount || 0;
      if (r.type === "redeem") obj.redeem += r.amount || 0;
    }
    return Array.from(map.values())
      .map((u) => ({ ...u, net: u.earn - u.redeem }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 5);
  }, [rows]);

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Suivi des points</h1>
            <p className="text-sm text-slate-600">Mini page admin – points attribués / utilisés • Realtime, filtres, export CSV</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={live} onChange={(e) => setLive(e.target.checked)} />
              Live
            </label>
            <button
              onClick={fetchRows}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow hover:bg-slate-800"
            >
              Actualiser
            </button>
            <button
              onClick={exportCsv}
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Export CSV (page)
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid gap-3 rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Recherche</label>
            <input
              value={query}
              onChange={(e) => {
                setPage(0);
                setQuery(e.target.value);
              }}
              placeholder="email, user_id, ref_id, source..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setPage(0);
                setTypeFilter(e.target.value as any);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              <option value="earn">Gagnés</option>
              <option value="redeem">Utilisés</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setPage(0);
                setDateFrom(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setPage(0);
                setDateTo(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Page</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => canPrev && setPage((p) => Math.max(0, p - 1))}
                className="rounded-xl bg-white px-3 py-2 text-sm shadow ring-1 ring-slate-200 disabled:opacity-50"
                disabled={!canPrev}
              >
                ◀
              </button>
              <span className="text-sm text-slate-700">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => canNext && setPage((p) => p + 1)}
                className="rounded-xl bg-white px-3 py-2 text-sm shadow ring-1 ring-slate-200 disabled:opacity-50"
                disabled={!canNext}
              >
                ▶
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Éléments par page</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(0);
                setPageSize(Number(e.target.value));
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* KPI */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
            <div className="text-xs uppercase text-slate-500">Points gagnés (page)</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-700">+{sumEarn}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
            <div className="text-xs uppercase text-slate-500">Points utilisés (page)</div>
            <div className="mt-1 text-2xl font-semibold text-rose-700">-{sumRedeem}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
            <div className="text-xs uppercase text-slate-500">Net (page)</div>
            <div className={`mt-1 text-2xl font-semibold ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{net >= 0 ? "+" : ""}{net}</div>
          </div>
        </div>

        {/* Top utilisateurs (page courante) */}
        <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Top utilisateurs (sur la page courante)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Utilisateur</th>
                  <th className="px-3 py-2">Gagnés</th>
                  <th className="px-3 py-2">Utilisés</th>
                  <th className="px-3 py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      Aucun résultat.
                    </td>
                  </tr>
                )}
                {topUsers.map((u) => (
                  <tr key={u.email} className="border-t">
                    <td className="px-3 py-2 font-medium text-slate-800">{u.email}</td>
                    <td className="px-3 py-2 text-emerald-700">+{u.earn}</td>
                    <td className="px-3 py-2 text-rose-700">-{u.redeem}</td>
                    <td className={`px-3 py-2 font-semibold ${u.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{u.net >= 0 ? "+" : ""}{u.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200">
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white/90 backdrop-blur text-left text-slate-600 shadow">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Utilisateur</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Ref</th>
                  <th className="px-3 py-2">Meta</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Chargement...</td>
                  </tr>
                )}
                {error && !loading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-rose-600">{error}</td>
                  </tr>
                )}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Aucun évènement de points trouvé.</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{r.user_email || r.user_id}</div>
                      <div className="text-[11px] text-slate-500">{r.user_email ? r.user_id : ""}</div>
                    </td>
                    <td className="px-3 py-2"><span className={badge(r.type)}>{r.type}</span></td>
                    <td className="px-3 py-2 font-semibold">
                      {r.type === "redeem" ? <span className="text-rose-700">-{r.amount}</span> : <span className="text-emerald-700">+{r.amount}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.source || "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-500">{r.ref_id || "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-500 max-w-[22rem] truncate" title={JSON.stringify(r.metadata ?? {})}>
                      {r.metadata ? JSON.stringify(r.metadata) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer pagination */}
          <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <div>
              {totalCount} évènement{totalCount > 1 ? "s" : ""} • Page {page + 1}/{totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => canPrev && setPage((p) => Math.max(0, p - 1))}
                className="rounded-xl bg-white px-3 py-1.5 shadow ring-1 ring-slate-200 disabled:opacity-50"
                disabled={!canPrev}
              >
                Précédent
              </button>
              <button
                onClick={() => canNext && setPage((p) => p + 1)}
                className="rounded-xl bg-white px-3 py-1.5 shadow ring-1 ring-slate-200 disabled:opacity-50"
                disabled={!canNext}
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        {/* Astuces & SQL d'exemple (commentaires) */}
        <div className="prose prose-sm max-w-none text-slate-700">
          <h3>Notes rapides</h3>
          <ul>
            <li>Pour une vue globale (tous résultats), créez une <em>view</em> ou utilisez des fonctions SQL pour agréger côté serveur.</li>
            <li>Si vous devez masquer des emails, retournez un champ <code>display_name</code> via une view sécurisée.</li>
            <li>Vous pouvez protéger l'accès via un middleware, ou une route <code>/api/admin/points</code> (server-only) si vous préférez.</li>
          </ul>
          <details>
            <summary>Exemple de policy (à adapter)</summary>
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-slate-100"><code>{`-- Exemple: autoriser lecture aux admins uniquement
-- suppose une table public.profiles(user_id uuid primary key, is_admin boolean)
create policy "read point_events for admins" on public.point_events
for select to authenticated using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin
  )
);
`}</code></pre>
          </details>
        </div>
      </div>
    </div>
  );
}
