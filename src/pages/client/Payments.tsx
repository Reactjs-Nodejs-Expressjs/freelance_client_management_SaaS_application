import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiUpload } from "@/lib/api";
import { useAuthUser } from "@/hooks/useAuth";
import { formatCurrency, type Currency } from "@/lib/currency";
import { CreditCard, QrCode, UploadCloud, CheckCircle2, AlertCircle, ArrowRight, FileText, Download, Image as ImageIcon, Printer, FileDown, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface Project {
  id: string; name: string; status: string; progress: number;
  totalAmount: number; paidAmount: number; currency: string;
  createdAt?: string;
}
interface Payment {
  id: string; projectId: string; projectName: string | null; clientName: string | null;
  amount: number; currency: string; status: string; qrToken: string | null;
  isUsed: boolean; screenshotUrl: string | null; note: string | null; createdAt: string;
  firstVerifiedAt?: string | null; secondVerifiedAt?: string | null;
  rejectReason?: string | null;
}
interface ProjectsResp { data: Project[]; }
interface PaymentsResp { data: Payment[]; }

const getClientPaymentStatusLabel = (status: string) => {
  if (status === "verified") return "Verified / Paid ✅";
  if (status === "first_verified") return "Not Verified (Payment Done)";
  if (status === "submitted") return "Not Verified (Payment Done)";
  if (status === "pending") return "Unpaid / Pending QR";
  if (status === "failed") return "Verification Failed ❌";
  if (status === "rejected") return "Rejected ❌";
  return status;
};

const DefaultLogoSvg = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 shrink-0">
    <rect width="48" height="48" rx="12" fill="url(#logo_grad)" />
    <path d="M24 11L35 29H13L24 11Z" fill="white" fillOpacity="0.95" />
    <path d="M24 18L30 28H18L24 18Z" fill="url(#logo_inner_grad)" />
    <circle cx="24" cy="15" r="2.5" fill="#FFE600" />
    <defs>
      <linearGradient id="logo_grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
      <linearGradient id="logo_inner_grad" x1="18" y1="18" x2="30" y2="29" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
  </svg>
);

