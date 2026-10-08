import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, formatApiError } from "@/lib/api";
import { ROLE_LABELS, timeAgo } from "@/lib/constants";
import { ListingCard } from "@/components/ListingCard";
import { ListingForm } from "@/components/ListingForm";
import { StatusBadge } from "@/components/StatusBadge";

const run = async (fn, msg, after) => {
  try { await fn(); toast.success(msg); after(); } catch (e) { toast.error(formatApiError(e)); }
};

const Btn = ({ children, ...p }) => (
  <button {...p} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${p.className || "bg-[#1E3D2F] text-white hover:bg-[#162E23]"}`}>{children}</button>
);

const Stats = ({ s }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-6" data-testid="admin-stats">
    {[["users", "Members"], ["open_requests", "Open requests"], ["active_requests", "In progress"], ["completed_requests", "Completed"], ["open_reports", "Open reports"], ["pending_listings", "Pending listings"]].map(([k, l]) => (
      <div key={k} className="rounded-xl border border-[#E5E3D8] bg-white p-4"><p className="text-2xl font-bold text-stone-900" data-testid={`admin-stat-${k}`}>{s[k] ?? "–"}</p><p className="text-xs text-stone-500">{l}</p></div>
    ))}
  </div>
);

const Reports = ({ items, reload }) => (
  <div className="space-y-3">
    {items.length === 0 && <p className="text-sm text-stone-500">No reports.</p>}
    {items.map((r) => (
      <div key={r.report_id} className="rounded-xl border border-[#E5E3D8] bg-white p-5" data-testid={`admin-report-${r.report_id}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-stone-900">{r.reason} <span className="font-normal text-stone-500">· {r.target_label}</span></p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === "open" ? "bg-red-50 text-red-800" : "bg-stone-100 text-stone-600"}`}>{r.status}</span>
        </div>
        {r.details && <p className="mt-2 text-sm text-stone-700">{r.details}</p>}
        <p className="mt-2 text-xs text-stone-500">By {r.reporter_name} · {timeAgo(r.created_at)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {r.target_type === "request" && <Link to={`/requests/${r.target_id}`} className="text-xs font-semibold text-[#1E3D2F] underline">View request</Link>}
          {r.target_type === "user" && <Link to={`/users/${r.target_id}`} className="text-xs font-semibold text-[#1E3D2F] underline">View user</Link>}
          {r.status === "open" && <Btn data-testid={`admin-resolve-report-btn-${r.report_id}`} onClick={() => run(() => api.post(`/admin/reports/${r.report_id}/resolve`, { admin_note: "" }), "Report resolved", reload)}>Mark resolved</Btn>}
        </div>
      </div>
    ))}
  </div>
);

const Listings = ({ items, reload }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {items.length === 0 && <p className="text-sm text-stone-500">Nothing here.</p>}
    {items.map((l) => (
      <ListingCard key={l.listing_id} l={l}>
        <p className="mt-3 text-xs text-stone-500">{l.type} · {l.status} · by {l.submitted_by_name}</p>
        <div className="mt-3 flex gap-2">
          {l.status === "pending" && <Btn data-testid={`admin-approve-listing-btn-${l.listing_id}`} onClick={() => run(() => api.post(`/admin/listings/${l.listing_id}/approve`), "Listing approved", reload)}>Approve</Btn>}
          {l.status === "pending" && <Btn data-testid={`admin-reject-listing-btn-${l.listing_id}`} className="border border-[#E5E3D8] text-stone-800 hover:bg-[#F4F3EE]" onClick={() => run(() => api.post(`/admin/listings/${l.listing_id}/reject`), "Listing rejected", reload)}>Reject</Btn>}
          {l.status !== "pending" && <Btn data-testid={`admin-delete-listing-btn-${l.listing_id}`} className="border border-red-200 text-red-700 hover:bg-red-50" onClick={() => run(() => api.delete(`/admin/listings/${l.listing_id}`), "Listing deleted", reload)}>Delete</Btn>}
        </div>
      </ListingCard>
    ))}
  </div>
);

const AddListing = ({ reload }) => {
  const [type, setType] = useState("resource");
  const add = async (form) => {
    try { await api.post("/admin/listings", form); toast.success("Listing published"); reload(); return true; }
    catch (e) { toast.error(formatApiError(e)); return false; }
  };
  return (
    <div className="max-w-lg rounded-xl border border-[#E5E3D8] bg-white p-6">
      <div className="mb-4 flex gap-2">
        {["resource", "business"].map((t) => (
          <button key={t} onClick={() => setType(t)} data-testid={`admin-add-type-${t}`} className={`rounded-full px-3 py-1.5 text-sm font-medium ${type === t ? "bg-[#1E3D2F] text-white" : "bg-[#F4F3EE] text-stone-700"}`}>{t === "resource" ? "Resource" : "Business / org"}</button>
        ))}
      </div>
      <ListingForm key={type} type={type} onSubmit={add} submitLabel="Publish listing" testPrefix="admin-listing" />
    </div>
  );
};

