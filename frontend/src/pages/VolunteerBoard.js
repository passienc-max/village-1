import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { HandHeart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError } from "@/lib/api";
import { CATEGORIES, IMAGES, NEIGHBORHOODS } from "@/lib/constants";
import { RequestCard } from "@/components/RequestCard";

const ALL = "all";

const Filter = ({ value, onChange, options, placeholder, testId }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-11 w-full bg-white sm:w-52" data-testid={testId}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent className="bg-white">
      <SelectItem value={ALL}>{placeholder}</SelectItem>
      {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

export default function VolunteerBoard() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ category: ALL, neighborhood: ALL, urgency: ALL });
  const navigate = useNavigate();
  const { user } = useAuth();
  const verified = user.driver_status === "approved" || user.role === "admin";

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ALL));
    api.get("/requests/open", { params }).then((r) => setItems(r.data)).catch((e) => toast.error(formatApiError(e)));
  }, [f]);

  useEffect(() => { load(); }, [load]);

  const accept = async (id) => {
    try {
      await api.post(`/requests/${id}/accept`);
      toast.success("You're on it! The parent has been notified.");
      navigate(`/requests/${id}`);
    } catch (e) {
      toast.error(formatApiError(e));
      load();
    }
  };

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" data-testid="volunteer-board-page">
      <section className="relative overflow-hidden rounded-2xl bg-[#1E3D2F]">
        <img src={IMAGES.volunteer} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative px-6 py-12 sm:px-12">
          <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">Volunteer board</h1>
          <p className="mt-3 max-w-xl text-stone-200">Families across Klamath County who could use a hand. Accept a request to open a private chat with the parent.</p>
        </div>
      </section>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Filter testId="board-filter-category" value={f.category} onChange={set("category")} placeholder="All categories" options={CATEGORIES} />
        <Filter testId="board-filter-neighborhood" value={f.neighborhood} onChange={set("neighborhood")} placeholder="All communities" options={NEIGHBORHOODS.map((n) => ({ value: n, label: n }))} />
        <Filter testId="board-filter-urgency" value={f.urgency} onChange={set("urgency")} placeholder="Any urgency" options={[{ value: "urgent", label: "Urgent only" }, { value: "normal", label: "Normal" }]} />
      </div>
      {!verified && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="board-verify-banner">
          Ride requests can only be accepted by verified drivers. <Link to="/driver-verification" className="font-semibold underline">Verify your license, insurance and selfie</Link>.
        </div>
      )}
      <p className="mt-6 text-sm text-stone-500" data-testid="board-count">{items.length} open request{items.length === 1 ? "" : "s"}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => (
          <RequestCard key={r.request_id} r={r} showPerson="parent" action={r.category === "ride" && !verified ? (
            <Link to="/driver-verification" data-testid={`verify-to-accept-btn-${r.request_id}`} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200">Verify to accept</Link>
          ) : (
            <button onClick={() => accept(r.request_id)} data-testid={`accept-request-btn-${r.request_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3D2F] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#162E23]">
              <HandHeart className="h-4 w-4" /> Accept
            </button>
          )} />
        ))}
      </div>
      {items.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-[#D4A373] bg-[#FDF8F0] p-10 text-center text-stone-600" data-testid="board-empty">
          No open requests match right now. Check back soon — you'll be helping someone before you know it.
        </div>
      )}
    </div>
  );
}