export default function ClientPayments() {
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [activeQrPayment, setActiveQrPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [proofPayment, setProofPayment] = useState<Payment | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [paymentType, setPaymentType] = useState<string>("GPay");
  const [note, setNote] = useState<string>("");
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [qrAmount, setQrAmount] = useState<string>("");
  const [cardQrAmount, setCardQrAmount] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Queries
  const { data: projectsData } = useQuery<ProjectsResp>({
    queryKey: ["client-projects-payments"],
    queryFn: () => apiFetch<ProjectsResp>("/projects?limit=20"),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const { data: paymentsData, isLoading: loadingPayments } = useQuery<PaymentsResp>({
    queryKey: ["client-payments-list"],
    queryFn: () => apiFetch<PaymentsResp>("/payments?limit=100"),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const { data: adminInfo } = useQuery<{ name: string; email: string; phone: string; company: string; photoUrl: string; logoUrl: string; logoText: string; address: string }>({
    queryKey: ["admin-public-info"],
    queryFn: () => apiFetch<any>("/auth/admin-info"),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (file: File) => apiUpload(file),
    onSuccess: (data) => {
      setScreenshotUrl(data.url);
      toast({ title: "Screenshot uploaded successfully!" });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  });

  const submitProofMutation = useMutation({
    mutationFn: ({ paymentId, body }: { paymentId: string; body: any }) =>
      apiFetch(`/payments/${paymentId}/submit`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-payments-list"] });
      qc.invalidateQueries({ queryKey: ["client-projects-payments"] });
      qc.invalidateQueries({ queryKey: ["client-projects-detail"] });
      qc.invalidateQueries({ queryKey: ["client-projects"] });
      qc.invalidateQueries({ queryKey: ["client-payments"] });
      toast({
        title: "Payment Proof Submitted ✅",
        description: "Your payment submission is now under review by our admin.",
      });
      // Reset form
      setSelectedPaymentId("");
      setNote("");
      setScreenshotUrl("");
      setCustomAmount("");
    },
    onError: (e: Error) => {
      toast({ title: "Submission Failed", description: e.message, variant: "destructive" });
    }
  });

  const directPayMutation = useMutation({
    mutationFn: (body: any) =>
      apiFetch(`/payments/direct-submit`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-payments-list"] });
      qc.invalidateQueries({ queryKey: ["client-projects-payments"] });
      qc.invalidateQueries({ queryKey: ["client-payments"] });
      toast({
        title: "Payment Proof Submitted ✅",
        description: "Direct payment submission received. Under review by admin.",
      });
      setSelectedPaymentId("");
      setNote("");
      setScreenshotUrl("");
      setCustomAmount("");
    },
    onError: (e: Error) => {
      toast({ title: "Submission Failed", description: e.message, variant: "destructive" });
    }
  });

  // Helper to get full image URL
  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${(window as any).BACKEND_URL}${url}`;
  };

  const fetchAsDataUrl = async (url: string): Promise<string> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return "";
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Failed to fetch image as data URL:", err);
      return "";
    }
  };

  useEffect(() => {
    if (!selectedInvoice) {
      setLogoDataUrl("");
      setQrDataUrl("");
      return;
    }

    // Convert admin logo to base64 if it exists
    if (adminInfo?.logoUrl || adminInfo?.photoUrl) {
      const logoUrl = getImageUrl(adminInfo.logoUrl || adminInfo.photoUrl);
      if (logoUrl) {
        fetchAsDataUrl(logoUrl).then(dataUrl => {
          if (dataUrl) setLogoDataUrl(dataUrl);
        });
      }
    }

    // Convert QR code image to base64 if it's not verified
    if (selectedInvoice.status !== "verified") {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
        `upi://pay?pa=akhilthadaka1@ybl&pn=Strategic%20Brand%20Solutions&cu=INR&am=${selectedInvoice.amount}`
      )}`;
      fetchAsDataUrl(qrCodeUrl).then(dataUrl => {
        if (dataUrl) setQrDataUrl(dataUrl);
      });
    }
  }, [selectedInvoice, adminInfo?.logoUrl, adminInfo?.photoUrl]);

  // ---- Invoice export helpers (html2canvas + jsPDF loaded via CDN) ----
  const getInvoiceEl = () => document.getElementById("printable-invoice");

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
    } catch (e) {
      toast({ title: "Export Failed", description: "Could not generate PDF.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const projects = projectsData?.data ?? [];
  const payments = paymentsData?.data ?? [];

  // Generate dynamic pending invoices for projects with uncovered remaining balance
  const actualActiveInvoices = payments.filter(
    p => p.status === "pending" || p.status === "first_verified"
  );
  
  const mockInvoices: Payment[] = [];
  projects.forEach((proj) => {
    // Sum all active/submitted payments for this project in the DB
    const activeSum = payments
      .filter(pay => pay.projectId === proj.id && (pay.status === "pending" || pay.status === "submitted" || pay.status === "first_verified"))
      .reduce((sum, pay) => sum + pay.amount, 0);
    const uncoveredDue = (proj.totalAmount - proj.paidAmount) - activeSum;
    if (uncoveredDue > 0) {
      mockInvoices.push({
        id: `temp-due-${proj.id}`,
        projectId: proj.id,
        projectName: proj.name,
        clientName: user?.name || "Client",
        amount: uncoveredDue,
        currency: proj.currency,
        status: "pending",
        qrToken: null,
        isUsed: false,
        screenshotUrl: null,
        note: "Project Outstanding Balance (Unpaid Due)",
        createdAt: proj.createdAt || new Date().toISOString()
      });
    }
  });

  const activeInvoicesList = [...actualActiveInvoices, ...mockInvoices];

  // Calculate totals
  const totalBudget = projects.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = projects.reduce((sum, p) => sum + p.paidAmount, 0);
  const currency = projects[0]?.currency ?? "INR";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentId) {
      toast({ title: "Please select an invoice request to pay", variant: "destructive" });
      return;
    }
    if (!screenshotUrl) {
      toast({ title: "Please upload a payment screenshot receipt", variant: "destructive" });
      return;
    }

    if (selectedPaymentId === 'direct' || selectedPaymentId.startsWith('temp-due-')) {
      const amountVal = parseFloat(customAmount || "0");
      if (amountVal <= 0) {
        toast({ title: "Please enter a valid amount", variant: "destructive" });
        return;
      }
      const pId = selectedPaymentId.startsWith('temp-due-') ? selectedPaymentId.replace('temp-due-', '') : undefined;
      const projectItem = projects.find(proj => proj.id === pId);
      directPayMutation.mutate({
        screenshotUrl,
        paymentType,
        note: pId ? `Project Balance Payment${note ? ` - ${note}` : ''}` : note,
        amount: amountVal,
        currency: projectItem?.currency ?? 'INR',
        projectId: pId
      });
    } else {
      const selectedPayment = payments.find(p => p.id === selectedPaymentId);
      const amountVal = customAmount ? parseFloat(customAmount) : selectedPayment?.amount;
      submitProofMutation.mutate({
        paymentId: selectedPaymentId,
        body: {
          screenshotUrl,
          paymentType,
          note,
          amount: amountVal,
        }
      });
    }
  };

  const handleSelectPaymentRequest = (id: string) => {
    setSelectedPaymentId(id);
    const matched = payments.find(p => p.id === id);
    if (matched) {
      setCustomAmount(matched.amount.toString());
    } else {
      setCustomAmount("");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* 2-Column Grid Layout: Left has title, stats and tables, Right has Sidebar action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (col-span-2) - Title, Stats and Tables */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Payments & Invoices</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review your invoices, scan payment QRs, and submit transaction proofs for verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Budget", value: formatCurrency(totalBudget, currency as Currency), color: "text-foreground", bg: "bg-muted/40", border: "border-l-slate-400" },
              { label: "Amount Paid", value: formatCurrency(totalPaid, currency as Currency), color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-l-emerald-500" },
              { label: "Amount Due", value: formatCurrency(totalBudget - totalPaid, currency as Currency), color: "text-red-500", bg: "bg-red-50/5", border: "border-l-red-500" },
            ].map((stat, i) => (
              <Card key={i} className={`${stat.bg} border-0 shadow-sm border-l-4 ${stat.border}`}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">{stat.label}</p>
                  <p className={`font-extrabold text-sm sm:text-base md:text-lg ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Active Invoices Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif flex items-center gap-2 text-foreground">
                <CreditCard className="w-5 h-5 text-primary" /> Active Payment Invoices
              </CardTitle>
              <CardDescription>
                Outstanding invoices that require your attention. Scan QR or submit proof of transaction.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPayments ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading invoices...</div>
              ) : activeInvoicesList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No unpaid invoices at the moment.</div>
              ) : (
                <div className="p-4 space-y-3">
                  {activeInvoicesList
                    .map(p => {
                      const getStatusIcon = (status: string) => {
                        if (status === "first_verified") return <CheckCircle2 className="w-5 h-5 text-indigo-600" />;
                        if (status === "rejected") return <AlertCircle className="w-5 h-5 text-red-600" />;
                        return <Clock className="w-5 h-5 text-orange-600" />;
                      };
                      const getIconBg = (status: string) => {
                        if (status === "first_verified") return "bg-indigo-500/10 dark:bg-indigo-950/20";
                        if (status === "rejected") return "bg-red-500/10 dark:bg-red-950/20";
                        return "bg-orange-500/10 dark:bg-orange-950/20";
                      };

                      return (
                        <div 
                          key={p.id}
                          className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/50 gap-4 transition-all hover:shadow-sm ${
                            p.status === "rejected"
                              ? "bg-red-50/20 dark:bg-red-950/5 border-red-500/20"
                              : "bg-card hover:bg-muted/5"
                          }`}
                        >
                          {/* Left: Icon + Text details */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconBg(p.status)}`}>
                              {getStatusIcon(p.status)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-foreground text-sm truncate">{p.projectName || "—"}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>Requested {new Date(p.createdAt).toLocaleDateString()}</span>
                                {p.note && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:inline-block" />
                                    <span className="truncate max-w-[220px]" title={p.note}>{p.note}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Amount, Status Badge, and Action buttons */}
                          <div className="flex flex-wrap items-center gap-4 justify-between md:justify-end shrink-0">
                            <div className="flex flex-col items-start md:items-end">
                              <span className="font-bold text-foreground text-base sm:text-lg">
                                {formatCurrency(p.amount, p.currency as Currency)}
                              </span>
                              <Badge variant="outline" className={`capitalize text-[10px] py-0 px-1.5 mt-0.5 whitespace-nowrap ${
                                p.status === "first_verified" ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                                p.status === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                "bg-orange-500/10 text-orange-600 border-orange-500/20"
                              }`}>
                                {getClientPaymentStatusLabel(p.status)}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs inline-flex items-center gap-1"
                                onClick={() => {
                                  setActiveQrPayment(p);
                                  setQrAmount(p.amount.toString());
                                }}
                              >
                                <QrCode className="w-3.5 h-3.5" /> QR Pay
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-primary text-primary-foreground"
                                onClick={() => {
                                  setProofPayment(p);
                                  setCustomAmount(p.amount.toString());
                                  setNote("");
                                  setScreenshotUrl("");
                                }}
                              >
                                <UploadCloud className="w-3.5 h-3.5 mr-1" /> Submit Proof
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Invoices
              </CardTitle>
              <CardDescription>
                Access and download invoices for your completed payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPayments ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading invoices...</div>
              ) : payments.filter(p => p.status === "verified").length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No invoices available.</div>
              ) : (
                <div className="p-4 space-y-3">
                  {payments
                    .filter(p => p.status === "verified")
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(p => (
                      <div 
                        key={p.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/50 gap-4 transition-all hover:bg-muted/5 bg-card"
                      >
                        {/* Left: Icon + Details */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 dark:bg-emerald-950/20 shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-foreground text-sm truncate">{p.projectName || "—"}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>Paid {new Date(p.createdAt).toLocaleDateString()}</span>
                              {p.note && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                  <span className="truncate max-w-[200px]" title={p.note}>{p.note}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Receipt, Amount, Badge, Invoice Download */}
                        <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 w-full md:w-auto">
                          {p.screenshotUrl && (
                            <div 
                              className="flex items-center gap-2 cursor-pointer group/receipt text-primary"
                              onClick={() => setViewingScreenshot(p.screenshotUrl)}
                            >
                              <div className="w-8 h-8 rounded border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                <img src={getImageUrl(p.screenshotUrl) || ""} alt="Receipt" className="w-full h-full object-cover" />
                              </div>
                              <span className="text-xs font-semibold hover:underline">Receipt</span>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-start md:items-end">
                              <span className="font-bold text-foreground text-sm sm:text-base">
                                {formatCurrency(p.amount, p.currency as Currency)}
                              </span>
                              <Badge 
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 capitalize text-[9px] py-0 px-1.5 mt-0.5 whitespace-nowrap"
                              >
                                Verified / Paid ✅
                              </Badge>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary shrink-0"
                              onClick={() => setSelectedInvoice(p)}
                              title="View Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Submission Log History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif text-foreground">Payment History Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPayments ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading log...</div>
              ) : payments.filter(p => p.status !== "pending").length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No payment logs found.</div>
              ) : (
                <div className="p-4 space-y-3">
                  {payments
                    .filter(p => p.status !== "pending")
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(p => {
                      const getStatusIcon = (status: string) => {
                        if (status === "verified") return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                        if (status === "first_verified") return <Clock className="w-5 h-5 text-indigo-600" />;
                        if (status === "submitted") return <Clock className="w-5 h-5 text-blue-600" />;
                        if (status === "failed" || status === "rejected") return <AlertCircle className="w-5 h-5 text-red-600" />;
                        return <Clock className="w-5 h-5 text-orange-600" />;
                      };
                      const getIconBg = (status: string) => {
                        if (status === "verified") return "bg-emerald-500/10 dark:bg-emerald-950/20";
                        if (status === "first_verified") return "bg-indigo-500/10 dark:bg-indigo-950/20";
                        if (status === "submitted") return "bg-blue-500/10 dark:bg-blue-950/20";
                        if (status === "failed" || status === "rejected") return "bg-red-500/10 dark:bg-red-950/20";
                        return "bg-orange-500/10 dark:bg-orange-950/20";
                      };

                      return (
                        <div 
                          key={p.id}
                          className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/50 gap-4 transition-all hover:shadow-sm ${
                            p.status === "rejected" || p.status === "failed"
                              ? "bg-red-50/20 dark:bg-red-950/5 border-red-500/20"
                              : "bg-card hover:bg-muted/5"
                          }`}
                        >
                          {/* Left: Icon + Text details */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconBg(p.status)}`}>
                              {getStatusIcon(p.status)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-foreground text-sm truncate">{p.projectName || "—"}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                                {p.status === "rejected" && p.rejectReason ? (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                    <span className="text-red-500 font-medium">Reason: {p.rejectReason}</span>
                                  </>
                                ) : p.note ? (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                    <span className="truncate max-w-[220px]" title={p.note}>{p.note}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Right: Receipt, Amount, Badge, Invoice */}
                          <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 w-full md:w-auto">
                            {p.screenshotUrl && (
                              <div 
                                className="flex items-center gap-2 cursor-pointer group/receipt text-primary"
                                onClick={() => setViewingScreenshot(p.screenshotUrl)}
                              >
                                <div className="w-8 h-8 rounded border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                  <img src={getImageUrl(p.screenshotUrl) || ""} alt="Receipt" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs font-semibold hover:underline">Receipt</span>
                              </div>
                            )}

                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-start md:items-end">
                                <span className="font-bold text-foreground text-sm sm:text-base">
                                  {formatCurrency(p.amount, p.currency as Currency)}
                                </span>
                                <Badge 
                                  variant="outline"
                                  className={`capitalize text-[9px] py-0 px-1.5 mt-0.5 whitespace-nowrap ${
                                    p.status === "verified" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                    p.status === "first_verified" ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                                    p.status === "submitted" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                    p.status === "failed" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                    "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                  }`}
                                >
                                  {getClientPaymentStatusLabel(p.status)}
                                </Badge>
                              </div>

                              {p.status === "verified" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary shrink-0"
                                  onClick={() => setSelectedInvoice(p)}
                                  title="View Invoice"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                              ) : (
                                <div className="w-8 h-8 shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column (col-span-1) - Action Sidebar */}
        <div className="space-y-6">
          {/* Payment QR Code Card */}
          <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif text-foreground flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" /> Payment QR Code
              </CardTitle>
              <CardDescription className="text-xs">
                Scan this QR code with any UPI app (GPay, PhonePe, Paytm) to make a payment.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-lg border border-primary/10">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `upi://pay?pa=akhilthadaka1@ybl&pn=Strategic%20Brand%20Solutions&cu=INR${cardQrAmount ? `&am=${cardQrAmount}` : ''}`
                  )}`}
                  alt="Payment QR"
                  className="w-44 h-44"
                />
              </div>
              
              <div className="w-full space-y-1">
                <Label htmlFor="card-qr-amount-edit" className="text-xs text-muted-foreground font-semibold">Payment Amount (INR)</Label>
                <Input
                  id="card-qr-amount-edit"
                  type="number"
                  placeholder="Enter custom amount to pay"
                  value={cardQrAmount}
                  onChange={(e) => setCardQrAmount(e.target.value)}
                  className="h-9 font-semibold text-foreground text-center"
                />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-foreground">Strategic Brand Solutions</p>
                <p className="font-mono text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full select-all">akhilthadaka1@ybl</p>
              </div>
              {(totalBudget - totalPaid) > 0 && (
                <div className="w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-0.5">Amount Due</p>
                  <p className="text-lg font-black text-red-600">{formatCurrency(totalBudget - totalPaid, currency as Currency)}</p>
                </div>
              )}
              
              <Button
                className="w-full bg-primary text-primary-foreground text-xs h-9 mt-1"
                onClick={() => {
                  setProofPayment({
                    id: 'direct',
                    projectId: '',
                    projectName: 'Direct Payment',
                    clientName: user?.name || 'Client',
                    amount: parseFloat(cardQrAmount) || 0,
                    currency: projects[0]?.currency || 'INR',
                    status: 'pending',
                    qrToken: null,
                    isUsed: false,
                    screenshotUrl: null,
                    note: null,
                    createdAt: new Date().toISOString()
                  });
                  setCustomAmount(cardQrAmount || "");
                  setNote("");
                  setScreenshotUrl("");
                }}
                disabled={!cardQrAmount || parseFloat(cardQrAmount) <= 0}
              >
                Submit Proof for {cardQrAmount ? formatCurrency(parseFloat(cardQrAmount), currency as Currency) : 'Payment'}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                After payment, click <span className="font-bold text-foreground">Submit Proof</span> to upload the receipt screenshot.
              </p>
            </CardContent>
          </Card>

          {/* Upload Payment Screenshot Card */}
          <Card 
            className="bg-gradient-to-br from-primary/10 via-indigo-500/5 to-transparent border border-primary/20 hover:border-primary/45 dark:border-primary/30 dark:hover:border-primary/50 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 rounded-xl overflow-hidden p-5 group flex flex-col justify-between"
            onClick={() => {
              setProofPayment({
                id: 'direct',
                projectId: '',
                projectName: 'Direct Payment',
                clientName: user?.name || 'Client',
                amount: parseFloat(cardQrAmount) || 0,
                currency: projects[0]?.currency || 'INR',
                status: 'pending',
                qrToken: null,
                isUsed: false,
                screenshotUrl: null,
                note: null,
                createdAt: new Date().toISOString()
              });
              setCustomAmount(cardQrAmount || "");
              setNote("");
              setScreenshotUrl("");
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
                  <UploadCloud className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    Uploaded Payment Screenshot
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Submit a screenshot receipt to verify.
                  </p>
                </div>
              </div>
              
              <div className="bg-background/40 backdrop-blur-sm rounded-lg p-4 text-center border border-dashed border-primary/30 hover:bg-background/60 transition-colors">
                <span className="text-xs font-semibold text-primary">Click to upload screenshot</span>
              </div>
            </div>
            
            <p className="text-[9px] text-muted-foreground leading-relaxed text-center mt-3">
              Upload screenshot of GPAY, UPI, or Bank transaction.
            </p>
          </Card>
        </div>
      </div>

      {/* QR Code Scan Modal */}
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
                    `upi://pay?pa=akhilthadaka1@ybl&pn=Strategic%20Brand%20Solutions&cu=INR&am=${qrAmount || activeQrPayment.amount}`
                  )}`}
                  alt="Payment QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <div className="w-full space-y-3 text-left bg-muted p-3 rounded-lg text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Project Name:</span>
                  <span className="font-semibold text-foreground">{activeQrPayment.projectName}</span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qr-amount-edit" className="text-xs text-muted-foreground">Payment Amount ({activeQrPayment.currency})</Label>
                  <Input
                    id="qr-amount-edit"
                    type="number"
                    value={qrAmount}
                    onChange={(e) => setQrAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="h-8 text-sm font-semibold text-foreground bg-background"
                  />
                </div>
                {activeQrPayment.note && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Note:</span>
                    <span className="font-medium text-foreground text-xs">{activeQrPayment.note}</span>
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
              <div className="flex gap-2 w-full pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setActiveQrPayment(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={() => {
                    setProofPayment(activeQrPayment);
                    setCustomAmount(qrAmount);
                    setNote("");
                    setScreenshotUrl("");
                    setActiveQrPayment(null);
                  }}
                >
                  Submit Proof
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auto-Generated PDF Invoice Modal */}
      <Dialog open={selectedInvoice !== null} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
          {selectedInvoice && (
            <div className="relative">
              {/* Inject advanced print stylesheet to target ONLY the invoice card */}
              <style>{`
                @media print {
                  html, body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                    height: auto !important;
                  }
                  /* Hide main application and other overlays */
                  body > :not([data-radix-portal]) {
                    display: none !important;
                  }
                  /* Hide dialog overlay backdrop */
                  [data-radix-portal] > div:first-child {
                    display: none !important;
                  }
                  /* Hide all buttons and actions during print */
                  button, .print-hidden {
                    display: none !important;
                  }
                  /* Format the dialog container to fill the print layout */
                  [role="dialog"] {
                    background: white !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    max-width: none !important;
                    width: 100% !important;
                    height: auto !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                  }
                  #printable-invoice {
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    background: white !important;
                    color: black !important;
                    width: 100% !important;
                  }
                }
              `}</style>

              <div 
                className="space-y-6 bg-card text-card-foreground p-8 rounded-xl border border-border/50 shadow-sm relative overflow-hidden" 
                id="printable-invoice"
              >
                {/* Decorative top-line brand banner */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 print-hidden" />
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border/60 pb-6 mt-2">
                  <div className="flex items-center gap-3">
                    {logoDataUrl ? (
                      <img
                        src={logoDataUrl}
                        alt="Company Logo"
                        className="w-12 h-12 rounded-lg object-cover border border-primary/20 shadow-sm shrink-0"
                      />
                    ) : (
                      <DefaultLogoSvg />
                    )}
                    <div>
                      <h3 className="font-bold text-foreground text-base font-serif tracking-tight">
                        {adminInfo?.company || "Strategic Brand Solutions"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">{adminInfo?.email || "akhilthadaka97@gmail.com"}</p>
                      <p className="text-[11px] text-muted-foreground">Creative Digital Consultancy</p>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right space-y-1">
                    <h2 className="text-2xl font-serif font-black text-foreground tracking-tight">INVOICE</h2>
                    <p className="text-xs text-muted-foreground">Ref: <span className="font-mono text-foreground font-semibold">#INV-{selectedInvoice.id ? selectedInvoice.id.slice(-8).toUpperCase() : "SBS"}</span></p>
                    <p className="text-xs text-muted-foreground">
                      Date: <span className="text-foreground font-medium">{
                        selectedInvoice.status === "verified" && selectedInvoice.secondVerifiedAt
                          ? new Date(selectedInvoice.secondVerifiedAt).toLocaleDateString()
                          : new Date(selectedInvoice.createdAt).toLocaleDateString()
                      }</span>
                    </p>
                  </div>
                </div>

                {/* Billing details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm py-2">
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/30 border border-border/40">
                    <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Billed By</p>
                    <p className="font-bold text-foreground">{adminInfo?.company || adminInfo?.name || "Strategic Brand Solutions"}</p>
                    <p className="text-xs text-muted-foreground">{adminInfo?.email || "akhilthadaka97@gmail.com"}</p>
                    {adminInfo?.phone && (
                      <p className="text-xs text-muted-foreground">Tel: {adminInfo.phone}</p>
                    )}
                    {adminInfo?.address && (
                      <p className="text-xs text-muted-foreground">{adminInfo.address}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/30 border border-border/40">
                    <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Billed To</p>
                    <p className="font-bold text-foreground">{selectedInvoice.clientName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Company: {user?.company || "Client Company"}
                    </p>
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex justify-between items-center px-4 py-3 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-xs text-muted-foreground font-medium">Invoice Status:</span>
                  <Badge variant="outline" className={`capitalize font-bold text-xs py-1 px-3 ${
                    selectedInvoice.status === "verified" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    selectedInvoice.status === "first_verified" ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                    selectedInvoice.status === "submitted" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                    selectedInvoice.status === "failed" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                    "bg-orange-500/10 text-orange-600 border-orange-500/20"
                  }`}>
                    {getClientPaymentStatusLabel(selectedInvoice.status)}
                  </Badge>
                </div>

                {/* Itemized Table */}
                <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Service / Project Item</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Requested Amount</th>
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
                        <td className="px-4 py-4 text-right font-bold text-foreground text-base">
                          {formatCurrency(selectedInvoice.amount, selectedInvoice.currency as Currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary / Total box */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
                  <div className="text-xs text-muted-foreground max-w-[320px] flex items-center">
                    All invoice transactions are secured by Strategic Brand Solutions. Please complete pending payments via payment QR codes or direct transfer.
                  </div>
                  <div className="flex flex-col justify-center items-end bg-background/60 dark:bg-background/30 px-5 py-3 rounded-lg border border-border/40 min-w-[180px]">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Total Bill Due</span>
                    <span className="text-2xl font-black text-foreground mt-1">
                      {formatCurrency(selectedInvoice.amount, selectedInvoice.currency as Currency)}
                    </span>
                  </div>
                </div>

                {/* Bottom Section: Payment QR Code or Receipt Watermark */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-border/60 pt-6">
                  {selectedInvoice.status === "verified" ? (
                    // PAID Watermark Stamp
                    <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500 border-dashed rounded-xl px-6 py-3 font-black text-lg tracking-widest uppercase rotate-[-2deg] my-2 select-none shadow-sm">
                      <CheckCircle2 className="w-6 h-6 animate-bounce" /> PAID & VERIFIED
                    </div>
                  ) : (
                    // UPI Scan & Pay Info
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Information</p>
                      <p className="text-sm font-bold text-foreground">UPI Payment (GPay / PhonePe / Paytm)</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        UPI ID: <span className="font-bold text-foreground select-all bg-muted px-2 py-0.5 rounded">akhilthadaka1@ybl</span>
                      </p>
                    </div>
                  )}

                  {selectedInvoice.status !== "verified" && (
                    <div className="flex items-center gap-4 bg-background border rounded-2xl p-2.5 shadow-sm">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Payment QR"
                          className="w-20 h-20 border rounded-lg p-1 bg-white"
                        />
                      ) : (
                        <div className="w-20 h-20 border rounded-lg p-1 bg-white flex items-center justify-center text-[10px] text-muted-foreground">
                          Generating QR...
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground max-w-[110px] leading-relaxed">
                        Scan QR with any UPI app to complete payment.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-border print-hidden">
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
                <Button
                  variant="outline"
                  className="border-primary/20 text-foreground hover:bg-muted font-medium flex items-center gap-1.5"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4" /> Print Invoice
                </Button>
                <Button
                  className="bg-primary text-primary-foreground font-semibold flex items-center gap-1.5"
                  onClick={downloadPDF}
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4" /> {isExporting ? "Generating PDF..." : "Download PDF"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inline Screenshot Viewer Modal */}
      <Dialog open={viewingScreenshot !== null} onOpenChange={(open) => !open && setViewingScreenshot(null)}>
        <DialogContent className="sm:max-w-xl text-center">
          <DialogHeader>
            <DialogTitle className="text-center font-serif text-lg">Payment Receipt Proof Screenshot</DialogTitle>
          </DialogHeader>
          {viewingScreenshot && (
            <div className="py-4 space-y-4">
              <div className="border border-border rounded-lg overflow-hidden bg-muted/20 flex justify-center items-center p-2 min-h-[300px]">
                <img
                  src={getImageUrl(viewingScreenshot) || ""}
                  alt="Payment receipt proof"
                  className="max-h-[450px] w-auto object-contain rounded border border-border"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" className="w-full" onClick={() => setViewingScreenshot(null)}>
                  Close Viewer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Payment Proof Modal */}
      <Dialog open={proofPayment !== null} onOpenChange={(open) => !open && setProofPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Submit Payment Proof</DialogTitle>
          </DialogHeader>
          {proofPayment && (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!screenshotUrl) {
                toast({ title: "Please upload a payment screenshot receipt", variant: "destructive" });
                return;
              }
              const amountVal = customAmount ? parseFloat(customAmount) : proofPayment.amount;
              if (proofPayment.id === 'direct' || proofPayment.id.startsWith('temp-due-')) {
                if (amountVal <= 0) {
                  toast({ title: "Please enter a valid amount", variant: "destructive" });
                  return;
                }
                const pId = proofPayment.id.startsWith('temp-due-') ? proofPayment.id.replace('temp-due-', '') : undefined;
                directPayMutation.mutate({
                  screenshotUrl,
                  paymentType,
                  note: pId ? `Project Balance Payment${note ? ` - ${note}` : ''}` : note,
                  amount: amountVal,
                  currency: proofPayment.currency ?? 'INR',
                  projectId: pId,
                });
              } else {
                submitProofMutation.mutate({
                  paymentId: proofPayment.id,
                  body: {
                    screenshotUrl,
                    paymentType,
                    note,
                    amount: amountVal,
                  }
                });
              }
              setProofPayment(null);
            }} className="space-y-4 pt-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Project:</span>
                <span className="font-semibold text-foreground text-sm">{proofPayment.projectName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="proof-amount">Amount ({proofPayment.currency})</Label>
                  <Input
                    id="proof-amount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="proof-method">Payment Method</Label>
                  <select
                    id="proof-method"
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="GPay">GPay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Paytm">Paytm</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="proof-screenshot">Upload Screenshot Receipt</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="proof-screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="h-9 text-xs"
                    disabled={uploading}
                  />
                  {uploading && <span className="text-xs text-muted-foreground animate-pulse">Uploading...</span>}
                </div>
                {screenshotUrl && (
                  <div className="mt-2 w-20 h-20 border rounded overflow-hidden bg-muted flex items-center justify-center">
                    <img src={getImageUrl(screenshotUrl) || ""} alt="Receipt preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="proof-note">Transaction Note (Optional)</Label>
                <Textarea
                  id="proof-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reference number or any details"
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setProofPayment(null)}>Cancel</Button>
                <Button type="submit" disabled={submitProofMutation.isPending || directPayMutation.isPending || uploading}>
                  {submitProofMutation.isPending || directPayMutation.isPending ? "Submitting..." : "Submit Proof"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
