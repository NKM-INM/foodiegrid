
# Mise en place Supabase – QR / Anecdotes / Points (Option Hybride)

## 1) Supabase
- Crée le projet → récupère `SUPABASE_URL` et `ANON_KEY`.
- Dans SQL Editor, exécute `schema_supabase.sql` (tables + RLS + triggers).

## 2) Seed anecdotes
- Dans Table Editor > `anecdotes` > Import CSV → `seed_anecdotes.csv`.

## 3) Next.js (front)
- `npm create next-app@latest` puis copie `pages/scan.tsx` dans `pages/`.
- Ajoute `.env.local` d’après `.env.local.example`.
- `npm i @supabase/supabase-js` puis `npm run dev`.
- L’URL de scan sera: `https://ton-domaine/scan?qr=qr_00001`

## 4) QR codes
- Utilise `generate_qr.py` :
  `python generate_qr.py --base-url "https://tondomaine.fr/scan?qr=" --count 200`

## 5) Test
- Sans compte → l’anecdote s’affiche (pas de points).
- Après login → clique “Valider ma lecture (+5 pts)”.

## 6) Sécurité
- RLS activé: un user ne voit/écrit que ses propres read_events & rewards.
- Unicité: `(user_id, qr_id)` unique dans `read_events`.

## 7) Aller plus loin
- Associer chaque QR à une anecdote fixe (colonne `anecdote_id` dans `qr_codes`).
- Dashboard admin (pages protégées) pour stats, export, blacklist, etc.
