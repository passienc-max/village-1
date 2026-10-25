import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, MapPin, CalendarDays, Users } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canVolunteer, categoryOf } from "@/lib/constants";
import { StatusBadge, UrgentBadge } from "@/components/StatusBadge";
import { ReportDialog } from "@/components/ReportDialog";
import { ChatPanel } from "@/components/ChatPanel";
import { LocationPanel } from "@/components/LocationPanel";

const ActionBtn = ({ onClick, children, testId, variant = "primary" }) => {
  const cls = { primary: "bg-[#1E3D2F] text-white hover:bg-[#162E23]", accent: "bg-[#D96838] text-white hover:bg-[#BE5527]", ghost: "border border-[#E5E3D8] text-stone-800 hover:bg-[#F4F3EE]" }[variant];
  return <button onClick={onClick} data-testid={testId} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${cls}`}>{children}</button>;
};

const PersonLink = ({ id, name, role }) => (
  <Link to={`/users/${id}`} className="flex items-center gap-3 rounded-lg border border-[#E5E3D8] p-3 transition-colors hover:bg-[#F4F3EE]" data-testid={`person-link-${role}`}>
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D4A373] font-semibold text-white">{name?.[0]}</span>
    <span><span className="block text-sm font-semibold text-stone-900">{name}</span><span className="block text-xs text-stone-500">{role === "parent" ? "Parent" : "Volunteer"} · view profile</span></span>
  </Link>
);

const useActions = (r, user, act) => {
  const isParent = user.user_id === r.parent_id || user.role === "admin";
  const isVol = user.user_id === r.volunteer_id;
  const list = [];
  if (r.status === "open" && !isParent && canVolunteer(user)) list.push(["accept", "Accept request", "accent"]);
  if (r.status === "accepted" && (isParent || isVol)) list.push(["in_progress", "Mark in progress", "primary"]);
  if (["accepted", "in_progress"].includes(r.status) && (isParent || isVol)) list.push(["completed", "Mark complete", "primary"]);
  if (["accepted", "in_progress"].includes(r.status) && isVol) list.push(["withdraw", "Step back", "ghost"]);
  if (["open", "accepted", "in_progress"].includes(r.status) && isParent) list.push(["cancelled", "Cancel request", "ghost"]);
  return list.map(([a, label, v]) => <ActionBtn key={a} variant={v} testId={`request-action-${a}`} onClick={() => act(a)}>{label}</ActionBtn>);
};

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api.get(`/requests/${id}`).then((res) => setR(res.data)).catch((e) => setErr(formatApiError(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (a) => {
    try {
      const res = a === "accept" ? await api.post(`/requests/${id}/accept`) : await api.post(`/requests/${id}/status`, { action: a });
      setR(res.data);
      toast.success(a === "accept" ? "Accepted! Say hello in the chat." : "Request updated.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const actions = useActions(r || {}, user, act);
  if (err) return <p className="mx-auto max-w-3xl px-4 py-16 text-center text-stone-600" data-testid="request-error">{err}</p>;
  if (!r) return null;

  const cat = categoryOf(r.category);
  const isParticipant = [r.parent_id, r.volunteer_id].includes(user.user_id);
  const other = user.user_id === r.parent_id ? (r.volunteer_id && { id: r.volunteer_id, name: r.volunteer_name, role: "volunteer" }) : { id: r.parent_id, name: r.parent_name, role: "parent" };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" data-testid="request-detail-page">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900" data-testid="back-to-dashboard-link"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="rounded-xl border border-[#E5E3D8] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#588157]">{cat.label}</span>
            {r.urgency === "urgent" && <UrgentBadge />}
            <StatusBadge status={r.status} testId="request-detail-status" />
          </div>
          <h1 className="mt-3 font-heading text-3xl font-bold text-stone-900 sm:text-4xl" data-testid="request-detail-title">{r.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-stone-700">{r.description}</p>
          <div className="mt-6 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#588157]" />{r.neighborhood}{r.location_note ? ` · ${r.location_note}` : ""}</p>
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#588157]" />{r.needed_date}{r.needed_time ? ` at ${r.needed_time}` : ""}</p>
            {r.kids_count != null && <p className="flex items-center gap-2"><Users className="h-4 w-4 text-[#588157]" />{r.kids_count} kid(s)</p>}
          </div>
          {actions.length > 0 && <div className="mt-8 flex flex-wrap gap-2" data-testid="request-actions">{actions}</div>}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {other && other.id !== user.user_id && <PersonLink {...other} />}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#E5E3D8] pt-6">
            <ReportDialog targetType="request" targetId={r.request_id} label="Report request" testId="report-request-btn" />
            {other && other.id !== user.user_id && <ReportDialog targetType="user" targetId={other.id} label={`Report ${other.name.split(" ")[0]}`} testId="report-user-btn" />}
            <Link to="/safety" className="text-sm font-medium text-stone-600 underline-offset-2 hover:underline" data-testid="request-safety-link">Safety guidelines</Link>
          </div>
        </div>
        <div className="space-y-6">
          {isParticipant && r.volunteer_id && ["accepted", "in_progress"].includes(r.status) && <LocationPanel requestId={r.request_id} />}
          {r.volunteer_id && (isParticipant || user.role === "admin") ? (
            <ChatPanel requestId={r.request_id} me={user.user_id} canSend={isParticipant && !["completed", "cancelled"].includes(r.status)} />
          ) : (
            <div className="rounded-xl border border-dashed border-[#D4A373] bg-[#FDF8F0] p-8 text-sm text-stone-600" data-testid="chat-locked">
              The private chat opens once a volunteer accepts this request.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
