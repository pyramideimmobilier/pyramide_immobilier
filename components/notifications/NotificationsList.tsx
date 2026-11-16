"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notification.action";
import { cn } from "@/lib/utils";
import { INotification } from "@/models/notification.model";

export function NotificationsList({
  initialNotifications,
  unreadCount,
}: {
  initialNotifications: INotification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);

  async function markOne(id: string) {
    const notification = notifications.find((item) => item._id?.toString() === id);
    if (!notification || notification.read) return;

    setNotifications((current) =>
      current.map((item) =>
        item._id?.toString() === id ? { ...item, read: true } : item
      )
    );
    const result = await markNotificationRead(id);
    if (!result.success) {
      setNotifications((current) =>
        current.map((item) =>
          item._id?.toString() === id ? { ...item, read: false } : item
        )
      );
      toast.error("Impossible de marquer la notification comme lue");
    }
  }

  async function markAll() {
    setMarkingAll(true);
    const result = await markAllNotificationsRead();
    setMarkingAll(false);

    if (!result.success) {
      toast.error("Impossible de marquer les notifications comme lues");
      return;
    }

    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    toast.success("Toutes les notifications ont été marquées comme lues");
    router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 text-center">
        <Inbox className="mb-3 size-10 text-muted-foreground/60" />
        <p className="font-medium">Aucune notification</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos nouvelles notifications apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="size-4" />
          {unreadCount > 0
            ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
            : "Tout est à jour"}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAll} disabled={markingAll}>
            <CheckCheck className="size-4" />
            <span className="hidden sm:inline">Tout marquer comme lu</span>
            <span className="sm:hidden">Tout lire</span>
          </Button>
        )}
      </div>
      <Separator />
      <div>
        {notifications.map((notification, index) => {
          const id = notification._id?.toString() ?? "";
          const content = (
            <div
              className={cn(
                "flex gap-3 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-6",
                !notification.read && "bg-primary/5"
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  notification.read ? "bg-transparent" : "bg-primary"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <p className={cn("text-sm", !notification.read && "font-semibold")}>
                    {notification.title}
                  </p>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </time>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {notification.body}
                </p>
              </div>
            </div>
          );

          return (
            <div key={id || index}>
              {notification.link ? (
                <Link href={notification.link} onClick={() => id && markOne(id)}>
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => id && markOne(id)}
                >
                  {content}
                </button>
              )}
              {index < notifications.length - 1 && <Separator />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
