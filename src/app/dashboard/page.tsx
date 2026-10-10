import Link from "next/link";
import { Activity, ArrowRight, Bot, MessageSquare, Package, Phone, Settings, Sparkles, Upload, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentBusinessId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  let businessName = "Your shop";
  let productCount = 0;
  let activeChats = 0;
  let recent: { id: string; customerId: string; status: string; updatedAt: Date; messages: { content: string; role: string }[] }[] = [];
  let databaseReady = true;
  try {
    const businessId = await currentBusinessId();
    if (businessId) {
      const [business, products, chats, conversations] = await Promise.all([
        prisma.business.findUnique({ where: { id: businessId }, select: { name: true } }),
        prisma.product.count({ where: { businessId, active: true } }),
        prisma.conversation.count({ where: { businessId, status: "OPEN" } }),
        prisma.conversation.findMany({ where: { businessId }, include: { messages: { orderBy: { timestamp: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" }, take: 4 }),
      ]);
      businessName = business?.name ?? businessName;
      productCount = products;
      activeChats = chats;
      recent = conversations;
    }
  } catch (error) { console.error("Dashboard summary unavailable", error); databaseReady = false; }

  const stats = [
    { label: "Products in catalogue", value: String(productCount), hint: productCount ? "Structured and searchable" : "Add your first products", icon: Package },
    { label: "Open conversations", value: String(activeChats), hint: "Across your WhatsApp inbox", icon: MessageSquare },
    { label: "AI assistant", value: "Ready", hint: "Grounded in your shop data", icon: Sparkles },
    { label: "WhatsApp", value: "Connect", hint: "Link your business number", icon: Phone },
  ];
  const checklist = [
    { label: "Add products to your catalogue", href: "/dashboard/catalogue", done: productCount > 0 },
    { label: "Set your opening hours and delivery", href: "/dashboard/settings", done: false },
    { label: "Connect your WhatsApp number", href: "/dashboard/whatsapp", done: false },
  ];
  return <div>
    <div className="page-title-row"><div><div className="eyebrow-small">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date()).toUpperCase()}</div><h1>Good to see you, {businessName}</h1><p>Here’s what’s happening in your storefront today.</p></div><Link className="button button-primary button-sm" href="/dashboard/catalogue"><Upload size={13}/> Import catalogue</Link></div>
    {!databaseReady && <div className="notice error">We couldn’t reach the shop database. Check your database connection, then reload this page.</div>}
    <div className="stat-grid">{stats.map(({ label, value, hint, icon: Icon }) => <article key={label} className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon/></span></div><div className="stat-value">{value}</div><div className="stat-hint">{hint}</div></article>)}</div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h2>Recent conversations</h2><p>Your latest customer activity</p></div><Link className="text-link" href="/dashboard/conversations">View inbox <ArrowRight size={12}/></Link></div><div className="activity-list">{recent.length ? recent.map((item) => { const last = item.messages[0]; return <Link href="/dashboard/conversations" className="activity-row" key={item.id}><span className="activity-icon"><MessageSquare/></span><span className="activity-copy"><b>{item.customerId.replace(/@c\.us$/, "")}</b><span>{last?.content ?? "New conversation"}</span></span><time className="activity-time">{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(item.updatedAt)}</time></Link>; }) : <div className="empty-inline"><MessageSquare size={19}/><div>No customer conversations yet</div><span>Once WhatsApp is connected, messages appear here.</span></div>}</div></section>
      <section className="panel"><div className="panel-head"><div><h2>Finish setting up</h2><p>A few steps to get your assistant ready</p></div><Zap size={15} color="#799477"/></div><div className="setup-list">{checklist.map(({ label, href, done }) => <div className="setup-row" key={label}><span className={`setup-check ${done ? "done" : ""}`}>{done ? <Activity size={10}/> : null}</span><span>{label}</span><Link href={href}>{done ? "Review" : "Set up"}</Link></div>)}</div></section>
    </div>
    <div className="panel" style={{marginTop:13}}><div className="panel-head"><div><h2>Your assistant is grounded in your business</h2><p>Products, opening hours, delivery and policies become useful answers in customer chats.</p></div><Bot size={18} color="#61836a"/></div><div className="setup-list" style={{display:"flex",gap:18,flexWrap:"wrap"}}><Link className="text-link" href="/dashboard/catalogue"><Package size={13}/> Manage products</Link><Link className="text-link" href="/dashboard/settings"><Settings size={13}/> Shop information</Link><Link className="text-link" href="/dashboard/whatsapp"><Phone size={13}/> Connect WhatsApp</Link></div></div>
  </div>;
}
