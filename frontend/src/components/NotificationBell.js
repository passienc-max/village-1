import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageCircle, CheckCircle2, ShieldAlert, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/constants";

const ICONS = { message: MessageCircle, accepted: CheckCircle2, report: ShieldAlert };

export const NotificationBell = () => {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api.get("/notifications").then((r) => setData(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const openItem = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.notification_id}/read`).catch(() => {});
    setOpen(false);
    load();
    navigate(n.link);
  };

  const readAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <PopoverTrigger asChild>
        <button data-testid="notification-bell-btn" aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100">
          <Bell className="h-5 w-5" />
          {data.unread > 0 && (
            <span data-testid="notification-unread-count"
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D96838] px-1 text-[11px] font-bold text-white">
              {data.unread > 9 ? "9+" : data.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 bg-white" data-testid="notification-popover">
        <div className="flex items-center justify-between border-b border-[#E5E3D8] px-4 py-3">
          <p className="font-heading font-semibold text-stone-900">Notifications</p>
          {data.unread > 0 && (
            <button onClick={readAll} data-testid="notification-read-all-btn" className="text-xs font-semibold text-[#1E3D2F] hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {data.items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-stone-500" data-testid="notification-empty">You're all caught up.</p>
          )}
          {data.items.map((n) => {
            const Icon = ICONS[n.type] || Info;
            return (
              <button key={n.notification_id} onClick={() => openItem(n)} data-testid={`notification-item-${n.notification_id}`}
                className={`flex w-full gap-3 border-b border-stone-100 px-4 py-3 text-left transition-colors hover:bg-[#F4F3EE] ${n.read ? "" : "bg-[#EBF2EC]/60"}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#588157]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-stone-900">{n.title}</span>
                  <span className="block truncate text-xs text-stone-600">{n.body}</span>
                  <span className="block text-[11px] text-stone-400">{timeAgo(n.created_at)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
