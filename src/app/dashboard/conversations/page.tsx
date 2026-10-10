"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LoaderCircle, MessageSquare, RefreshCw, Send } from "lucide-react";

type Message = { id: string; role: string; content: string; timestamp: string };
type Conversation = { id: string; customerId: string; status: string; updatedAt: string; messages: Message[]; customer?: { name: string | null; phone: string } | null };
const phoneLabel = (id: string) => id.replace(/@c\.us$/, "").replace(/\D/g, "");

export default function ConversationsPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const load = useCallback(async () => { try { const [response, waResponse] = await Promise.all([fetch("/api/conversations", { cache: "no-store" }), fetch("/api/whatsapp", { cache: "no-store" })]); const result = await response.json(); const wa = await waResponse.json(); if (!response.ok) throw new Error(result.message); setItems(result.conversations ?? []); setConnection(wa.status === "CONNECTED"); setSelectedId((current) => current || result.conversations?.[0]?.id || ""); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "We couldn't load your inbox."); } finally { setLoading(false); } }, []);
  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); const id = window.setInterval(() => void load(), 7000); return () => { window.clearTimeout(initial); window.clearInterval(id); }; }, [load]);
  const selected = items.find((item) => item.id === selectedId);
  const send = async (event: FormEvent) => { event.preventDefault(); if (!draft.trim() || !selected) return; setSending(true); try { const response = await fetch(`/api/conversations/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft.trim() }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message); setDraft(""); await load(); } catch (e) { setError(e instanceof Error ? e.message : "We couldn't send that reply."); } finally { setSending(false); } };

  return <div><div className="page-title-row"><div><div className="eyebrow-small">CUSTOMER CARE</div><h1>Conversations</h1><p>Pick up where your assistant or customer left off.</p></div><button className="button button-ghost button-sm" onClick={() => void load()}><RefreshCw size={13}/> Refresh</button></div>{error && <div className="notice error">{error}</div>}
    <section className="panel conversation-layout"><div className="conversation-list">{loading ? Array.from({length:5}).map((_,i)=><div key={i} className="conversation-person"><div className="skeleton" style={{width:32,height:32,borderRadius:"50%"}}/><div style={{flex:1}}><div className="skeleton" style={{height:9,width:"45%",marginBottom:8}}/><div className="skeleton" style={{height:8,width:"80%"}}/></div></div>) : items.length ? items.map((item)=><button key={item.id} onClick={()=>setSelectedId(item.id)} className={`conversation-person ${item.id===selectedId?"active":""}`} style={{width:"100%",textAlign:"left",border:0,background:item.id===selectedId?"#f5f8f4":"white"}}><span className="person-avatar">{(item.customer?.name ?? phoneLabel(item.customerId)).slice(0,1).toUpperCase()}</span><span className="person-copy"><b>{item.customer?.name ?? `+${phoneLabel(item.customerId)}`}</b><span>{item.messages[item.messages.length-1]?.content ?? "No messages yet"}</span></span><time className="activity-time">{new Intl.DateTimeFormat("en",{hour:"numeric",minute:"2-digit"}).format(new Date(item.updatedAt))}</time></button>) : <div className="empty-inline"><MessageSquare size={19}/><div>Your inbox is quiet</div><span>Customer conversations arrive after WhatsApp is connected.</span></div>}</div>
      <div className="conversation-thread">{selected ? <><header className="thread-head"><b>{selected.customer?.name ?? `+${phoneLabel(selected.customerId)}`}</b><span style={{color:"#9aa39b",marginLeft:8}}>{selected.status.toLowerCase()}</span></header><div className="thread-body">{selected.messages.map((message)=><div key={message.id} className={`thread-message ${message.role === "assistant" ? "outbound" : ""}`}>{message.content}<time className="thread-time">{new Intl.DateTimeFormat("en",{hour:"numeric",minute:"2-digit"}).format(new Date(message.timestamp))}{message.role === "assistant" ? " · assistant" : ""}</time></div>)}</div><form className="thread-compose" onSubmit={send}><input className="field" value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder={connection?"Write a reply…":"Connect WhatsApp to reply"} disabled={!connection || sending}/><button aria-label="Send reply" className="button button-primary button-sm" disabled={!connection || sending || !draft.trim()}>{sending ? <LoaderCircle size={13} className="animate-spin"/> : <Send size={13}/>}</button></form></> : <div className="empty-inline" style={{margin:"auto"}}><MessageSquare size={20}/><div>{loading ? "Loading your inbox…" : "Select a conversation"}</div><span>Customer messages and replies appear here.</span></div>}</div>
    </section>
  </div>;
}
