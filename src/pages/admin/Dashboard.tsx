import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Users, Briefcase, CreditCard, TrendingUp, Activity, 
  IndianRupee, DollarSign, MessageSquare, Megaphone, 
  Paperclip, Calendar, User 
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";

type Period = "day" | "month" | "year";

function useDashboard(period: Period) {
  const summary = useQuery({ queryKey: ["dashboard", "summary"], queryFn: () => apiFetch<any>("/dashboard/summary"), refetchInterval: 5000 });
  const activity = useQuery({ queryKey: ["dashboard", "activity"], queryFn: () => apiFetch<any[]>("/dashboard/activity"), refetchInterval: 5000 });
  const stats = useQuery({
    queryKey: ["dashboard", "payment-stats", period],
    queryFn: () => apiFetch<any>(`/dashboard/payment-stats?period=${period}`),
    refetchInterval: 5000
  });
  const progress = useQuery({ queryKey: ["dashboard", "project-progress"], queryFn: () => apiFetch<any[]>("/dashboard/project-progress"), refetchInterval: 5000 });
  return { summary, activity, stats, progress };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    planning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    on_hold: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return <Badge variant="outline" className={`capitalize text-xs ${map[status] ?? ""}`}>{status.replace("_", " ")}</Badge>;
}

function PaymentStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: "text-emerald-500",
    pending: "text-orange-500",
    submitted: "text-blue-500",
    first_verified: "text-indigo-500",
    failed: "text-red-500",
  };
  return <span className={`font-medium capitalize ${map[status] ?? "text-muted-foreground"}`}>{status.replace("_", " ")}</span>;
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const { summary, activity, stats, progress } = useDashboard(period);
  const [activeAlertNote, setActiveAlertNote] = useState<any | null>(null);

  // Fetch notes to display important alert notices as popup dialogs
  const { data: notesData } = useQuery<any>({
    queryKey: ["dashboard-important-notes"],
    queryFn: () => apiFetch<any>("/notes"),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!notesData?.data) return;
    const importantNotes = notesData.data.filter((n: any) => n.isImportant && (n.popupTarget === 'admin' || n.popupTarget === 'both'));
    if (importantNotes.length === 0) {
      setActiveAlertNote(null);
      return;
    }

    // Check localStorage for dismissed notes
    const dismissedStr = localStorage.getItem("sbs_dismissed_notes") || "[]";
    const dismissedIds = JSON.parse(dismissedStr) as string[];

    // Find the first important note that is not dismissed
    const activeAlert = importantNotes.find((n: any) => !dismissedIds.includes(n._id));
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

  const isLoading = summary.isLoading || activity.isLoading || stats.isLoading || progress.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-32 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-72 sm:h-96 w-full" />
          <Skeleton className="col-span-1 h-72 sm:h-96 w-full" />
        </div>
      </div>
    );
  }

  const s = summary.data;
  const totalRevenueNormalized = s?.totalRevenueINR ?? 0;
  const totalPendingNormalized = s?.pendingPaymentsINR ?? 0;

  const statCards = [
    { title: "Active Projects", value: s?.activeProjects ?? 0, icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Clients", value: s?.totalClients ?? 0, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Total Outstanding Due", value: formatCurrency(totalPendingNormalized, "INR"), icon: CreditCard, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Paid Amount (INR)", value: formatCurrency(totalRevenueNormalized, "INR"), icon: IndianRupee, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const chartData = stats.data?.paymentsByMonth ?? [];

  const periodLabels: Record<Period, string> = { day: "Daily (30 Days)", month: "Monthly", year: "Yearly" };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 sm:space-y-8">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                  <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold mt-1 text-foreground truncate">{stat.value}</h3>
                </div>
                <div className={`p-2.5 sm:p-4 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Revenue Chart with Period Toggle */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base sm:text-lg font-serif">Revenue Overview (₹ INR)</CardTitle>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {(["day", "month", "year"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all capitalize ${
                      period === p
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "day" ? "Day" : p === "month" ? "Month" : "Year"}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
          </CardHeader>
          <CardContent>
            <div className="h-56 sm:h-72 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={period === "day" ? 4 : 0} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                    <Tooltip
                      cursor={{ fill: "rgba(120, 120, 120, 0.08)" }}
                      contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: number, name: string) => [formatCurrency(val, "INR"), name === "collected" ? "Collected" : "Pending"]}
                    />
                    <Legend formatter={(v) => v === "collected" ? "Collected" : "Pending"} />
                    <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="collected" />
                    <Bar dataKey="pending" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="pending" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No payment data yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg font-serif flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50 max-h-64 sm:max-h-72 overflow-y-auto">
              {activity.data?.map((item: any) => (
                <div key={item.id} className="px-4 sm:px-5 py-3">
                  <div className="flex items-start gap-2">
                    {item.type === "chat" ? (
                      <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                    ) : (
                      <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      {item.type === "chat" ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">💬 {item.message}</span>
                          {item.status === "unread" && (
                            <span className="inline-flex items-center gap-0.5 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              NEW
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-foreground line-clamp-2">{item.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium text-primary capitalize">{item.type}</span>
                        {item.status && item.type !== "chat" && <PaymentStatus status={item.status} />}
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!activity.data?.length && (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Progress Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg font-serif">Projects Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Budget</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {progress.data?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-sm truncate max-w-[130px]">{p.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[100px]">{p.clientName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs font-bold text-foreground w-9 text-right">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-foreground">{formatCurrency(p.totalAmount, p.currency)}</span>
                      <p className="text-xs text-emerald-500">{formatCurrency(p.paidAmount, p.currency)} paid</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!progress.data?.length && (
              <div className="py-10 text-center text-muted-foreground text-sm">No projects found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Important Alert Notice Modal for Admin */}
      <Dialog open={activeAlertNote !== null} onOpenChange={(open) => !open && activeAlertNote && handleDismissAlert(activeAlertNote._id)}>
        <DialogContent className="sm:max-w-md border-t-4 border-t-rose-500 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-rose-600 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-rose-500 animate-bounce" />
              Important News for you Admin!
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
