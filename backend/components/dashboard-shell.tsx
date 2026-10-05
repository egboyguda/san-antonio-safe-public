"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  BellRing,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MapPinned,
  Menu,
  Radio,
  ShieldCheck,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/incidents", label: "Incidents", icon: ListTodo },
  { href: "/dashboard/map", label: "Live map", icon: MapPinned },
  { href: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

type DashboardUser = {
  name: string;
  email: string;
  role: string;
};

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <div className="brand">
        <span className="brand-mark"><ShieldCheck size={24} /></span>
        {!collapsed && (
          <span>
            <strong>SanAntonioSafe</strong>
            <small>Command Center</small>
          </span>
        )}
      </div>
      <nav className="sidebar-nav" aria-label="Command center navigation">
        {!collapsed && <p className="nav-label">Operations</p>}
        {navigation.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
              {item.label === "Incidents" && !collapsed && (
                <span className="live-pip" title="Live data"><Radio size={11} /></span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className={`connection ${online ? "online" : "offline"}`}>
          <span />
          {!collapsed && (online ? "Systems online" : "Connection lost")}
        </div>
        <button
          className="collapse-button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
        </button>
      </div>
    </>
  );

  return (
    <div className={`dashboard-frame ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="desktop-sidebar">{sidebar}</aside>
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-sidebar" onClick={(event) => event.stopPropagation()}>
            <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="dashboard-main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>
          <div className="topbar-context">
            <Activity size={18} />
            <span>Municipal Emergency Operations</span>
          </div>
          <div className="user-menu">
            <span className="user-avatar"><CircleUserRound size={21} /></span>
            <span className="user-copy">
              <strong>{user.name}</strong>
              <small>{user.role.replaceAll("_", " ")}</small>
            </span>
            <button onClick={signOut} disabled={signingOut} title="Sign out" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
