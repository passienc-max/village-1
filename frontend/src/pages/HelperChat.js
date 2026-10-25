import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Trash2 } from "lucide-react";
import { api, API } from "@/lib/api";

const STARTERS = [
  "Where can I get help with groceries this week?",
  "How do I become a verified driver?",
  "Is there free help with my utility bill?",
  "What should I do before my first ride with a volunteer?",
];

const streamReply = async (message, onDelta) => {
  const send = () => fetch(`${API}/ai/chat/stream`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }),
  });
  let res = await send();
  if (res.status === 401) { await api.post("/auth/refresh").catch(() => {}); res = await send(); }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(typeof j.detail === "string" ? j.detail : "The helper is unavailable right now.");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split("\n\n");
    buf = events.pop();
    for (const ev of events) {
      if (!ev.startsWith("data: ")) continue;
      const data = JSON.parse(ev.slice(6));
      if (data.error) throw new Error(data.error);
      if (data.delta) onDelta(data.delta);
    }
  }
};

const Bubble = ({ m }) => (
  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`helper-msg-${m.role}`}>
    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-[#1E3D2F] text-white" : "rounded-bl-sm border border-[#E5E3D8] bg-white text-stone-800"}`}>
      {m.text || <span className="animate-pulse text-stone-400">Thinking…</span>}
    </div>
  </div>
);

export default function HelperChat() {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { api.get("/ai/chat/history").then((r) => setMsgs(r.data)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs]);

  const ask = async (q) => {
    if (!q.trim() || busy) return;
    setText("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "assistant", text: "" }]);
    const patch = (fn) => setMsgs((m) => [...m.slice(0, -1), fn(m[m.length - 1])]);
    try {
      await streamReply(q, (d) => patch((last) => ({ ...last, text: last.text + d })));
    } catch (e) {
      patch(() => ({ role: "assistant", text: e.message }));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => { await api.delete("/ai/chat/history"); setMsgs([]); };

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-10 sm:px-6" data-testid="helper-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D96838]"><Sparkles className="h-4 w-4" />AI assistant</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-stone-900">Village Helper</h1>
          <p className="mt-2 text-stone-600">Ask about local resources, how the Village works, or staying safe. For emergencies, call 911.</p>
        </div>
        {msgs.length > 0 && <button onClick={clear} data-testid="helper-clear-btn" className="flex items-center gap-1 text-sm text-stone-500 hover:text-red-700"><Trash2 className="h-4 w-4" />Clear</button>}
      </div>
      <div className="mt-8 min-h-[320px] flex-1 space-y-3 rounded-xl border border-[#E5E3D8] bg-[#F4F3EE] p-4" data-testid="helper-messages">
        {msgs.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => <button key={s} onClick={() => ask(s)} data-testid="helper-starter-btn" className="rounded-xl border border-[#E5E3D8] bg-white p-3 text-left text-sm text-stone-700 transition-colors hover:border-[#588157]">{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => <Bubble key={m.message_id || i} m={m} />)}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="mt-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask the Village Helper…" data-testid="helper-input"
          className="h-12 flex-1 rounded-lg border border-[#E5E3D8] bg-white px-4 text-sm outline-none focus:border-[#1E3D2F]" />
        <button type="submit" disabled={busy} data-testid="helper-send-btn" aria-label="Send" className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#D96838] text-white transition-colors hover:bg-[#BE5527] disabled:opacity-60">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-2 text-xs text-stone-500">AI answers can be wrong. Confirm details with the organization directly.</p>
    </div>
  );
}
