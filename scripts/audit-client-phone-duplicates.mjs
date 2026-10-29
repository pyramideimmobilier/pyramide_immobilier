import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI manquant");

const normalize = (phone) => {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) digits = `213${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
};

await mongoose.connect(uri);
const clients = await mongoose.connection.collection("clients")
  .find({}, { projection: { referenceCode: 1, firstName: 1, lastName: 1, phone: 1, phone2: 1, archived: 1 } })
  .toArray();
const byPhone = new Map();
for (const client of clients) {
  for (const key of new Set([normalize(client.phone), normalize(client.phone2)].filter(Boolean))) {
    const group = byPhone.get(key) ?? [];
    group.push(client);
    byPhone.set(key, group);
  }
}
const duplicates = [...byPhone.entries()].filter(([, group]) => group.length > 1);
for (const [phone, group] of duplicates) {
  console.log(`\n${phone} (${group.length} contacts)`);
  for (const client of group) console.log(`  ${client.referenceCode} | ${client.firstName ?? ""} ${client.lastName ?? ""} | ${client.archived ? "archivé" : "actif"}`);
}
console.log(`\n${duplicates.length} numéro(s) dupliqué(s). Aucun changement effectué.`);
await mongoose.disconnect();
process.exitCode = duplicates.length ? 2 : 0;
