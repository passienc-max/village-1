import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { canRequest, canVolunteer, ROLE_LABELS } from "@/lib/constants";
import { RequestCard } from "@/components/RequestCard";
import { CreateRequestDialog } from "@/components/CreateRequestDialog";

const ACTIVE = ["open", "accepted", "in_progress"];

const Empty = ({ text, testId }) => (
  <div className="rounded-xl border border-dashed border-[#D4A373] bg-[#FDF8F0] p-8 text-center text-sm text-stone-600" data-testid={testId}>{text}</div>
);

const RequestGrid = ({ items, showPerson, empty, testId }) =>
  items.length ? (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid={testId}>
      {items.map((r) => <RequestCard key={r.request_id} r={r} showPerson={showPerson} />)}
    </div>
  ) : <Empty text={empty} testId={`${testId}-empty`} />;

const SplitTabs = ({ items, prefix, showPerson, emptyActive }) => (
  <Tabs defaultValue="active">
    <TabsList className="bg-[#F4F3EE]">
      <TabsTrigger value="active" data-testid={`${prefix}-tab-active`}>Active ({items.filter((r) => ACTIVE.includes(r.status)).length})</TabsTrigger>
      <TabsTrigger value="past" data-testid={`${prefix}-tab-past`}>Past</TabsTrigger>
    </TabsList>
    <TabsContent value="active" className="mt-5">
      <RequestGrid items={items.filter((r) => ACTIVE.includes(r.status))} showPerson={showPerson} empty={emptyActive} testId={`${prefix}-active-list`} />
    </TabsContent>
    <TabsContent value="past" className="mt-5">
      <RequestGrid items={items.filter((r) => !ACTIVE.includes(r.status))} showPerson={showPerson} empty="Nothing here yet." testId={`${prefix}-past-list`} />
    </TabsContent>
  </Tabs>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [mine, setMine] = useState([]);
  const [helping, setHelping] = useState([]);

  const load = useCallback(() => {
    if (canRequest(user)) api.get("/requests/mine").then((r) => setMine(r.data));
    if (canVolunteer(user)) api.get("/requests/helping").then((r) => setHelping(r.data));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" data-testid="dashboard-page">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#588157]">{ROLE_LABELS[user.role]} · {user.neighborhood || "Klamath County"}</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-stone-900 sm:text-5xl" data-testid="dashboard-greeting">Hi, {user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {canVolunteer(user) && (
            <Link to="/board" data-testid="dashboard-board-link" className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1E3D2F] px-5 py-2.5 text-sm font-semibold text-[#1E3D2F] transition-colors hover:bg-[#1E3D2F] hover:text-white">
              Browse open requests <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {canRequest(user) && <CreateRequestDialog user={user} onCreated={load} />}
        </div>
      </div>
      {canRequest(user) && (
        <section className="mt-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-stone-900">My requests</h2>
          <SplitTabs items={mine} prefix="my-requests" showPerson="volunteer" emptyActive="No active requests. Tap “Ask for help” whenever you need a hand." />
        </section>
      )}
      {canVolunteer(user) && (
        <section className="mt-12">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-stone-900">Families I'm helping</h2>
          <SplitTabs items={helping} prefix="helping" showPerson="parent" emptyActive="You haven't accepted any requests yet. Check the volunteer board." />
        </section>
      )}
    </div>
  );
}
