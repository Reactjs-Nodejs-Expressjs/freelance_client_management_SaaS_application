import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ExternalLink, Image as ImageIcon, Calendar, Clock, Briefcase, QrCode, FileText, Download, FileDown, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { useAuthUser } from "@/hooks/useAuth";
import { formatCurrency, type Currency } from "@/lib/currency";

interface Project {
  id: string; name: string; status: string; progress: number;
  totalAmount: number; paidAmount: number; currency: string;
  startDate: string | null; deadline: string | null; description: string | null;
}
interface Update {
  id: string; title: string; description: string | null; progress: number;
  links: string[] | null; imageUrls: string[] | null; createdAt: string;
}
interface Payment {
  id: string; amount: number; currency: string; status: string;
  note: string | null; qrToken: string | null; createdAt: string;
  projectName?: string | null;
  clientName?: string | null;
  firstVerifiedAt?: string | null;
  secondVerifiedAt?: string | null;
}
interface ProjectsResp { data: Project[]; }
interface UpdatesResp { data: Update[]; }
interface PaymentsResp { data: Payment[]; }

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  planning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  on_hold: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const getClientPaymentStatusLabel = (status: string) => {
  if (status === "verified") return "Verified / Paid ✅";
  if (status === "first_verified") return "Not Verified (Payment Done)";
  if (status === "submitted") return "Not Verified (Payment Done)";
  if (status === "pending") return "Unpaid / Pending QR";
  if (status === "failed") return "Verification Failed ❌";
  if (status === "rejected") return "Rejected ❌";
  return status;
};

