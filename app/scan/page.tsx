// app/scan/page.tsx
import { Suspense } from "react";
import ScanClient from "./ScanClient";

export default function ScanPage() {
  return (
    <Suspense fallback={<main style={{padding:24}}>Chargement…</main>}>
      <ScanClient />
    </Suspense>
  );
}
