import { Link } from "react-router-dom";
import { MapPin, CalendarDays, UserRound } from "lucide-react";
import { categoryOf, timeAgo } from "@/lib/constants";
import { StatusBadge, UrgentBadge } from "@/components/StatusBadge";

export const RequestCard = ({ r, action, showPerson = "volunteer" }) => {
  const cat = categoryOf(r.category);
  const Icon = cat.icon;
  const person = showPerson === "parent" ? r.parent_name : r.volunteer_name;
  return (
    <div data-testid={`request-card-${r.request_id}`}
      className="group flex flex-col rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#588157]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EBF2EC]"><Icon className="h-4 w-4" /></span>
          {cat.label}
        </span>
        <div className="flex gap-1.5">
          {r.urgency === "urgent" && <UrgentBadge />}
          <StatusBadge status={r.status} testId={`request-status-${r.request_id}`} />
        </div>
      </div>
      <Link to={`/requests/${r.request_id}`} data-testid={`open-request-link-${r.request_id}`}>
        <h3 className="mt-4 font-heading text-lg font-semibold text-stone-900 group-hover:text-[#1E3D2F]">{r.title}</h3>
      </Link>
      <p className="mt-1 line-clamp-2 text-sm text-stone-600">{r.description}</p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.neighborhood}</span>
        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{r.needed_date}{r.needed_time ? ` · ${r.needed_time}` : ""}</span>
        {person && <span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{person}</span>}
        <span>{timeAgo(r.created_at)}</span>
      </div>
      <div className="mt-5 flex gap-2">
        <Link to={`/requests/${r.request_id}`} data-testid={`open-chat-btn-${r.request_id}`}
          className="rounded-lg border border-[#E5E3D8] px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-[#F4F3EE]">
          View details{r.volunteer_id ? " & chat" : ""}
        </Link>
        {action}
      </div>
    </div>
  );
};
