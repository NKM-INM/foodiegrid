// app/layout.tsx
export const metadata = {
  title: "FoodieGrid",
  description: "QR → Anecdotes → Points",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
