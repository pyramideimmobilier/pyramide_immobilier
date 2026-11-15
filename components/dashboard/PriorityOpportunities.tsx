import Link from "next/link";
import { Zap, UserRound, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ROUTES from "@/constants/routes";

type PriorityItem = { _id: string; referenceCode?: string; label: string; reason?: string; agentName?: string };

export function PriorityOpportunities({ clients, listings }: { clients: PriorityItem[]; listings: PriorityItem[] }) {
  const items = [
    ...clients.map((item) => ({ ...item, type: "CLIENT" as const })),
    ...listings.map((item) => ({ ...item, type: "LISTING" as const })),
  ];
  return <Card className="border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/10">
    <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" />Opportunités Fast Track</CardTitle></CardHeader>
    <CardContent>{items.length === 0 ? <p className="text-sm text-muted-foreground">Aucune opportunité prioritaire active.</p> : <div className="grid gap-3 md:grid-cols-2">{items.map((item) => <Link key={`${item.type}-${item._id}`} href={item.type === "CLIENT" ? ROUTES.CLIENT_DETAIL(item._id) : ROUTES.LISTING_DETAIL_DASHBOARD(item._id)} className="rounded-lg border bg-background p-3 transition-colors hover:border-amber-400">
      <div className="flex items-center gap-2">{item.type === "CLIENT" ? <UserRound className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}<span className="font-medium">{item.label}</span><Badge className="ml-auto bg-amber-500 text-black">Prioritaire</Badge></div>
      {item.reason && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.reason}</p>}
      {item.agentName && <p className="mt-1 text-xs">Responsable : {item.agentName}</p>}
    </Link>)}</div>}</CardContent>
  </Card>;
}
