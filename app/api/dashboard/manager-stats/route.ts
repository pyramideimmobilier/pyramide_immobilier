import { NextRequest, NextResponse } from "next/server";
import { endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subWeeks } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { Types } from "mongoose";
import dbConnect from "@/lib/mongoose";
import { Client, Listing, Negotiation, User, Visit } from "@/models";
import { getUserBySessionEmail } from "@/lib/getUserBySessionEmail";
import { isElevatedRole } from "@/constants/values";

const ZONE = "Africa/Algiers";
type Period = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "custom";

function getRange(period: Period, from?: string | null, to?: string | null) {
  const now = new Date();
  let start = startOfDay(now);
  let end = endOfDay(now);
  if (period === "yesterday") { start = startOfDay(subDays(now, 1)); end = endOfDay(subDays(now, 1)); }
  if (period === "this_week") { start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfDay(now); }
  if (period === "last_week") { const date = subWeeks(now, 1); start = startOfWeek(date, { weekStartsOn: 1 }); end = endOfWeek(date, { weekStartsOn: 1 }); }
  if (period === "this_month") { start = startOfMonth(now); end = endOfDay(now); }
  if (period === "last_month") { const date = subMonths(now, 1); start = startOfMonth(date); end = endOfMonth(date); }
  if (period === "this_year") { start = startOfYear(now); end = endOfYear(now); }
  if (period === "custom" && from && to) { start = startOfDay(new Date(`${from}T00:00:00`)); end = endOfDay(new Date(`${to}T00:00:00`)); }
  return { start: fromZonedTime(start, ZONE), end: fromZonedTime(end, ZONE) };
}

export async function GET(request: NextRequest) {
  const user = await getUserBySessionEmail();
  if (!user.data || !isElevatedRole(user.data.role)) return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 403 });
  await dbConnect();
  const period = (request.nextUrl.searchParams.get("period") || "this_month") as Period;
  const { start, end } = getRange(period, request.nextUrl.searchParams.get("from"), request.nextUrl.searchParams.get("to"));
  const createdAt = { $gte: start, $lte: end };
  const activeClientStages = ["ACTIVE_SEARCH", "FOLLOW_UP", "IN_NEGOTIATION", "CLOSED"];
  const activeListingStages = ["ACTIVE", "UNDER_NEGOTIATION", "CLOSING", "SOLD"];

  const [totalClients, validatedClients, exploitedClients, hotClients, totalVisits, convertedClients, totalListings, validatedListings, exploitedListings, availableListings, fastTrackListings, sourceRows, agents] = await Promise.all([
    Client.countDocuments({ archived: { $ne: true }, createdAt }),
    Client.countDocuments({ archived: { $ne: true }, createdAt, $or: [{ phase1ApprovedAt: { $exists: true } }, { qualificationStatus: { $in: ["QUALIFIED", "WARM", "HOT", "COLD"] } }] }),
    Client.countDocuments({ archived: { $ne: true }, createdAt, pipelineStage: { $in: activeClientStages } }),
    Client.countDocuments({ archived: { $ne: true }, createdAt, $or: [{ qualificationStatus: "HOT" }, { clientTemperature: "HOT" }] }),
    Visit.countDocuments({ status: "COMPLETED", completedAt: createdAt }),
    Negotiation.distinct("client", { status: "DEAL_DONE", closedAt: createdAt }).then((ids) => ids.length),
    Listing.countDocuments({ archived: { $ne: true }, createdAt }),
    Listing.countDocuments({ archived: { $ne: true }, createdAt, isValidated: true }),
    Listing.countDocuments({ archived: { $ne: true }, createdAt, pipelineStatus: { $in: activeListingStages } }),
    Listing.countDocuments({ archived: { $ne: true }, createdAt, status: { $in: ["En Vente", "En Location"] } }),
    Listing.countDocuments({ archived: { $ne: true }, createdAt, isFastTrack: true }),
    Client.aggregate<{ _id: string; leads: number }>([{ $match: { archived: { $ne: true }, createdAt } }, { $group: { _id: "$leadSource", leads: { $sum: 1 } } }, { $sort: { leads: -1 } }]),
    User.find({ role: { $in: ["AGENT", "MANAGER", "ADMIN"] } }).select("_id firstname lastname name role").lean(),
  ]);

  const dealNegotiations = await Negotiation.find({ status: "DEAL_DONE", closedAt: createdAt }).select("client agent").lean<Array<{ client: Types.ObjectId; agent: Types.ObjectId }>>();
  const convertedClientIds = dealNegotiations.map((item) => item.client);
  const convertedSources = convertedClientIds.length ? await Client.aggregate<{ _id: string; conversions: number }>([{ $match: { _id: { $in: convertedClientIds } } }, { $group: { _id: "$leadSource", conversions: { $sum: 1 } } }]) : [];
  const conversionMap = new Map(convertedSources.map((item) => [item._id || "UNKNOWN", item.conversions]));
  const sources = sourceRows.map((item) => ({ source: item._id || "UNKNOWN", leads: item.leads, conversions: conversionMap.get(item._id || "UNKNOWN") || 0 }));

  const agentPerformance = await Promise.all(agents.map(async (raw) => {
    const agent = raw as unknown as { _id: Types.ObjectId; firstname?: string; lastname?: string; name?: string; role: string };
    const agentId = agent._id;
    const [clientsAssigned, clientsExploited, visits, reports, listingsEntered, listingsExploited, transactions] = await Promise.all([
      Client.countDocuments({ assignedAgent: agentId, archived: { $ne: true }, createdAt }),
      Client.countDocuments({ assignedAgent: agentId, archived: { $ne: true }, createdAt, pipelineStage: { $in: activeClientStages } }),
      Visit.countDocuments({ agent: agentId, status: "COMPLETED", completedAt: createdAt }),
      Visit.countDocuments({ agent: agentId, status: "COMPLETED", completedAt: createdAt, clientFeedback: { $exists: true, $ne: "" } }),
      Listing.countDocuments({ agent: agentId, archived: { $ne: true }, createdAt }),
      Listing.countDocuments({ agent: agentId, archived: { $ne: true }, createdAt, pipelineStatus: { $in: activeListingStages } }),
      Negotiation.countDocuments({ agent: agentId, status: "DEAL_DONE", closedAt: createdAt }),
    ]);
    return { id: agentId.toString(), name: [agent.firstname, agent.lastname].filter(Boolean).join(" ") || agent.name || "Agent", role: agent.role, clientsAssigned, clientsExploited, visits, reports, listingsEntered, listingsExploited, transactions };
  }));

  return NextResponse.json({ success: true, data: { range: { start, end }, activity: { totalClients, validatedClients, exploitedClients, hotClients, totalVisits, convertedClients }, listings: { totalListings, validatedListings, exploitedListings, availableListings, fastTrackListings }, sources, agents: agentPerformance } });
}
