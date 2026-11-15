import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Client, FollowUp } from "@/models";
import { notify } from "@/lib/notifications/notify";
import ROUTES from "@/constants/routes";
import { Types } from "mongoose";

const INITIAL_DELAY_HOURS = 48;
const REPEAT_DELAY_HOURS = 72;
const AUTO_TITLE = "Relance automatique - client injoignable";

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const now = new Date();
  const clients = await Client.find({
    qualificationStatus: "NO_RESPONSE",
    archived: { $ne: true },
  }).select("_id firstName lastName referenceCode assignedAgent createdBy").lean<Array<{
    _id: Types.ObjectId;
    firstName?: string;
    lastName?: string;
    referenceCode: string;
    assignedAgent?: Types.ObjectId;
    createdBy: Types.ObjectId;
  }>>();

  let scheduled = 0;
  for (const client of clients) {
    const latest = await FollowUp.findOne({ client: client._id, title: AUTO_TITLE })
      .sort({ createdAt: -1 })
      .lean<{ _id: Types.ObjectId; status?: string; reminderAt?: Date }>();

    if (latest?.status === "PENDING" && latest.reminderAt && latest.reminderAt > now) continue;
    if (latest?.status === "PENDING") {
      await FollowUp.findByIdAndUpdate(latest._id, { status: "OVERDUE" });
    }

    const agentId = (client.assignedAgent ?? client.createdBy)?.toString();
    if (!agentId) continue;
    const delay = latest ? REPEAT_DELAY_HOURS : INITIAL_DELAY_HOURS;
    const reminderAt = new Date(now.getTime() + delay * 60 * 60 * 1000);
    await FollowUp.create({
      client: client._id,
      agent: agentId,
      type: "CUSTOM",
      context: "CLIENT",
      title: AUTO_TITLE,
      note: `Tentative automatique reprogrammée après ${delay} heures.`,
      reminderAt,
      channel: "CALL",
      status: "PENDING",
    });
    const name = [client.firstName, client.lastName].filter(Boolean).join(" ") || client.referenceCode;
    await notify({
      recipientId: agentId,
      type: "CLIENT_NO_RESPONSE",
      title: "Nouvelle tentative programmée",
      body: `${name} reste injoignable. Une nouvelle relance est prévue dans ${delay} heures.`,
      link: ROUTES.CLIENT_DETAIL(client._id.toString()),
      relatedEntity: { type: "CLIENT", id: client._id.toString() },
    });
    scheduled += 1;
  }

  return NextResponse.json({ success: true, scheduled });
}
