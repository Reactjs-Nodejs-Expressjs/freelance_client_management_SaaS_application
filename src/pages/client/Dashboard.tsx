import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Briefcase, ArrowRight, CreditCard, Calendar, Clock,
  CheckCircle2, AlertCircle, Bell, X, MessageSquare,
  Megaphone, User, Paperclip
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthUser } from "@/hooks/useAuth";
import { formatCurrency, type Currency } from "@/lib/currency";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  planning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  on_hold: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

interface Project {
  id: string; name: string; status: string; progress: number;
  totalAmount: number; paidAmount: number; currency: string;
  startDate: string | null; deadline: string | null; description: string | null;
}
interface Payment {
  id: string; amount: number; currency: string; status: string;
  note: string | null; createdAt: string; projectId?: string;
  projectName?: string | null;
}
interface Msg { id: number; subject: string; message: string; isRead: boolean; createdAt: string; }
interface ProjectsResp { data: Project[]; }
interface PaymentsResp { data: Payment[]; }
interface MsgsResp { messages: Msg[]; unreadCount: number; }

const getClientPaymentStatusLabel = (status: string) => {
  if (status === "verified") return "Verified / Paid ✅";
  if (status === "first_verified") return "Awaiting Final Verification ⏳";
  if (status === "submitted") return "Under Review 🔍";
  if (status === "pending") return "Unpaid / Pending QR";
  if (status === "failed") return "Verification Failed ❌";
  if (status === "rejected") return "Rejected ❌";
  return status;
};

