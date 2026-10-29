import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI manquant");
await mongoose.connect(process.env.MONGODB_URI);
const clients = mongoose.connection.collection("clients");
const [brokers, individuals] = await Promise.all([
  clients.updateMany({ type: "INTERMEDIARY" }, { $set: { profileKind: "BROKER" } }),
  clients.updateMany({ type: { $ne: "INTERMEDIARY" }, profileKind: { $exists: false } }, { $set: { profileKind: "INDIVIDUAL" } }),
]);
console.log(`Courtiers migrés: ${brokers.modifiedCount}; particuliers migrés: ${individuals.modifiedCount}`);
await mongoose.disconnect();
