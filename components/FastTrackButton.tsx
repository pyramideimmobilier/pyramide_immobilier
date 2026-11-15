"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { setFastTrack } from "@/lib/actions/fastTrack.action";

export function FastTrackButton({ entityType, entityId, active = false, initialReason = "" }: { entityType: "CLIENT" | "LISTING"; entityId: string; active?: boolean; initialReason?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(initialReason);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit() {
    setLoading(true);
    const result = await setFastTrack(entityType, entityId, !active, reason);
    setLoading(false);
    if (!result.success) return toast.error("Fast Track", { description: result.error?.message });
    toast.success(active ? "Priorité retirée" : "Opportunité signalée en Fast Track");
    setOpen(false);
    router.refresh();
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant={active ? "default" : "outline"} className={active ? "bg-amber-500 text-black hover:bg-amber-400" : ""}><Zap className="mr-2 h-4 w-4" />{active ? "Fast Track actif" : "Signaler Fast Track"}</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{active ? "Retirer le Fast Track" : "Opportunité Fast Track"}</DialogTitle><DialogDescription>{active ? "Cette opportunité quittera la liste prioritaire." : "Expliquez les éléments vérifiés qui justifient une prise en charge immédiate."}</DialogDescription></DialogHeader>
      {!active && <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={entityType === "CLIENT" ? "Budget vérifié, projet à court terme…" : "Prix attractif, forte demande, propriétaire sérieux…"} />}
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={submit} disabled={loading || (!active && reason.trim().length < 5)}>{loading ? "En cours…" : active ? "Retirer" : "Activer et notifier"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