export default function ClientDashboard() {
  const { data: user, isLoading: loadingUser } = useAuthUser();
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: projectsData, isLoading: loadingProjects } = useQuery<ProjectsResp>({
    queryKey: ["client-projects"],
    queryFn: () => apiFetch<ProjectsResp>("/projects?limit=20"),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const { data: paymentsData } = useQuery<PaymentsResp>({
    queryKey: ["client-payments"],
    queryFn: () => apiFetch<PaymentsResp>("/payments?limit=50"),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const { data: msgsData } = useQuery<MsgsResp>({
    queryKey: ["client-messages-dash"],
    queryFn: () => apiFetch<MsgsResp>("/messages"),
    refetchInterval: 5000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => apiFetch(`/messages/${id}/read`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-messages-dash"] }); qc.invalidateQueries({ queryKey: ["client-messages"] }); },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch("/messages/read-all", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-messages-dash"] }); qc.invalidateQueries({ queryKey: ["client-messages"] }); },
  });

  const [activeAlertNote, setActiveAlertNote] = useState<any | null>(null);

  // Fetch notes to display important alert notices as popup dialogs for clients
  const { data: notesData } = useQuery<any>({
    queryKey: ["client-important-notes"],
    queryFn: () => apiFetch<any>("/notes"),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  // Fetch admin branding (logo + text)
  const { data: brandingData } = useQuery<{ logoUrl: string; logoText: string }>({
    queryKey: ["admin-branding"],
    queryFn: () => apiFetch<{ logoUrl: string; logoText: string }>("/auth/branding"),
    staleTime: 30000,
  });
  const brandLogoText = brandingData?.logoText || "Strategic Brand Solutions";

  useEffect(() => {
    if (!notesData?.data) return;
    // Client should only see alerts targeting 'client' or 'both'
    const clientAlerts = notesData.data.filter((n: any) => n.isImportant && (n.popupTarget === "client" || n.popupTarget === "both"));
    if (clientAlerts.length === 0) {
      setActiveAlertNote(null);
      return;
    }

    // Check localStorage for dismissed notes
    const dismissedStr = localStorage.getItem("sbs_dismissed_notes") || "[]";
    const dismissedIds = JSON.parse(dismissedStr) as string[];

    // Find the first client alert that is not dismissed
    const activeAlert = clientAlerts.find((n: any) => !dismissedIds.includes(n._id));
    if (activeAlert) {
      setActiveAlertNote(activeAlert);
    } else {
      setActiveAlertNote(null);
    }
  }, [notesData]);

  const handleDismissAlert = (noteId: string) => {
    const dismissedStr = localStorage.getItem("sbs_dismissed_notes") || "[]";
    const dismissedIds = JSON.parse(dismissedStr) as string[];
    dismissedIds.push(noteId);
    localStorage.setItem("sbs_dismissed_notes", JSON.stringify(dismissedIds));
    setActiveAlertNote(null);
  };

  if (loadingUser || loadingProjects) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-52 w-full" />
          <div className="grid grid-cols-2 gap-4"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const projects = projectsData?.data ?? [];
  const allPayments = paymentsData?.data ?? [];

  // Selected project (or first active)
  const displayProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId) ?? projects[0] ?? null
    : projects.find(p => p.status !== "completed") ?? projects[0] ?? null;

  const recentPayments = allPayments.filter(p => p.status !== "pending").slice(0, 5);

  // Payment calculations across all projects
  const totalBudget = projects.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = projects.reduce((s, p) => s + p.paidAmount, 0);
  const totalDue = totalBudget - totalPaid;

  // Active project specific pending payments
  const activeProjectPending = displayProject
    ? allPayments
        .filter(p => String(p.projectId) === String(displayProject.id) && (p.status === "pending" || p.status === "submitted" || p.status === "first_verified"))
        .reduce((s, p) => s + p.amount, 0)
    : 0;

  const currency = displayProject?.currency ?? "INR";
  const messages = msgsData?.messages ?? [];
  const unreadMsgs = msgsData?.unreadCount ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

        {/* LEFT / MAIN — 2 cols */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
            {[
              {
                label: "Total Projects",
                subLabel: "active engagements",
                value: projects.length,
                icon: Briefcase,
                gradient: "from-violet-500 to-purple-600",
                textColor: "text-violet-600 dark:text-violet-400",
                accentColor: "bg-violet-500",
                bgGradient: "from-violet-500/[0.06] to-purple-500/[0.01] dark:from-violet-500/[0.1] dark:to-transparent",
                borderColor: "border-violet-500/15 hover:border-violet-500/30 dark:border-zinc-800/40 dark:hover:border-violet-500/40",
                hoverShadow: "hover:shadow-[0_20px_40px_-10px_rgba(124,58,237,0.15)] dark:hover:shadow-[0_20px_40px_-10px_rgba(124,58,237,0.3)]"
              },
              {
                label: "Total Budget",
                subLabel: "contract value",
                value: formatCurrency(totalBudget, currency as Currency),
                icon: CreditCard,
                gradient: "from-blue-500 to-indigo-600",
                textColor: "text-blue-600 dark:text-blue-400",
                accentColor: "bg-blue-500",
                bgGradient: "from-blue-500/[0.06] to-indigo-500/[0.01] dark:from-blue-500/[0.1] dark:to-transparent",
                borderColor: "border-blue-500/15 hover:border-blue-500/30 dark:border-zinc-800/40 dark:hover:border-blue-500/40",
                hoverShadow: "hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.15)] dark:hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)]"
              },
              {
                label: "Total Paid",
                subLabel: "verified transactions",
                value: formatCurrency(totalPaid, currency as Currency),
                icon: CheckCircle2,
                gradient: "from-emerald-500 to-teal-600",
                textColor: "text-emerald-600 dark:text-emerald-400",
                accentColor: "bg-emerald-500",
                bgGradient: "from-emerald-500/[0.06] to-teal-500/[0.01] dark:from-emerald-500/[0.1] dark:to-transparent",
                borderColor: "border-emerald-500/15 hover:border-emerald-500/30 dark:border-zinc-800/40 dark:hover:border-emerald-500/40",
                hoverShadow: "hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.15)] dark:hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]"
              },
              {
                label: "Amount Due",
                subLabel: "awaiting payment",
                value: formatCurrency(totalDue, currency as Currency),
                icon: AlertCircle,
                gradient: "from-rose-500 to-pink-600",
                textColor: "text-rose-600 dark:text-rose-400",
                accentColor: "bg-rose-500",
                bgGradient: "from-rose-500/[0.06] to-pink-500/[0.01] dark:from-rose-500/[0.1] dark:to-transparent",
                borderColor: "border-rose-500/15 hover:border-rose-500/30 dark:border-zinc-800/40 dark:hover:border-rose-500/40",
                hoverShadow: "hover:shadow-[0_20px_40px_-10px_rgba(244,63,94,0.15)] dark:hover:shadow-[0_20px_40px_-10px_rgba(244,63,94,0.3)]"
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`group relative bg-white/80 dark:bg-zinc-950/60 backdrop-blur-md border ${s.borderColor} rounded-2xl shadow-sm ${s.hoverShadow} hover:-translate-y-1 transition-all duration-500 overflow-hidden`}
                >
                  {/* Decorative Radial Background Light */}
                  <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-br ${s.bgGradient} rounded-full blur-3xl opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-700 pointer-events-none`} />

                  {/* Left Side Subtle Colored Strip indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${s.accentColor} rounded-l-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="p-4 flex flex-col items-start gap-2.5 relative z-10 h-full w-full">
                    {/* Row 1: Icon */}
                    <div className={`p-2 rounded-xl bg-gradient-to-tr ${s.gradient} text-white shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Row 2: Text */}
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block leading-tight truncate">
                        {s.label}
                      </span>
                      <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-600 block mt-0.5 lowercase tracking-normal truncate">
                        {s.subLabel}
                      </span>
                    </div>

                    {/* Row 3: Amount */}
                    <div className="mt-1">
                      <p className={`font-extrabold tracking-tight ${s.textColor} text-xs sm:text-sm md:text-base leading-none`}>
                        {s.value}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 sm:p-16 text-center text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>You don't have any active projects yet.</p>
                <p className="text-sm mt-2">Contact us at <span className="text-primary">akhilthadaka97@gmail.com</span> to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Project Selector (if multiple projects) */}
              {projects.length > 1 && (
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-muted-foreground shrink-0">Viewing project:</p>
                  <Select
                    value={selectedProjectId || (projects.find(p => p.status !== "completed")?.id ?? projects[0]?.id ?? "")}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger className="max-w-xs h-9 text-sm">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {p.status.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Active Project Card */}
              {displayProject && (
                <Card className="border-primary/20 shadow-md">
                  <CardContent className="p-5 sm:p-7">
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                      <div className="flex-1 min-w-0 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Briefcase className="text-primary w-5 h-5 shrink-0" />
                          <h3 className="text-xl sm:text-2xl font-bold text-foreground">{displayProject.name}</h3>
                          <Badge variant="outline" className={`capitalize ${STATUS_COLORS[displayProject.status] ?? ""}`}>
                            {displayProject.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {displayProject.description && (
                          <p className="text-muted-foreground text-sm">{displayProject.description}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                          {displayProject.startDate && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Start Date</p>
                              <p className="font-medium text-sm flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />{new Date(displayProject.startDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          {displayProject.deadline && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
                              <p className="font-medium text-sm flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />{new Date(displayProject.deadline).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Total Value</p>
                            <p className="font-semibold text-sm">
                              {formatCurrency(displayProject.totalAmount, displayProject.currency as Currency)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Progress Circle */}
                      <div className="w-full lg:w-44 bg-muted/30 p-5 rounded-2xl flex flex-col items-center border border-border/50 shrink-0">
                        <p className="text-xs font-medium text-muted-foreground mb-3">Progress</p>
                        <div className="relative w-24 h-24 flex items-center justify-center mb-3">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle className="text-muted stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
                            <circle
                              className="text-primary stroke-current transition-all duration-700"
                              strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent"
                              strokeDasharray={`${(displayProject.progress || 0) * 2.51} 251.2`}
                            />
                          </svg>
                          <span className="absolute text-xl font-bold text-foreground">{displayProject.progress}%</span>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                          <Link href={`/client/project?id=${displayProject.id}`} className="w-full">
                            <Button className="w-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 group text-sm">
                              View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                          {/* Pay Remaining Balance button */}
                          {(displayProject.totalAmount - displayProject.paidAmount) > 0 && (
                            <Link href="/client/payments" className="w-full">
                              <Button variant="outline" className="w-full text-sm border-primary/30 text-primary hover:bg-primary/5">
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Pay Balance
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-serif flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" /> Payment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Budget</span>
                      <span className="font-bold">{formatCurrency(displayProject?.totalAmount ?? 0, currency as Currency)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Paid</span>
                      <span className="font-bold text-emerald-500">{formatCurrency(displayProject?.paidAmount ?? 0, currency as Currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-500">
                      <span className="text-sm flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Amount Due
                      </span>
                      <span className="font-bold">{formatCurrency((displayProject?.totalAmount ?? 0) - (displayProject?.paidAmount ?? 0), currency as Currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-blue-500">
                      <span className="text-sm text-muted-foreground">Pending Verification</span>
                      <span className="font-bold">{activeProjectPending > 0 ? formatCurrency(activeProjectPending, currency as Currency) : "--"}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${displayProject && displayProject.totalAmount > 0 ? (displayProject.paidAmount / displayProject.totalAmount * 100) : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Payments */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-serif">Recent Payments</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                      {recentPayments.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No payments yet</div>
                      ) : recentPayments.map(p => (
                        <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-primary">{p.projectName || "Project"}</p>
                            <p className="text-sm font-semibold">{formatCurrency(p.amount, p.currency as Currency)}</p>
                            {p.note && <p className="text-xs text-muted-foreground truncate">{p.note}</p>}
                            <p className="text-[10px] text-muted-foreground/60">{new Date(p.createdAt).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline" className={`capitalize text-xs shrink-0 ${
                            p.status === "verified" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                            p.status === "pending" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                            "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          }`}>
                            {getClientPaymentStatusLabel(p.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* RIGHT — Messages / Notifications Panel */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="border-border/60 shadow-sm flex flex-col h-[700px]">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm font-serif flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary animate-bounce" />
                Messages from {brandLogoText}
                {unreadMsgs > 0 && (
                  <Badge className="bg-primary text-white text-[10px] h-4 px-1.5">{unreadMsgs}</Badge>
                )}
              </CardTitle>
              {unreadMsgs > 0 && (
                <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              <div className="divide-y divide-border/50 flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="px-4 py-10 text-center text-muted-foreground text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No messages yet.</p>
                    <p className="text-xs mt-1">Updates from your agency will appear here.</p>
                  </div>
                ) : messages.map(m => {
                  // Detect chat messages — show summarized version
                  const isChat = m.subject?.toLowerCase().includes("message") || m.subject?.toLowerCase().includes("chat");
                  return (
                    <div
                      key={m.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${!m.isRead ? "bg-primary/5" : ""}`}
                      onClick={() => { if (!m.isRead) markRead.mutate(m.id); }}
                    >
                      <div className="flex items-start gap-2">
                        {!m.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                        <div className={`min-w-0 flex-1 ${m.isRead ? "ml-4" : ""}`}>
                          {isChat ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <MessageSquare className="w-3 h-3 text-indigo-500" />
                              </div>
                              <p className="text-xs font-semibold text-foreground">Admin messaged you 💬</p>
                              {!m.isRead && (
                                <span className="inline-flex items-center bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                  NEW
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-foreground leading-tight">{m.subject}</p>
                          )}
                          {!isChat && <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{m.message}</p>}
                          {m.isRead && !isChat && (
                            <span className="text-[10px] text-emerald-500 font-medium">✓ Read</span>
                          )}
                          <p className="text-[10px] text-muted-foreground/50 mt-1">
                            {new Date(m.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Project list summary */}
          {projects.length > 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-serif flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> My Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {/* Active Projects Segment */}
                  {projects.filter(p => p.status !== "completed").length > 0 && (
                    <div className="bg-muted/30 px-4 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none select-none">
                      Active Projects
                    </div>
                  )}
                  {projects.filter(p => p.status !== "completed").map(p => (
                    <Link
                      key={p.id}
                      href={`/client/project?id=${p.id}`}
                      className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors cursor-pointer block"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-muted rounded-full h-1 w-16">
                            <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span className="text-[10px] text-primary font-bold">{p.progress}%</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`capitalize text-[10px] shrink-0 ${STATUS_COLORS[p.status] ?? ""}`}>
                        {p.status.replace("_", " ")}
                      </Badge>
                    </Link>
                  ))}

                  {/* Completed Projects Segment */}
                  {projects.filter(p => p.status === "completed").length > 0 && (
                    <div className="bg-muted/30 px-4 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none select-none border-t border-border/50">
                      Completed Projects
                    </div>
                  )}
                  {projects.filter(p => p.status === "completed").map(p => (
                    <Link
                      key={p.id}
                      href={`/client/project?id=${p.id}`}
                      className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors cursor-pointer block"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-muted rounded-full h-1 w-16">
                            <div className="bg-emerald-500 h-1 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span className="text-[10px] text-emerald-500 font-bold">{p.progress}%</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`capitalize text-[10px] shrink-0 ${STATUS_COLORS[p.status] ?? ""}`}>
                        {p.status.replace("_", " ")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* Important Alert Notice Modal for Client */}
      <Dialog open={activeAlertNote !== null} onOpenChange={(open) => !open && activeAlertNote && handleDismissAlert(activeAlertNote._id)}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-xl border-t-4 border-t-rose-500 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-rose-600 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-rose-500 animate-bounce" />
              Important Notice for you!
            </DialogTitle>
          </DialogHeader>
          {activeAlertNote && (
            <div className="space-y-4 pt-2">
              <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl space-y-3">
                <h3 className="font-black text-foreground text-sm font-serif">{activeAlertNote.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{activeAlertNote.content}</p>
                
                {/* Attachments preview inside alert modal */}
                {activeAlertNote.attachments && activeAlertNote.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-500/10">
                    <p className="text-[10px] text-muted-foreground w-full font-semibold uppercase tracking-wider">Attachments:</p>
                    {activeAlertNote.attachments.map((url: string, idx: number) => {
                      const filename = url.split('/').pop() || "Attachment";
                      return (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-[10px] text-primary hover:underline bg-background border px-2.5 py-1 rounded-md"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{filename}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span className="font-semibold text-foreground/80 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Posted by: {activeAlertNote.author}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" /> 
                  {new Date(activeAlertNote.date).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button 
                  onClick={() => handleDismissAlert(activeAlertNote._id)}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-4 h-9"
                >
                  Acknowledge & Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