function useClientProject(selectedId: string | null) {
  const { data: user } = useAuthUser();

  const { data: projectsData, isLoading: loadingProjects } = useQuery<ProjectsResp>({
    queryKey: ["client-projects-detail"],
    queryFn: () => apiFetch<ProjectsResp>("/projects?limit=20"),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const project = selectedId
    ? projectsData?.data?.find(p => p.id === selectedId) ?? projectsData?.data?.find(p => p.status !== "completed") ?? projectsData?.data?.[0]
    : projectsData?.data?.find(p => p.status !== "completed") ?? projectsData?.data?.[0];

  const projectCount = projectsData?.data?.length ?? 0;

  const { data: updatesData, isLoading: loadingUpdates } = useQuery<UpdatesResp>({
    queryKey: ["client-updates", project?.id],
    queryFn: () => apiFetch<UpdatesResp>(`/updates?projectId=${project!.id}`),
    enabled: !!project?.id,
    refetchInterval: 5000,
  });

  const { data: paymentsData, isLoading: loadingPayments } = useQuery<PaymentsResp>({
    queryKey: ["client-payments-detail", project?.id],
    queryFn: () => apiFetch<PaymentsResp>(`/payments?projectId=${project!.id}&limit=50`),
    enabled: !!project?.id,
    refetchInterval: 5000,
  });

  return {
    project,
    projectCount,
    projects: projectsData?.data ?? [],
    updates: updatesData?.data ?? [],
    payments: paymentsData?.data ?? [],
    isLoading: loadingProjects || (project ? (loadingUpdates || loadingPayments) : false),
  };
}

export default function ClientProjectDetail() {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("id");
  });

  // Sync state with URL change
  useEffect(() => {
    const handleUrlChange = () => {
      const id = new URLSearchParams(window.location.search).get("id");
      setSelectedId(id);
    };
    window.addEventListener("popstate", handleUrlChange);
    // Monkey patch pushState to listen to same-page navigations (by wouter or wouter's Link)
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      history.pushState = originalPushState;
    };
  }, []);

  const { project, projectCount, projects, updates, payments, isLoading } = useClientProject(selectedId);
  const { data: user } = useAuthUser();
  const [, setLocation] = useLocation();
  const [projectTab, setProjectTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    if (project && project.status === "completed") {
      setProjectTab("completed");
    } else {
      setProjectTab("active");
    }
  }, [project]);

  const [activeQrPayment, setActiveQrPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // ---- Invoice export helpers ----
  const getInvoiceEl = () => document.getElementById("printable-invoice-detail");

  const downloadPDF = async () => {
    const el = getInvoiceEl();
    if (!el) return;
    setIsExporting(true);
    try {
      const canvas = await (window as any).html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`invoice-${selectedInvoice?.id?.slice(-8) ?? "SBS"}.pdf`);
    } catch (e) { console.error(e); }
    finally { setIsExporting(false); }
  };

  const downloadImage = async () => {
    const el = getInvoiceEl();
    if (!el) return;
    setIsExporting(true);
    try {
      const canvas = await (window as any).html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `invoice-${selectedInvoice?.id?.slice(-8) ?? "SBS"}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } catch (e) { console.error(e); }
    finally { setIsExporting(false); }
  };

  const downloadWord = () => {
    const el = getInvoiceEl();
    if (!el) return;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/><title>Invoice</title></head><body>${el.innerHTML}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${selectedInvoice?.id?.slice(-8) ?? "SBS"}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg font-serif">No active project found.</p>
        <p className="text-sm mt-2">Please contact us to get started.</p>
      </div>
    );
  }

  const projectPending = payments
    .filter(p => p.status === "pending" || p.status === "submitted" || p.status === "first_verified")
    .reduce((sum, p) => sum + p.amount, 0);
  const remaining = project.totalAmount - project.paidAmount;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Project Selector dropdown if multiple projects exist */}
      {projects && projects.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
          {/* Active vs Completed Tab Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 max-w-xs select-none shrink-0 h-9">
            <button
              type="button"
              onClick={() => {
                setProjectTab("active");
                const firstActive = projects.find(p => p.status !== "completed");
                if (firstActive) {
                  setSelectedId(firstActive.id);
                  setLocation(`/client/project?id=${firstActive.id}`);
                }
              }}
              className={`flex-1 text-center text-[10px] sm:text-xs py-1.5 px-3 rounded-md font-bold transition-all ${
                projectTab === "active"
                  ? "bg-background text-primary shadow-xs border border-border/20 font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Projects
            </button>
            <button
              type="button"
              onClick={() => {
                setProjectTab("completed");
                const firstCompleted = projects.find(p => p.status === "completed");
                if (firstCompleted) {
                  setSelectedId(firstCompleted.id);
                  setLocation(`/client/project?id=${firstCompleted.id}`);
                }
              }}
              className={`flex-1 text-center text-[10px] sm:text-xs py-1.5 px-3 rounded-md font-bold transition-all ${
                projectTab === "completed"
                  ? "bg-background text-primary shadow-xs border border-border/20 font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed Projects
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Select Project:</span>
            <Select
              value={project.id}
              onValueChange={(val) => {
                setSelectedId(val);
                setLocation(`/client/project?id=${val}`);
              }}
            >
              <SelectTrigger className="w-56 h-9 text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter(p => projectTab === "completed" ? p.status === "completed" : p.status !== "completed")
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Header Card */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">{project.name}</h1>
                <Badge variant="outline" className={`capitalize ${STATUS_COLORS[project.status] ?? ""}`}>
                  {project.status.replace("_", " ")}
                </Badge>
              </div>
              {project.description && <p className="text-muted-foreground text-sm">{project.description}</p>}
              <div className="flex flex-wrap gap-3 sm:gap-5 text-sm text-muted-foreground">
                {project.startDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />Start: {new Date(project.startDate).toLocaleDateString()}
                  </span>
                )}
                {project.deadline && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />Due: {new Date(project.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {/* Circular Progress */}
            <div className="shrink-0 flex items-center gap-4 sm:gap-6">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-muted stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent" />
                  <circle
                    className="text-primary stroke-current transition-all duration-1000"
                    strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent"
                    strokeDasharray={`${(project.progress || 0) * 2.51} 251.2`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                  {project.progress}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              {projectCount}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Projects</p>
              <p className="text-sm font-semibold text-foreground">Active Portal Services</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Project Type</p>
              <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                {project.name.toLowerCase().includes("web") || project.name.toLowerCase().includes("app")
                  ? "Web Development"
                  : project.name.toLowerCase().includes("design") || project.name.toLowerCase().includes("brand")
                  ? "Brand Design & Identity"
                  : "Creative Consultation"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              {project.progress}%
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Development Progress</p>
              <p className="text-sm font-semibold text-foreground">Milestones Accomplished</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg sm:text-xl font-serif font-semibold text-foreground">Project Timeline</h2>

          {updates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center text-muted-foreground text-sm">
                No updates posted yet. Check back soon!
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-[480px] overflow-y-auto pr-2 scrollbar-thin">
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {updates.map((update) => (
                  <div key={update.id} className="relative">
                    <div className="absolute -left-6 top-3 w-4 h-4 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">{update.title}</h4>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-muted rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${update.progress}%` }} />
                              </div>
                              <span className="text-xs font-bold text-primary">{update.progress}%</span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(update.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {update.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{update.description}</p>
                        )}
                        {((update.imageUrls?.length ?? 0) > 0 || (update.links?.length ?? 0) > 0) && (
                          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                            {update.imageUrls?.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 px-2 py-1.5 rounded-md">
                                <ImageIcon className="w-3 h-3" />Attachment {i + 1}
                              </a>
                            ))}
                            {update.links?.map((link, i) => (
                              <a key={i} href={link} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-secondary hover:underline bg-secondary/10 px-2 py-1.5 rounded-md">
                                <ExternalLink className="w-3 h-3" />View Link
                              </a>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-5">
          {/* Financial */}
          <Card className="border-t-4 border-t-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border/50 text-sm">
                <span className="text-muted-foreground">Total Budget</span>
                <span className="font-semibold">{formatCurrency(project.totalAmount, project.currency as Currency)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50 text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold text-emerald-500">{formatCurrency(project.paidAmount, project.currency as Currency)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50 text-sm text-orange-500">
                <span className="text-muted-foreground font-medium">Pending Verification</span>
                <span className="font-semibold">{projectPending > 0 ? formatCurrency(projectPending, project.currency as Currency) : "--"}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm">
                <span className="text-muted-foreground font-medium">Remaining</span>
                <span className="font-bold text-foreground">{formatCurrency(remaining, project.currency as Currency)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${project.totalAmount > 0 ? (project.paidAmount / project.totalAmount * 100) : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payments list with modal QR */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif">Invoices & Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                {payments.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">No payment history yet.</div>
                ) : payments.map((payment) => {
                  const getStatusIcon = (status: string) => {
                    if (status === "verified") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                    if (status === "first_verified") return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
                    if (status === "pending") return <Clock className="w-4 h-4 text-orange-600" />;
                    if (status === "submitted") return <Clock className="w-4 h-4 text-blue-600" />;
                    return <Clock className="w-4 h-4 text-gray-500" />;
                  };
                  const getIconBg = (status: string) => {
                    if (status === "verified") return "bg-emerald-500/10 dark:bg-emerald-950/20";
                    if (status === "first_verified") return "bg-indigo-500/10 dark:bg-indigo-950/20";
                    if (status === "pending") return "bg-orange-500/10 dark:bg-orange-950/20";
                    if (status === "submitted") return "bg-blue-500/10 dark:bg-blue-950/20";
                    return "bg-gray-500/10 dark:bg-gray-950/20";
                  };

                  return (
                    <div key={payment.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/5 transition-colors">
                      {/* Left: Icon + Text details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getIconBg(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{project.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                            {payment.note && (
                              <>
                                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/35" />
                                <span className="truncate max-w-[120px]" title={payment.note}>{payment.note}</span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2.5 mt-1">
                            {/* Show QR if pending */}
                            {payment.status === "pending" && payment.qrToken && (
                              <Button
                                size="sm"
                                variant="link"
                                className="h-auto p-0 text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                onClick={() => setActiveQrPayment(payment)}
                              >
                                <QrCode className="w-2.5 h-2.5" /> View QR
                              </Button>
                            )}
                              <Button
                                size="sm"
                                variant="link"
                                className="h-auto p-0 text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                onClick={() => window.open(`${(window as any).BACKEND_URL}/uploads/invoices/invoice-${payment.id}.html`, "_blank")}
                              >
                                <FileText className="w-2.5 h-2.5" /> Invoice
                              </Button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Status Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-bold text-foreground text-xs sm:text-sm">
                          {formatCurrency(payment.amount, payment.currency as Currency)}
                        </span>
                        <Badge variant="outline" className={`capitalize text-[9px] py-0 px-1 mt-0.5 ${
                          payment.status === "verified" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          payment.status === "first_verified" ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                          payment.status === "pending" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                          payment.status === "submitted" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-gray-500/10 text-gray-500 border-gray-500/20"
                        }`}>
                          {getClientPaymentStatusLabel(payment.status)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Premium QrCode Modal */}
      <Dialog open={activeQrPayment !== null} onOpenChange={(open) => !open && setActiveQrPayment(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center font-serif text-lg">Scan & Pay</DialogTitle>
          </DialogHeader>
          {activeQrPayment && (
            <div className="py-4 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Scan the QR code below to complete the payment for your project.
              </p>
              <div className="p-4 bg-white rounded-xl shadow-lg border border-border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    `upi://pay?pa=akhilthadaka1@ybl&pn=Strategic%20Brand%20Solutions&cu=INR&am=${activeQrPayment.amount}`
                  )}`}
                  alt="Payment QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <div className="w-full space-y-2 text-left bg-muted p-3 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(activeQrPayment.amount, activeQrPayment.currency as Currency)}
                  </span>
                </div>
                {activeQrPayment.note && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="font-medium text-foreground text-xs truncate max-w-[180px]">
                      {activeQrPayment.note}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-1 pt-1.5 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground font-mono truncate">
                    UPI ID:
                  </span>
                  <span className="font-mono text-xs text-foreground bg-background px-2 py-1 rounded break-all select-all">
                    akhilthadaka1@ybl
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={selectedInvoice !== null} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
          {selectedInvoice && (
            <div className="space-y-6 print:p-0 bg-card text-card-foreground p-4 rounded-lg border border-border/50" id="printable-invoice-detail">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-border pb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">INVOICE</h2>
                  <p className="text-xs text-muted-foreground">Invoice Reference: #{selectedInvoice.id ? selectedInvoice.id.slice(-8).toUpperCase() : "UNKNOWN"}</p>
                  <p className="text-xs text-muted-foreground">
                    Issue Date: {
                      selectedInvoice.status === "verified" && selectedInvoice.secondVerifiedAt
                        ? new Date(selectedInvoice.secondVerifiedAt).toLocaleDateString()
                        : new Date(selectedInvoice.createdAt).toLocaleDateString()
                    }
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <h3 className="font-bold text-primary text-sm font-serif">Strategic Brand Solutions</h3>
                  <p className="text-[11px] text-muted-foreground">akhilthadaka97@gmail.com</p>
                  <p className="text-[11px] text-muted-foreground">Creative Digital Consultancy</p>
                </div>
              </div>

              {/* Billed To / Details */}
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground text-xs uppercase mb-1">Billed To</p>
                  <p className="font-bold text-foreground">{selectedInvoice.clientName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Company: {user?.company || "Client Company"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-muted-foreground text-xs uppercase mb-1">Payment Status</p>
                  <Badge variant="outline" className={`capitalize font-semibold text-xs py-1 px-2.5 ${
                    selectedInvoice.status === "verified" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    selectedInvoice.status === "first_verified" ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                    selectedInvoice.status === "submitted" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                    selectedInvoice.status === "failed" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                    "bg-orange-500/10 text-orange-600 border-orange-500/20"
                  }`}>
                    {getClientPaymentStatusLabel(selectedInvoice.status)}
                  </Badge>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Service / Project Item</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Requested Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-foreground">{selectedInvoice.projectName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedInvoice.note || "Project milestone billing installment request."}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-foreground">
                        {formatCurrency(selectedInvoice.amount, selectedInvoice.currency as Currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center bg-muted/40 p-4 rounded-lg">
                <div className="text-xs text-muted-foreground max-w-[320px]">
                  All invoice transactions are secured by Strategic Brand Solutions. Please complete pending payments via payment QR codes or direct transfer.
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">TOTAL BILL DUE</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatCurrency(selectedInvoice.amount, selectedInvoice.currency as Currency)}
                  </span>
                </div>
              </div>

              {/* Payment QR Code for Invoice */}
              <div className="flex justify-between items-center border-t border-border pt-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Payment Information</p>
                  <p className="text-sm font-bold text-foreground">UPI Payment (GPay / PhonePe / Paytm)</p>
                  <p className="text-xs text-muted-foreground">UPI ID: akhilthadaka1@ybl</p>
                </div>
                <div className="text-right">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                      `upi://pay?pa=akhilthadaka1@ybl&pn=Strategic%20Brand%20Solutions&cu=INR&am=${selectedInvoice.amount}`
                    )}`}
                    alt="Payment QR"
                    className="w-24 h-24 ml-auto border rounded-xl p-1.5 bg-white shadow-sm"
                  />
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border print:hidden">
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
                <Button
                  variant="outline"
                  className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                  onClick={downloadWord}
                  disabled={isExporting}
                >
                  <FileDown className="w-4 h-4 mr-1.5" /> Word (.doc)
                </Button>
                <Button
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={downloadImage}
                  disabled={isExporting}
                >
                  <ImageIcon className="w-4 h-4 mr-1.5" /> {isExporting ? "Exporting..." : "Save JPG"}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={downloadPDF}
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4 mr-1.5" /> {isExporting ? "Exporting..." : "Download PDF"}
                </Button>
                <Button
                  className="bg-primary text-primary-foreground"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Completed Projects List (Always visible at the bottom) */}
      {projects.filter(p => p.status === "completed").length > 0 && (
        <Card className="border-t-4 border-t-emerald-500 shadow-sm mt-6">
          <CardHeader className="pb-2 bg-emerald-500/[0.02] border-b border-border/40">
            <CardTitle className="text-base sm:text-lg font-serif font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Completed Projects History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {projects
                .filter(p => p.status === "completed")
                .map((compProj) => (
                  <div key={compProj.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-muted/5 transition-colors">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-foreground text-base">{compProj.name}</h4>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 capitalize text-[10px] font-bold">
                          Completed
                        </Badge>
                      </div>
                      {compProj.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl leading-relaxed mt-1">
                          {compProj.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
                        {compProj.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Start: {new Date(compProj.startDate).toLocaleDateString()}
                          </span>
                        )}
                        {compProj.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Ended: {new Date(compProj.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-end gap-3 md:gap-1.5 shrink-0 self-stretch justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Total Amount</span>
                        <span className="font-extrabold text-foreground text-sm">
                          {formatCurrency(compProj.totalAmount, compProj.currency as Currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Paid Amount</span>
                        <span className="font-bold text-emerald-500 text-sm">
                          {formatCurrency(compProj.paidAmount, compProj.currency as Currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
