// scripts/gen_qr_signed.js
// Usage : QR_SECRET="ton_super_secret" BASE_URL="https://foodiegrid.fr" node scripts/gen_qr_signed.js

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Mets ici les UUID copiés depuis Supabase
const QR_IDS = [
"5006d482-06c3-4ae4-ae2a-bbc00a898a72",
"ffd62abd-1586-4874-92e2-51564851b09f",
"765486c4-616c-423a-8809-4a0d4002d5b5",
"a3f36f3a-2d74-4442-92c9-e1f41a6aa713",
"e6d1c4dd-87fc-4518-9f99-869b7252ff0f",
"41ecadd0-4e0c-4ce1-8ef7-09425e5b71af",
"a4f19e0d-1e4a-497b-bdb5-05f3013e01a0",
"287ad6ab-e093-4d0a-8d5c-3038ae600234",
"2d8e66c2-4661-42f5-ace0-e886f771ef85",
"b363b980-93e9-4862-8e0a-0d9de4666562",
"e748831c-e462-42ac-a79f-78094fcfb9f2",
"2cb2e7c2-7e64-4484-b476-140d95d91d16",
"a573c336-4736-4a25-8601-d4019d336ec4",
"042cae94-aab3-4e02-ab28-deea6be5ebd8",
"06a3ff2c-c659-4a3c-87ae-c84d669aeada",
"d9232df4-0dd3-459e-8de3-ea6a8f89b3ce",
"1529ac74-cad1-449f-b900-58b79e88e804",
"bb4fa3a4-c151-4529-8283-02f441f86d0b",
"c9f1e349-a3cb-4164-9568-5b0856660c26",
"8ace5ab6-3311-493a-81fc-73447949eebb",
"f8f8e4f0-ad63-48df-b730-b578f62193e8",
"69e80d63-0001-4abd-ab70-5c18587ef5ea",
"9f99ef33-1ac5-4e57-8f5a-5561e2a06b26",
"b412c7ce-f528-4871-be15-85ebb33137cd",
"c4366d4a-4d45-4b6c-96a4-10f6586118ae",
"00f9db70-8995-4342-96c3-67e51c5dac9e",
"fd0ee83e-ba81-452e-afd8-3a1a35f28319",
"6f465ba5-6fcd-420a-b50f-7521d2c2c71e",
"de975be8-456b-4ce8-8fe6-9ef14fd54967",
"cab3bdfb-b97c-4add-8147-a4cad0b60a99",
"46e8c364-534a-4eb6-a00b-c3a2521e8ea4",
"4bf1ad0d-8920-4256-b963-36bf6dc8a5fe",
"b27de614-196d-4dd7-b0f6-c05c356a2d07",
"98add621-e47e-4b96-b550-fb544da66979",
"3345eb25-a767-4742-abd0-746c7cf615b4",
"19246275-df30-4573-9e05-f190c674847f",
"4df4a073-a7c1-40f7-b717-f2082529fe91",
"42b0dbb8-2a8f-42b0-868f-19a780e6a78d",
"a4ce2934-e4e6-46cb-ba54-1b9bd4c28a5d",
"871bd611-108c-47f8-b03f-561d79a5d686",
"94dabf27-ec13-487d-b9dc-aa62f5b615b9",
"d37af68c-c60a-4f74-b63c-6cc05ee9c1f5",
"f9c78ce2-31da-434c-9581-89ecfbbbad37",
"4d1612e2-87bd-4ee3-83e1-266195ec2785",
"7d29f00d-8485-4d34-bb04-41c50a446a3a",
"6d90c774-d127-4d0d-ab22-faeddf7bb370",
"1f51e67f-d10b-4d05-a910-b264ee848064",
"7d9694f7-de09-45c1-afc6-e0de8edbdef1",
"5c77d102-8ef6-46c4-954b-1719d6bc39e8",
"66eadec8-35d0-4dd8-99f8-96ba6b3ef1eb",
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
