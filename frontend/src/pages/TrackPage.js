import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { categoryOf } from "@/lib/constants";
import { RideMap } from "@/components/RideMap";

export default function TrackPage() {
  const { token } = useParams();
  const [d, setD] = useState(null);

  useEffect(() => {
    const load = () => api.get(`/track/${token}`).then((r) => setD(r.data)).catch(() => setD({ active: false, reason: "This link is not valid." }));
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [token]);

  if (!d) return null;
  if (!d.active) return <p className="mx-auto max-w-lg px-4 py-20 text-center text-stone-600" data-testid="track-inactive">{d.reason}</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6" data-testid="track-page">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#588157]"><ShieldCheck className="h-4 w-4" />Safety tracking link</p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-stone-900 sm:text-4xl">{d.shared_by} shared a {categoryOf(d.category).label.toLowerCase()} with you</h1>
      <p className="mt-2 text-stone-600">{d.parent_name} (parent){d.volunteer_name ? ` and ${d.volunteer_name} (volunteer)` : ""} · {d.neighborhood} · {d.needed_date}{d.needed_time ? ` ${d.needed_time}` : ""}</p>
      <div className="mt-6">
        {d.locations.length ? <RideMap locations={d.locations} className="h-[420px]" /> : (
          <p className="rounded-xl bg-[#F4F3EE] p-8 text-center text-stone-600" data-testid="track-no-location">No live location yet. This page refreshes automatically.</p>
        )}
      </div>
      <p className="mt-4 text-xs text-stone-500">Updates every 10 seconds. Link expires {new Date(d.expires_at).toLocaleString()}. If you think someone is in danger, call 911.</p>
    </div>
  );
}
