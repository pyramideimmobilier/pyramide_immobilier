export const dynamic = "force-dynamic";

import Link from "next/link";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { PaginationControls } from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { fetchMyNotifications } from "@/lib/actions/notification.action";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_PER_PAGE = 20;

type SearchParams = {
  page?: string;
  filter?: string;
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const pageParam = Number(params.page ?? 1);
  const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const unreadOnly = params.filter === "unread";
  const result = await fetchMyNotifications(page, NOTIFICATIONS_PER_PAGE, unreadOnly);

  if (!result.success || !result.data) {
    return (
      <div className="py-20 text-center text-destructive">
        Impossible de charger les notifications.
      </div>
    );
  }

  const { notifications, total, unreadCount } = result.data;
  const totalPages = Math.max(1, Math.ceil(total / NOTIFICATIONS_PER_PAGE));

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Retrouvez l’ensemble de vos alertes et mises à jour.
          </p>
        </div>
        <div className="flex rounded-lg border bg-card p-1">
          <Button asChild variant="ghost" size="sm" className={cn(!unreadOnly && "bg-muted")}>
            <Link href="/dashboard/notifications">Toutes</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className={cn(unreadOnly && "bg-muted")}>
            <Link href="/dashboard/notifications?filter=unread">
              Non lues{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </Link>
          </Button>
        </div>
      </div>

      <NotificationsList
        initialNotifications={notifications}
        unreadCount={unreadCount}
      />
      <PaginationControls currentPage={page} totalPages={totalPages} />
    </section>
  );
}
