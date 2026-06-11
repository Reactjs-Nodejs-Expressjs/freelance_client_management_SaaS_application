import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Briefcase, CreditCard, Settings,
  LogOut, Menu, X, Bell, Search, ChevronRight, Key, UserCheck, MessageSquare,
  CalendarDays, FileText, BarChart3, Receipt, Star, Sun, Moon
} from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useNotifications } from "@/hooks/useNotifications";
import { useLogout, useAuthUser } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/credentials", label: "Credentials", icon: Key },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({ href, label, icon: Icon, location, onClick }: {
  href: string; label: string; icon: React.ElementType; location: string; onClick?: () => void;
}) {
  const isActive = href === "/" ? location === "/" : location.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [search, setSearch] = useState("");
  const logout = useLogout();
  const { data: user } = useAuthUser();

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);
  const { data: notifsData, refetch: refetchNotifs } = useNotifications(5000);

  const { data: chatUnreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["admin-chat-unread"],
    queryFn: () => apiFetch<{ unreadCount: number }>("/chat/unread"),
    refetchInterval: 5000,
  });
  const chatUnreadCount = chatUnreadData?.unreadCount ?? 0;
  
  const notifications = notifsData?.notifications ?? [];
  
  // Split notifications into General and Login Activity
  const loginNotifs = notifications.filter(n => n.category === 'login_activity');
  const generalNotifs = notifications.filter(n => n.category !== 'login_activity');
  
  const unreadLoginCount = loginNotifs.filter(n => !n.isRead).length;
  const unreadGeneralCount = generalNotifs.filter(n => !n.isRead).length;

  const markAllRead = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }),
    onSuccess: () => refetchNotifs(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => refetchNotifs(),
  });

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const sidebarLogoUrl = (user as any)?.logoUrl;
    const sidebarLogoText = (user as any)?.logoText || "Strategic Brand";
    return (
    <>
      <div className="p-4 lg:p-5 flex items-center gap-3 shrink-0 border-b border-sidebar-accent/20">
        <img
          src={sidebarLogoUrl ? (sidebarLogoUrl.startsWith("http") ? sidebarLogoUrl : `${(window as any).BACKEND_URL}${sidebarLogoUrl}`) : logo}
          alt="SBS"
          className="w-9 h-9 rounded-full border-2 border-primary shrink-0 object-cover"
        />
        <div className="min-w-0">
          <span className="font-serif font-bold text-sidebar-foreground text-sm leading-tight block">{sidebarLogoText}</span>
          <span className="text-[10px] text-sidebar-foreground/50 block">Admin Dashboard</span>
        </div>
        {isMobile && (
          <button className="ml-auto p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-sidebar-foreground/60" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.href} {...item} location={location} onClick={() => isMobile && setSidebarOpen(false)} />
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-accent/30 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2 rounded-lg bg-sidebar-accent/20">
          {user?.photoUrl ? (
            <img
              src={user.photoUrl.startsWith('http') ? user.photoUrl : `${(window as any).BACKEND_URL}${user.photoUrl}`}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name ?? "Admin"}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate(undefined, { onSuccess: () => { window.location.href = "/login"; } })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </>
    );
  };

  const filteredNotifs = search.trim()
    ? generalNotifs.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase())
      )
    : generalNotifs;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 xl:w-64 bg-sidebar flex-col shadow-xl shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-sidebar flex flex-col shadow-2xl">
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 sm:h-16 border-b border-border bg-card flex items-center gap-3 px-3 sm:px-5 shrink-0 shadow-sm">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-muted" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-slate-800 to-zinc-700 dark:from-indigo-600 dark:to-violet-600 text-white font-bold text-[9px] sm:text-[10px] px-3 py-1.5 rounded-lg shadow-md shadow-slate-500/20 dark:shadow-indigo-500/20 tracking-widest uppercase shrink-0 select-none">
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Admin Portal
          </div>

          {/* Search */}
          <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 bg-muted/60 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
              placeholder="Search notifications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => search && setNotifOpen(true)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDark(prev => !prev)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground flex items-center justify-center cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-violet-600" />}
            </button>

            {/* Chat message notifications */}
            <div className="relative">
              <Link href="/chat">
                <button
                  className="relative p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-center text-foreground hover:text-primary"
                  title="Admin Chat"
                >
                  <MessageSquare className="w-5 h-5" />
                  {chatUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                    </span>
                  )}
                </button>
              </Link>
            </div>

            {/* Client Logins Activity Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setSessionOpen(o => !o); setNotifOpen(false); }}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
                title="Client Session Logs"
              >
                <UserCheck className="w-5 h-5 text-foreground" />
                {unreadLoginCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadLoginCount > 9 ? "9+" : unreadLoginCount}
                  </span>
                )}
              </button>

              {sessionOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSessionOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <span className="font-semibold text-sm">Client Session Logs</span>
                      <div className="flex items-center gap-2">
                        {unreadLoginCount > 0 && (
                          <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline">
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setSessionOpen(false)}>
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                      {loginNotifs.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No login activity yet</div>
                      ) : loginNotifs.slice(0, 20).map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors ${n.isRead ? "" : "bg-primary/5"}`}
                          onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                        >
                          <div className="flex items-start gap-2">
                            {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                            <div className={`min-w-0 flex-1 ${n.isRead ? "ml-4" : ""}`}>
                              <p className="text-xs font-semibold text-foreground">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* General Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(o => !o); setSessionOpen(false); }}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-foreground" />
                {unreadGeneralCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadGeneralCount > 9 ? "9+" : unreadGeneralCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <span className="font-semibold text-sm">Notifications</span>
                      <div className="flex items-center gap-2">
                        {unreadGeneralCount > 0 && (
                          <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline">
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setNotifOpen(false)}>
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                      {filteredNotifs.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
                      ) : filteredNotifs.slice(0, 20).map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                          onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                        >
                          <div className="flex items-start gap-2">
                            {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                            <div className={`min-w-0 flex-1 ${n.isRead ? "ml-4" : ""}`}>
                              <p className="text-xs font-semibold text-foreground">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
