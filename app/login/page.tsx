// app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Chargement…</main>}>
      <LoginClient />
    </Suspense>
  );
}
