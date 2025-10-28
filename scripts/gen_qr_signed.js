// scripts/gen_qr_signed.js
// Usage : QR_SECRET="ton_super_secret" BASE_URL="https://foodiegrid.fr" node scripts/gen_qr_signed.js

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Mets ici les UUID copiés depuis Supabase
const QR_IDS = [
"5edeaee2-7ee3-41cc-ad41-607e4bf6f238",
"c73e8112-82fb-4170-8077-1728778cde7e",
"64486731-36bf-44b0-8fca-8c053554b8f1",
"d2c6b0ca-6450-4f42-a7a8-cfa7eeb132f8",
"ef10b85a-e267-4d38-af1f-5dc33f158cc8",
"adefbb34-6c34-4e6c-a907-b7bd9ee5ddd7",
"0ba5045d-9f3d-40b0-97e7-1a16e42dc5ab",
"acb34027-78bc-40b0-bb8b-6011e675a6df",
"6e6d8808-bc38-4252-9e9d-ae30193bf308",
"8e3ba5a8-c11d-43fc-b66d-0a6adca97d90",
"8e59d076-153b-438d-8de7-fa1f5f3a42d4",
"9a93ca09-8310-41b5-ae63-31b3a1f0e1b6",
"13e00616-432b-4787-8c9f-e21477e14cd5",
"a8ea8061-32f4-42b3-9ad6-807bb0bdb820",
"f6abe11e-6579-4703-bb7f-ca6920620b4d",
"d14db961-53f7-4c36-a2a9-8839b3804f45",
"48f84a54-4109-4e75-8b76-942b6477cc87",
"49619227-be8b-4a55-8881-9dc8829ef7ed",
"20409989-02de-4e86-8ab1-826cfe8e8130",
"f9d079b4-60dc-4bbf-97a8-370d56216805",
  // ... colle les 50 générés
];

const SECRET = process.env.QR_SECRET;
if (!SECRET) {
  console.error("ERROR: set QR_SECRET env var before running.");
  process.exit(1);
}

function hmacHex(qr) {
  return crypto.createHmac("sha256", SECRET).update(qr, "utf8").digest("hex");
}

const base = process.env.BASE_URL || "https://foodiegrid.vercel.app/";

const rows = QR_IDS.map(qr_id => {
  const sig = hmacHex(qr_id);
  const url = `${base}/scan?qr=${encodeURIComponent(qr_id)}&sig=${sig}`;
  return { qr_id, sig, url };
});

console.table(rows);

// Export en CSV
const out = "qr_id,sig,url\n" + rows.map(r => `${r.qr_id},${r.sig},${r.url}`).join("\n");
fs.writeFileSync(path.join(process.cwd(), "qr_signed.csv"), out);
console.log("\n→ Fichier généré: qr_signed.csv");
