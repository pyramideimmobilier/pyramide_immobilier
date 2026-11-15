"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLeadSourceLabel } from "@/constants/values";

type ManagerData = {
  activity: Record<string, number>;
  listings: Record<string, number>;
  sources: Array<{ source: string; leads: number; conversions: number }>;
  agents: Array<{ id: string; name: string; role: string; clientsAssigned: number; clientsExploited: number; visits: number; reports: number; listingsEntered: number; listingsExploited: number; transactions: number }>;
};

const activityLabels: Record<string, string> = { totalClients: "Clients enregistrés", validatedClients: "Clients validés", exploitedClients: "Clients exploités", hotClients: "Clients chauds", totalVisits: "Visites effectuées", convertedClients: "Clients convertis" };
const listingLabels: Record<string, string> = { totalListings: "Biens entrés", validatedListings: "Biens validés", exploitedListings: "Biens exploités", availableListings: "Biens disponibles", fastTrackListings: "Biens à fort potentiel" };

export function ManagerAnalytics() {
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (period === "custom" && (!from || !to)) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ period });
    if (period === "custom") { query.set("from", from); query.set("to", to); }
    setLoading(true);
    fetch(`/api/dashboard/manager-stats?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => { if (result.success) setData(result.data); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [period, from, to]);

  return <section className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Pilotage commercial détaillé</h2><p className="text-sm text-muted-foreground">Les indicateurs utilisent la période sélectionnée et s’actualisent automatiquement.</p></div><div className="flex flex-wrap gap-2"><Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Aujourd’hui</SelectItem><SelectItem value="yesterday">Hier</SelectItem><SelectItem value="this_week">Cette semaine</SelectItem><SelectItem value="last_week">Semaine précédente</SelectItem><SelectItem value="this_month">Ce mois-ci</SelectItem><SelectItem value="last_month">Mois précédent</SelectItem><SelectItem value="this_year">Cette année</SelectItem><SelectItem value="custom">Période personnalisée</SelectItem></SelectContent></Select>{period === "custom" && <><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-auto" /><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-auto" /></>}</div></div>
    {loading && !data ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : data && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{Object.entries(data.activity).map(([key, value]) => <Card key={key}><CardContent className="p-4"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{activityLabels[key] || key}</p></CardContent></Card>)}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(data.listings).map(([key, value]) => <Card key={key}><CardContent className="p-4"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{listingLabels[key] || key}</p></CardContent></Card>)}</div>
      <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Sources des leads</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Source</th><th>Prospects</th><th>Conversions</th><th>Taux</th></tr></thead><tbody>{data.sources.map((source) => <tr key={source.source} className="border-b"><td className="py-2">{getLeadSourceLabel(source.source)}</td><td>{source.leads}</td><td>{source.conversions}</td><td>{source.leads ? Math.round(source.conversions / source.leads * 100) : 0}%</td></tr>)}</tbody></table></CardContent></Card>
      <Card><CardHeader><CardTitle>Performance individuelle</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="min-w-[850px] w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Agent</th><th>Clients</th><th>Expl.</th><th>Visites</th><th>CR</th><th>Biens</th><th>Expl.</th><th>Transactions</th></tr></thead><tbody>{data.agents.map((agent) => <tr key={agent.id} className="border-b"><td className="py-2 font-medium">{agent.name}</td><td>{agent.clientsAssigned}</td><td>{agent.clientsExploited}</td><td>{agent.visits}</td><td>{agent.reports}</td><td>{agent.listingsEntered}</td><td>{agent.listingsExploited}</td><td>{agent.transactions}</td></tr>)}</tbody></table></CardContent></Card></div>
    </>}
  </section>;
}
