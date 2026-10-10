"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Bot, ChevronDown, CircleHelp, LayoutDashboard, Menu, MessageSquare, Package, Phone, Settings, MessageCircle } from "lucide-react";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Conversations", href: "/dashboard/conversations", icon: MessageSquare },
  { label: "Catalogue", href: "/dashboard/catalogue", icon: Package },
  { label: "WhatsApp", href: "/dashboard/whatsapp", icon: Phone },
  { label: "Shop settings", href: "/dashboard/settings", icon: Settings },
  { label: "AI assistant", href: "/dashboard/ai", icon: Bot },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = navigation.find((item) => item.href === path)?.label ?? navigation.find((item) => path.startsWith(item.href) && item.href !== "/dashboard")?.label ?? "Overview";
  return <div className="dashboard-shell">
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-slate-900/30 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`dashboard-sidebar ${mobileOpen ? "open" : ""}`}>
      <Link href="/" className="brand"><span className="brand-mark"><MessageCircle size={16}/></span>relay<span className="brand-period">.</span></Link>
      <div className="workspace-label">WORKSPACE</div><button className="workspace-switch"><span className="workspace-avatar">S</span><span><b>My storefront</b><small>Business workspace</small></span><ChevronDown size={13} color="#9aa39b"/></button>
      <div className="nav-section">YOUR BUSINESS</div><nav className="dash-nav">{navigation.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={path === href || (href !== "/dashboard" && path.startsWith(href)) ? "active" : ""}><Icon/>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><a className="sidebar-help" href="mailto:support@relay.example"><CircleHelp size={15}/> Help & support</a><div className="profile-row"><span className="profile-avatar">BO</span><span><b>Business owner</b><small>Workspace admin</small></span><BarChart3 size={14} color="#91a092"/></div></div>
    </aside>
    <div className="dash-main"><header className="dash-topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19}/></button><div className="breadcrumbs">Workspace <span style={{padding:"0 8px",color:"#c2c9c1"}}>/</span> <b>{page}</b></div><div className="connection-pill"><i/> WhatsApp not connected</div></header><main className="dash-content">{children}</main></div>
  </div>;
}
