import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Navigation, Share2, Copy, XCircle, MessageSquare } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { RideMap } from "@/components/RideMap";

const SEND_EVERY_MS = 10000;

const ShareLinks = ({ requestId }) => {
  const [links, setLinks] = useState([]);
  const load = useCallback(() => api.get(`/requests/${requestId}/share-links`).then((r) => setLinks(r.data)).catch(() => {}), [requestId]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      const { data } = await api.post(`/requests/${requestId}/share-links`);
      if (navigator.share) navigator.share({ title: "Follow my ride", url: data.url }).catch(() => {});
      else navigator.clipboard?.writeText(data.url);
      toast.success("Share link created. Send it to a friend or family member.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const revoke = async (token) => { await api.post(`/share-links/${token}/revoke`); load(); };
  const smsBody = (url) => `sms:?&body=${encodeURIComponent(`Follow my Parent Link ride live: ${url}`)}`;

  return (
    <div className="mt-4 space-y-2">
      <button onClick={create} data-testid="create-share-link-btn" className="inline-flex items-center gap-2 rounded-lg border border-[#1E3D2F] px-3 py-2 text-sm font-semibold text-[#1E3D2F] transition-colors hover:bg-[#EBF2EC]">
        <Share2 className="h-4 w-4" /> Share with a friend or family member
      </button>
      {links.map((l) => (
        <div key={l.token} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#F4F3EE] p-2 text-xs" data-testid="share-link-row">
          <span className="min-w-0 flex-1 truncate font-mono text-stone-700" data-testid="share-link-url">{l.url}</span>
          <button onClick={() => { navigator.clipboard?.writeText(l.url); toast.success("Link copied"); }} data-testid="copy-share-link-btn" className="flex items-center gap-1 font-semibold text-[#1E3D2F]"><Copy className="h-3.5 w-3.5" />Copy</button>
          <a href={smsBody(l.url)} className="flex items-center gap-1 font-semibold text-[#1E3D2F]" data-testid="text-share-link-btn"><MessageSquare className="h-3.5 w-3.5" />Text</a>
          <button onClick={() => revoke(l.token)} data-testid="revoke-share-link-btn" className="flex items-center gap-1 font-semibold text-red-700"><XCircle className="h-3.5 w-3.5" />Turn off</button>
        </div>
      ))}
    </div>
  );
};

export const LocationPanel = ({ requestId }) => {
  const [locations, setLocations] = useState([]);
  const [sharing, setSharing] = useState(false);
  const watchRef = useRef(null);
  const lastSent = useRef(0);

  const load = useCallback(() => api.get(`/requests/${requestId}/locations`).then((r) => setLocations(r.data)).catch(() => {}), [requestId]);
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => () => watchRef.current != null && navigator.geolocation.clearWatch(watchRef.current), []);

  const start = () => {
    if (!navigator.geolocation) { toast.error("Location isn't available on this device"); return; }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - lastSent.current < SEND_EVERY_MS) return;
        lastSent.current = Date.now();
        api.post(`/requests/${requestId}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
          .then(load).catch((e) => toast.error(formatApiError(e)));
      },
      () => { toast.error("Please allow location access to share your position"); stop(); },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setSharing(true);
  };

  const stop = async () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    lastSent.current = 0;
    setSharing(false);
    await api.delete(`/requests/${requestId}/location`).catch(() => {});
    load();
  };

  return (
    <div className="rounded-xl border border-[#E5E3D8] bg-white p-5" data-testid="location-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-heading font-semibold text-stone-900">Live location for safety</p>
          <p className="text-xs text-stone-500">Visible only to the parent, the volunteer, and anyone you send a link to.</p>
        </div>
        <button onClick={sharing ? stop : start} data-testid={sharing ? "stop-location-btn" : "start-location-btn"}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${sharing ? "bg-red-700 text-white hover:bg-red-800" : "bg-[#1E3D2F] text-white hover:bg-[#162E23]"}`}>
          <Navigation className="h-4 w-4" />{sharing ? "Stop sharing" : "Share my live location"}
        </button>
      </div>
      <div className="mt-4">
        {locations.length ? <RideMap locations={locations} /> : (
          <p className="rounded-lg bg-[#F4F3EE] p-4 text-sm text-stone-600" data-testid="no-locations">No one is sharing their location yet.</p>
        )}
      </div>
      <ShareLinks requestId={requestId} />
    </div>
  );
};