const UsersTable = ({ items, reload }) => (
  <div className="overflow-x-auto rounded-xl border border-[#E5E3D8] bg-white">
    <table className="w-full text-sm">
      <thead className="bg-[#F4F3EE] text-left text-xs uppercase tracking-wider text-stone-500"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Community</th><th className="p-3" /></tr></thead>
      <tbody>
        {items.map((u) => (
          <tr key={u.user_id} className="border-t border-stone-100" data-testid={`admin-user-row-${u.user_id}`}>
            <td className="p-3"><Link to={`/users/${u.user_id}`} className="font-semibold hover:underline">{u.name}</Link>{u.suspended && <span className="ml-2 rounded bg-red-50 px-1.5 text-xs text-red-700">suspended</span>}</td>
            <td className="p-3 text-stone-600">{u.email}</td>
            <td className="p-3">{ROLE_LABELS[u.role] || "—"}</td>
            <td className="p-3">{u.neighborhood || "—"}</td>
            <td className="p-3 text-right">{u.role !== "admin" && <Btn data-testid={`admin-suspend-btn-${u.user_id}`} className={u.suspended ? "bg-[#1E3D2F] text-white" : "border border-red-200 text-red-700 hover:bg-red-50"} onClick={() => run(() => api.post(`/admin/users/${u.user_id}/suspend`), u.suspended ? "User reinstated" : "User suspended", reload)}>{u.suspended ? "Reinstate" : "Suspend"}</Btn>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RequestsTable = ({ items, reload }) => (
  <div className="space-y-2">
    {items.map((r) => (
      <div key={r.request_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E3D8] bg-white p-4" data-testid={`admin-request-row-${r.request_id}`}>
        <div><Link to={`/requests/${r.request_id}`} className="font-semibold hover:underline">{r.title}</Link><p className="text-xs text-stone-500">{r.parent_name} · {r.neighborhood} · {timeAgo(r.created_at)}</p></div>
        <div className="flex items-center gap-2"><StatusBadge status={r.status} />
          {["open", "accepted", "in_progress"].includes(r.status) && <Btn data-testid={`admin-cancel-request-btn-${r.request_id}`} className="border border-red-200 text-red-700 hover:bg-red-50" onClick={() => run(() => api.post(`/requests/${r.request_id}/status`, { action: "cancelled" }), "Request cancelled", reload)}>Cancel</Btn>}
        </div>
      </div>
    ))}
  </div>
);

export default function AdminPanel() {
  const [d, setD] = useState({ stats: {}, reports: [], listings: [], users: [], requests: [] });
  const load = useCallback(async () => {
    const [stats, reports, listings, users, requests] = await Promise.all(
      ["/admin/stats", "/admin/reports", "/admin/listings", "/admin/users", "/admin/requests"].map((u) => api.get(u).then((r) => r.data)));
    setD({ stats, reports, listings, users, requests });
  }, []);
  useEffect(() => { load().catch((e) => toast.error(formatApiError(e))); }, [load]);

  const pending = d.listings.filter((l) => l.status === "pending");
  const tabs = [
    ["reports", `Reports (${d.reports.filter((r) => r.status === "open").length})`, <Reports items={d.reports} reload={load} />],
    ["pending", `Suggestions (${pending.length})`, <Listings items={pending} reload={load} />],
    ["listings", "All listings", <Listings items={d.listings.filter((l) => l.status === "approved")} reload={load} />],
    ["add", "Add listing", <AddListing reload={load} />],
    ["requests", "Requests", <RequestsTable items={d.requests} reload={load} />],
    ["users", "Users", <UsersTable items={d.users} reload={load} />],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" data-testid="admin-page">
      <h1 className="font-heading text-4xl font-bold text-stone-900">Village admin</h1>
      <div className="mt-6"><Stats s={d.stats} /></div>
      <Tabs defaultValue="reports" className="mt-8">
        <TabsList className="flex h-auto flex-wrap justify-start bg-[#F4F3EE]">
          {tabs.map(([v, l]) => <TabsTrigger key={v} value={v} data-testid={`admin-tab-${v}`}>{l}</TabsTrigger>)}
        </TabsList>
        {tabs.map(([v, , c]) => <TabsContent key={v} value={v} className="mt-6">{c}</TabsContent>)}
      </Tabs>
    </div>
  );
}
