"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { Client, Listing } from "@/models";
import dbConnect from "@/lib/mongoose";
import { getUserBySessionEmail } from "@/lib/getUserBySessionEmail";
import { notify, notifyManagers } from "@/lib/notifications/notify";
import ROUTES from "@/constants/routes";

export async function setFastTrack(entityType: "CLIENT" | "LISTING", entityId: string, enabled: boolean, reason?: string): Promise<ActionResponse> {
  const user = await getUserBySessionEmail();
  if (!user.data?._id) return { success: false, status: 401, error: { message: "Non autorisé" } };
  if (!Types.ObjectId.isValid(entityId)) return { success: false, status: 400, error: { message: "Identifiant invalide" } };
  if (enabled && (!reason || reason.trim().length < 5)) return { success: false, status: 400, error: { message: "Précisez le potentiel commercial (5 caractères minimum)" } };

  await dbConnect();
  const Model = entityType === "CLIENT" ? Client : Listing;
  const entity = await Model.findByIdAndUpdate(entityId, enabled
    ? { $set: { isFastTrack: true, fastTrackReason: reason?.trim(), fastTrackAt: new Date(), fastTrackBy: user.data._id } }
    : { $set: { isFastTrack: false }, $unset: { fastTrackReason: "", fastTrackAt: "", fastTrackBy: "" } },
  { new: true }).lean();
  if (!entity) return { success: false, status: 404, error: { message: "Élément introuvable" } };

  const record = entity as unknown as { assignedAgent?: Types.ObjectId; createdBy?: Types.ObjectId; agent?: Types.ObjectId; firstName?: string; lastName?: string; referenceCode?: string; title?: string };
  if (enabled) {
    const responsibleId = (entityType === "CLIENT" ? record.assignedAgent ?? record.createdBy : record.agent)?.toString();
    const label = entityType === "CLIENT" ? [record.firstName, record.lastName].filter(Boolean).join(" ") || record.referenceCode || "Client" : record.referenceCode || record.title || "Bien";
    const link = entityType === "CLIENT" ? ROUTES.CLIENT_DETAIL(entityId) : ROUTES.LISTING_DETAIL_DASHBOARD(entityId);
    const notification = { type: entityType === "CLIENT" ? "FAST_TRACK_CLIENT" as const : "FAST_TRACK_LISTING" as const, title: entityType === "CLIENT" ? "Client Fast Track" : "Bien Fast Track", body: `${label} a été signalé comme opportunité prioritaire : ${reason?.trim()}`, link, relatedEntity: { type: entityType, id: entityId } };
    if (responsibleId && responsibleId !== user.data._id.toString()) await notify({ recipientId: responsibleId, ...notification });
    await notifyManagers(notification);
  }

  revalidatePath("/dashboard");
  revalidatePath(entityType === "CLIENT" ? ROUTES.CLIENT_DETAIL(entityId) : ROUTES.LISTING_DETAIL_DASHBOARD(entityId));
  return { success: true, status: 200 };
}
