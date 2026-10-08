import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, HandHeart, ClipboardList } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/constants";
import { ReportDialog } from "@/components/ReportDialog";

export default function UserProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get(`/users/${id}`).then((r) => setP(r.data)).catch((e) => setErr(formatApiError(e)));
  }, [id]);

  if (err) return <p className="py-16 text-center text-stone-600" data-testid="user-profile-error">{err}</p>;
  if (!p) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6" data-testid="user-profile-page">
      <div className="rounded-xl border border-[#E5E3D8] bg-white p-8">
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20">
            <AvatarImage src={p.picture || undefined} />
            <AvatarFallback className="bg-[#D4A373] text-2xl font-semibold text-white">{p.name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-heading text-3xl font-bold text-stone-900" data-testid="user-profile-name">{p.name}</h1>
            <p className="text-sm text-stone-600">{ROLE_LABELS[p.role] || "Member"}</p>
            {p.neighborhood && <p className="mt-1 flex items-center gap-1 text-sm text-stone-500"><MapPin className="h-3.5 w-3.5" />{p.neighborhood}</p>}
          </div>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-stone-700">{p.bio || "This neighbor hasn't written a bio yet."}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#EBF2EC] p-4"><HandHeart className="h-5 w-5 text-[#1E3D2F]" /><p className="mt-2 text-2xl font-bold text-stone-900" data-testid="user-helped-count">{p.helped_count}</p><p className="text-xs text-stone-600">Requests completed as volunteer</p></div>
          <div className="rounded-lg bg-[#FDF8F0] p-4"><ClipboardList className="h-5 w-5 text-[#D96838]" /><p className="mt-2 text-2xl font-bold text-stone-900">{p.requests_count}</p><p className="text-xs text-stone-600">Requests posted</p></div>
        </div>
        <p className="mt-6 text-xs text-stone-500">Member since {new Date(p.created_at).toLocaleDateString([], { month: "long", year: "numeric" })}</p>
        {user.user_id !== p.user_id && <div className="mt-6 border-t border-[#E5E3D8] pt-6"><ReportDialog targetType="user" targetId={p.user_id} label="Report this user" /></div>}
      </div>
    </div>
  );
}
