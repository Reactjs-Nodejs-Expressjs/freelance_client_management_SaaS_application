import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, LogOut, Menu, X, User, Bell, CreditCard, MessageSquare, QrCode, Sun, Moon } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useLogout, useAuthUser } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Inline Payment QR using api.qrserver.com
const PAYMENT_NUMBER = "9121751697";

interface Msg { id: string; subject: string; message: string; isRead: boolean; category?: string; createdAt: string; }
interface MsgsResp { messages: Msg[]; unreadCount: number; }

const navItems = [
  { href: "/client", label: "Overview", icon: LayoutDashboard },
  { href: "/client/project", label: "Project", icon: Briefcase },
  { href: "/client/payments", label: "Payments", icon: CreditCard },
  { href: "/client/chat", label: "Chat", icon: MessageSquare },
  { href: "/client/profile", label: "Profile", icon: User },
];

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [qrAmount, setQrAmount] = useState("");
  const logout = useLogout();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();

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

  const { data: msgsData } = useQuery<MsgsResp>({
    queryKey: ["client-messages"],
    queryFn: () => apiFetch<MsgsResp>("/messages"),
    refetchInterval: 5000,
  });

  const { data: chatUnreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["client-chat-unread"],
    queryFn: () => apiFetch<{ unreadCount: number }>("/chat/unread"),
    refetchInterval: 5000,
  });
  const chatUnreadCount = chatUnreadData?.unreadCount ?? 0;

  // Client live work status
  const { data: clientStatusData } = useQuery<{ isLiveWorking: boolean; chatDisabled: boolean }>({
    queryKey: ["client-status"],
    queryFn: () => apiFetch<{ isLiveWorking: boolean; chatDisabled: boolean }>("/chat/client-status"),
    refetchInterval: 5000,
  });
  const isLiveWorking = clientStatusData?.isLiveWorking ?? false;

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/messages/${id}/read`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-messages"] }); },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch("/messages/read-all", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-messages"] }); },
  });

  const messages = (msgsData?.messages ?? []).filter(m => m.category !== 'chat');
  const unreadCount = messages.filter(m => !m.isRead).length;

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "C";

  // Fetch admin branding (logo + text)
  const { data: brandingData } = useQuery<{ logoUrl: string; logoText: string }>({
    queryKey: ["admin-branding"],
    queryFn: () => apiFetch<{ logoUrl: string; logoText: string }>("/auth/branding"),
    staleTime: 30000,
  });
  const brandLogoUrl = brandingData?.logoUrl;
  const brandLogoText = brandingData?.logoText || "Strategic Brand";

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="p-4 lg:p-6 flex items-center gap-3 shrink-0 border-b border-sidebar-accent/20">
        {brandLogoUrl ? (
          <img
            src={brandLogoUrl.startsWith("http") ? brandLogoUrl : `${(window as any).BACKEND_URL}${brandLogoUrl}`}
            alt="SBS"
            className="w-9 h-9 rounded-full border-2 border-primary shrink-0 object-cover"
          />
        ) : (
          <img src={logo} alt="SBS" className="w-9 h-9 rounded-full border-2 border-primary shrink-0 object-cover" />
        )}
        <div className="min-w-0">
          <span className="font-serif font-bold text-sidebar-foreground text-sm leading-tight block">{brandLogoText}</span>
          <span className="text-[10px] text-sidebar-foreground/60 block">Client Portal</span>
        </div>
        {isMobile && (
          <button className="lg:hidden ml-auto p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-sidebar-foreground/60" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/client"
            ? location === "/client" || location === "/client/"
            : location.startsWith(href);
          return (
            <Link
              key={href} href={href}
              onClick={() => isMobile && setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label === "Overview" ? "My Overview" : label === "Project" ? "My Project" : label === "Payments" ? "Payments & Invoices" : label}</span>
              {label === "Chat" && chatUnreadCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  {chatUnreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="p-3 border-t border-sidebar-accent/30 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2 rounded-lg bg-sidebar-accent/20">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name ?? "Client"}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate(undefined, { onSuccess: () => { window.location.href = "/login"; } })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden lg:flex w-56 bg-sidebar flex-col shadow-xl shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-sidebar flex flex-col shadow-2xl">
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-12 sm:h-14 lg:h-16 border-b border-border bg-card flex items-center gap-2 sm:gap-3 px-2 sm:px-4 lg:px-6 shrink-0 shadow-sm">
          {/* Hamburger — desktop only (mobile uses bottom nav) */}
          <button className="hidden sm:flex lg:hidden p-1.5 rounded-lg hover:bg-muted" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-[8px] sm:text-[9px] lg:text-[10px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-md shadow-indigo-500/20 tracking-widest uppercase shrink-0 select-none">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span className="hidden sm:inline">Client</span> Portal
          </div>
          {user?.name && (
            <span className="hidden sm:inline text-xs sm:text-sm text-muted-foreground font-medium truncate max-w-[120px] sm:max-w-none">
              Welcome, {user.name.split(" ")[0]} 👋
            </span>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(prev => !prev)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors text-foreground flex items-center justify-center cursor-pointer"
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />}
            </button>

            {/* Chat icon */}
            <div className="relative">
              <Link href="/client/chat">
                <button className="relative p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-center text-foreground hover:text-primary" title="Chat with Admin">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  {chatUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-indigo-600 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                    </span>
                  )}
                </button>
              </Link>
            </div>

            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-primary text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-10 sm:top-12 w-[min(320px,calc(100vw-1rem))] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <span className="font-semibold text-sm">Messages from SBS</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline">
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setNotifOpen(false)}>
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 sm:max-h-80 overflow-y-auto divide-y divide-border/50">
                      {messages.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No messages yet</div>
                      ) : messages.map(m => (
                        <div
                          key={m.id}
                          className={`px-4 py-3 transition-colors hover:bg-muted/40 cursor-pointer ${!m.isRead ? "bg-primary/5" : ""}`}
                          onClick={() => { if (!m.isRead) markRead.mutate(m.id); }}
                        >
                          <div className="flex items-start gap-2">
                            {!m.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                            <div className={`min-w-0 flex-1 ${m.isRead ? "ml-4" : ""}`}>
                              <p className="text-xs font-semibold text-foreground">{m.subject}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.message}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                {new Date(m.createdAt).toLocaleString()}
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

            {/* QR Payment Icon */}
            <div className="relative">
              <button
                onClick={() => { setQrOpen(o => !o); setNotifOpen(false); }}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary flex items-center gap-1"
                title="Pay via QR Code"
              >
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden md:inline text-xs font-medium">QR</span>
              </button>

              {qrOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setQrOpen(false)} />
                  <div className="absolute right-0 top-10 sm:top-12 w-[min(288px,calc(100vw-1rem))] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-indigo-500/10">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Payment QR Code</span>
                      </div>
                      <button onClick={() => setQrOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                    <div className="p-4 flex flex-col items-center gap-3">
                      <p className="text-xs text-muted-foreground text-center">Scan to pay via GPay / PhonePe / Paytm</p>
                      <div className="w-full space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Enter Amount (INR)</label>
                        <input
                          type="number"
                          placeholder="Optional amount..."
                          className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:border-primary text-foreground"
                          value={qrAmount}
                          onChange={(e) => setQrAmount(e.target.value)}
                        />
                      </div>
                      <div className="p-1 border border-primary/20 rounded-xl bg-white shadow-sm">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            qrAmount && parseFloat(qrAmount) > 0
                              ? `upi://pay?pa=akhilthadaka1@ybl&pn=Strategic%20Brand%20Solutions&cu=INR&am=${qrAmount}`
                              : `upi://pay?pa=akhilthadaka1@ybl&pn=Strategic%20Brand%20Solutions&cu=INR`
                          )}`}
                          alt="Payment QR Code"
                          className="w-40 h-40 rounded-lg"
                        />
                      </div>
                      <p className="text-xs font-mono text-primary bg-primary/5 px-3 py-1.5 rounded-lg text-center select-all">UPI ID: akhilthadaka1@ybl</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(o => !o); setQrOpen(false); setNotifOpen(false); }}
                className="relative flex items-center justify-center rounded-full hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none"
              >
                {user?.photoUrl ? (
                  <img
                    src={user.photoUrl.startsWith('http') ? user.photoUrl : `${(window as any).BACKEND_URL}${user.photoUrl}`}
                    alt={user.name || "Client"}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs sm:text-sm">
                    {initials}
                  </div>
                )}
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-10 sm:top-12 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 bg-muted/10">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name || "Client"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/client/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors w-full text-left">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        My Profile
                      </Link>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout.mutate(undefined, { onSuccess: () => { window.location.href = "/login"; } });
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors w-full text-left font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto pb-16 lg:pb-0">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12">
            <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation Bar (hidden on lg+) ─────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.12)] flex items-stretch">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/client"
            ? location === "/client" || location === "/client/"
            : location.startsWith(href);
          const isChatItem = label === "Chat";
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                {isChatItem && chatUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[8px] font-bold flex items-center justify-center">
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </span>
                )}
                {label === "Overview" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${isActive ? "text-primary" : ""}`}>
                {label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
