import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, HandHeart, ClipboardList, Star, BadgeCheck, Clock, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, categoryOf } from "@/lib/constants";
import { ReportDialog } from "@/components/ReportDialog";
import { ReviewsSection } from "@/components/ReviewsSection";
import { ReferencesSection } from "@/components/ReferencesSection";
import { Stars } from "@/components/Stars";

const Stat = ({ icon: Icon, value, label, tone, testId }) => (
  <div className={`rounded-xl p-4 ${tone}`}>
    <Icon className="h-5 w-5 text-[#1E3D2F]" />
    <p className="mt-2 text-2xl font-bold text-stone-900" data-testid={testId}>{value}</p>
    <p className="text-xs text-stone-600">{label}</p>
  </div>
);

const Header = ({ p }) => (
  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
    <Avatar className="h-24 w-24 ring-4 ring-white shadow">
      <AvatarImage src={p.picture || undefined} />
      <AvatarFallback className="bg-[#D4A373] text-3xl font-semibold text-white">{p.name?.[0]}</AvatarFallback>
    </Avatar>
    <div>
      <h1 className="font-heading text-4xl font-bold text-stone-900" data-testid="user-profile-name">{p.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <span className="rounded-full bg-[#F4F3EE] px-3 py-1 font-semibold">{ROLE_LABELS[p.role] || "Member"}</span>
        {p.neighborhood && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{p.neighborhood}</span>}
        {p.driver_status === "approved" && <span className="flex items-center gap-1 rounded-full bg-[#EBF2EC] px-3 py-1 font-semibold text-[#1E3D2F]" data-testid="verified-driver-badge"><BadgeCheck className="h-4 w-4" />Verified driver</span>}
        {p.rating_avg && <span className="flex items-center gap-1"><Stars value={p.rating_avg} />{p.rating_avg} ({p.rating_count})</span>}
      </div>
      <p className="mt-2 text-xs text-stone-500">Member since {new Date(p.created_at).toLocaleDateString([], { month: "long", year: "numeric" })}</p>
    </div>
  </div>
);

export default function PublicProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => api.get(`/users/${id}`).then((r) => setP(r.data)).catch((e) => setErr(formatApiError(e))), [id]);
  useEffect(() => { load(); }, [load]);

  if (err) return <p className="py-16 text-center text-stone-600" data-testid="user-profile-error">{err}</p>;
  if (!p) return null;
  const isMe = user.user_id === p.user_id;
  const first = p.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6" data-testid="user-profile-page">
      <div className="rounded-2xl border border-[#E5E3D8] bg-white p-6 sm:p-10">
        <Header p={p} />
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={HandHeart} value={p.helped_count} label="Requests completed as volunteer" tone="bg-[#EBF2EC]" testId="user-helped-count" />
          <Stat icon={ClipboardList} value={p.requests_count} label="Requests posted" tone="bg-[#FDF8F0]" testId="user-requests-count" />
          <Stat icon={Star} value={p.rating_avg ?? "–"} label={`Average rating (${p.rating_count})`} tone="bg-[#F4F3EE]" testId="user-rating-avg" />
          <Stat icon={Users} value={p.references_count} label="References" tone="bg-[#F4F3EE]" testId="user-references-count" />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">About</p>
            <p className="mt-2 whitespace-pre-wrap text-stone-700" data-testid="user-profile-bio">{p.bio || `${first} hasn't written a bio yet.`}</p>
          </div>
          <div className="space-y-4">
            {p.availability && <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Availability</p><p className="mt-2 flex items-center gap-2 text-stone-700"><Clock className="h-4 w-4 text-[#588157]" />{p.availability}</p></div>}
            {p.help_categories?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Can help with</p>
                <div className="mt-2 flex flex-wrap gap-2">{p.help_categories.map((c) => { const C = categoryOf(c); return <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3D8] px-3 py-1 text-sm"><C.icon className="h-4 w-4 text-[#588157]" />{C.label}</span>; })}</div>
              </div>
            )}
          </div>
        </div>
        {!isMe && <div className="mt-8 border-t border-[#E5E3D8] pt-6"><ReportDialog targetType="user" targetId={p.user_id} label="Report this user" /></div>}
      </div>
      <Tabs defaultValue="reviews" className="mt-8">
        <TabsList className="bg-[#F4F3EE]">
          <TabsTrigger value="reviews" data-testid="profile-tab-reviews">Ratings & comments ({p.rating_count})</TabsTrigger>
          <TabsTrigger value="references" data-testid="profile-tab-references">References ({p.references_count})</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-5"><ReviewsSection userId={p.user_id} onChange={load} /></TabsContent>
        <TabsContent value="references" className="mt-5"><ReferencesSection userId={p.user_id} isMe={isMe} name={first} /></TabsContent>
      </Tabs>
    </div>
  );
}
