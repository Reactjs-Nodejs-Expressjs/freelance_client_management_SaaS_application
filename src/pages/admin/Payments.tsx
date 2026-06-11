import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, QrCode, Shield, AlertTriangle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatCurrency, type Currency } from "@/lib/currency";
import Pagination from "@/components/Pagination";

interface Payment {
  id: string; projectId: string; projectName: string | null; clientName: string | null;
  amount: number; currency: string; status: string; qrToken: string | null;
  isUsed: boolean; screenshotUrl: string | null; note: string | null;
  verificationStep: number; firstVerifiedAt: string | null; secondVerifiedAt: string | null;
  createdAt: string;
}
interface PaymentsResp { data: Payment[]; page: number; totalPages?: number; total?: number; }
interface ProjectItem {
  id: string;
  name: string;
  clientName: string | null;
  currency: string;
  totalAmount: number;
  paidAmount: number;
}
interface ProjectsResp { data: ProjectItem[]; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    first_verified: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    pending: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    failed: "bg-red-50/70 text-red-500 border-red-500/20",
    rejected: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };
  return <Badge variant="outline" className={`capitalize text-xs ${map[status] ?? ""}`}>{status.replace("_", " ")}</Badge>;
}

export default function Payments() {
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [confirmVerify, setConfirmVerify] = useState<{ payment: Payment; step: number } | null>(null);
  const [selectedProofPayment, setSelectedProofPayment] = useState<Payment | null>(null);
  const [rejectPayment, setRejectPayment] = useState<Payment | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("INR");

  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [selectedManualProject, setSelectedManualProject] = useState<ProjectItem | null>(null);
  const [manualPaymentType, setManualPaymentType] = useState("Bank Transfer");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNote, setManualNote] = useState("");

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: paymentsData, isLoading } = useQuery<PaymentsResp>({
    queryKey: ["payments", page],
    queryFn: () => apiFetch<PaymentsResp>(`/payments?page=${page}&limit=10`),
    placeholderData: (p) => p,
    refetchInterval: 5000,
  });

  const [submittedSearch, setSubmittedSearch] = useState("");
  const [submittedPage, setSubmittedPage] = useState(1);

  const { data: submittedPaymentsData } = useQuery<PaymentsResp>({
    queryKey: ["submitted-payments", submittedPage, submittedSearch],
    queryFn: () => apiFetch<PaymentsResp>(`/payments?submittedOnly=true&page=${submittedPage}&limit=10&search=${encodeURIComponent(submittedSearch)}`),
    placeholderData: (p) => p,
    refetchInterval: 5000,
  });

  const { data: projectsData } = useQuery<ProjectsResp>({
    queryKey: ["projects-list"],
    queryFn: () => apiFetch<ProjectsResp>("/projects?limit=100"),
  });

  const createPayment = useMutation({
    mutationFn: (body: unknown) => apiFetch("/payments", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      setIsDialogOpen(false);
      toast({ title: "Payment Request Created", description: "Request has been recorded." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const step1Verify = useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}/verify-step1`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["submitted-payments"] });
      setConfirmVerify(null);
      toast({ title: "Step 1 Verified", description: "First verification complete. Now do final verification." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const finalVerify = useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}/verify`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["submitted-payments"] });
      setConfirmVerify(null);
      toast({ title: "Payment Fully Verified ✅", description: "Project paid amount updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePayment = useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["submitted-payments"] });
      toast({ title: "Payment Request Deleted", description: "The payment request has been removed." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/payments/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejectReason: reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["submitted-payments"] });
      setRejectPayment(null);
      setRejectReasonText("");
      toast({ title: "Payment Rejected ❌", description: "The client has been notified automatically." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const recordManualPayment = useMutation({
    mutationFn: (body: { projectId: string; amount: number; paymentType: string; note: string; currency: string }) =>
      apiFetch("/payments/manual", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["projects-list"] });
      qc.invalidateQueries({ queryKey: ["submitted-payments"] });
      setIsManualDialogOpen(false);
      setSelectedManualProject(null);
      setManualPaymentType("Bank Transfer");
      setManualAmount("");
      setManualNote("");
      toast({ title: "Manual Payment Recorded ✅", description: "Payment has been recorded and project credited." });
    },
    onError: (e: Error) => toast({ title: "Recording Failed", description: e.message, variant: "destructive" }),
  });

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedManualProject) return;
    if (!manualPaymentType) {
      toast({ title: "Please select a payment type", variant: "destructive" });
      return;
    }
    if (!manualAmount || Number(manualAmount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    recordManualPayment.mutate({
      projectId: selectedManualProject.id,
      amount: Number(manualAmount),
      paymentType: manualPaymentType,
      note: manualNote,
      currency: selectedManualProject.currency,
    });
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createPayment.mutate({
      projectId: fd.get("projectId") as string,
      amount: Number(fd.get("amount")),
      currency: selectedCurrency,
      note: fd.get("note") || undefined,
    });
  };

  const payments = paymentsData?.data ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground">Client Dues & Payments</h1>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Request Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Payment Request</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <select name="projectId" required defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="" disabled>Select a project</option>
                  {projectsData?.data?.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" name="amount" required min="1" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ INR</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input name="note" placeholder="e.g. 50% Upfront deposit" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createPayment.isPending}>
                  {createPayment.isPending ? "Generating..." : "Generate Request"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Code Modal */}
      <Dialog open={!!qrToken} onOpenChange={(open) => !open && setQrToken(null)}>
        <DialogContent className="w-[min(384px,calc(100vw-2rem))] text-center">
          <DialogHeader><DialogTitle className="text-center">Payment QR Code</DialogTitle></DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Share this QR code with the client to initiate payment.</p>
            {qrToken && (
              <div className="p-4 bg-white rounded-xl shadow border border-border">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrToken}`} alt="QR Code" className="w-40 h-40" />
              </div>
            )}
            <p className="font-mono text-xs bg-muted px-3 py-1.5 rounded break-all">{qrToken}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Double Verification Confirm */}
      <Dialog open={!!confirmVerify} onOpenChange={(open) => !open && setConfirmVerify(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {confirmVerify?.step === 1 ? "First Verification" : "Final Verification"}
            </DialogTitle>
          </DialogHeader>
          {confirmVerify && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{confirmVerify.payment.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium">{confirmVerify.payment.projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">{formatCurrency(confirmVerify.payment.amount, confirmVerify.payment.currency as Currency)}</span>
                </div>
              </div>
              {confirmVerify.step === 1 ? (
                <div className="flex items-start gap-2 bg-orange-500/10 text-orange-600 px-3 py-2 rounded-lg text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This is the first of two required verifications. The payment will be marked "First Verified" and will need a second confirmation.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-2 rounded-lg text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This is the final verification. The payment will be fully verified and the project balance updated.</span>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setConfirmVerify(null)}>Cancel</Button>
                <Button
                  className={confirmVerify.step === 2 ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                  onClick={() => {
                    if (confirmVerify.step === 1) step1Verify.mutate(confirmVerify.payment.id);
                    else finalVerify.mutate(confirmVerify.payment.id);
                  }}
                  disabled={step1Verify.isPending || finalVerify.isPending}
                >
                  {(step1Verify.isPending || finalVerify.isPending) ? "Processing..." : `Confirm ${confirmVerify.step === 1 ? "Step 1" : "Final"} Verification`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Due List */}
      <Card className="border-t-4 border-t-amber-500">
        <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-foreground">Client Due List</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Outstanding balances for active projects. Direct payment recording is available.
            </p>
          </div>
        </div>
        <CardContent className="p-0">
          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-border/50">
            {(() => {
              const projectsWithDues = projectsData?.data?.filter(p => (p.totalAmount - p.paidAmount) > 0) ?? [];
              if (projectsWithDues.length === 0) {
                return <div className="py-10 text-center text-sm text-muted-foreground">No active projects with outstanding dues.</div>;
              }
              return projectsWithDues.map((project) => {
                const due = project.totalAmount - project.paidAmount;
                return (
                  <div key={project.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{project.clientName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{project.name}</p>
                      </div>
                      <Button size="sm" variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-500/10 text-xs h-8 px-3 shrink-0"
                        onClick={() => { setSelectedManualProject(project); setManualAmount(""); setManualPaymentType("Bank Transfer"); setManualNote(""); setIsManualDialogOpen(true); }}>
                        Record
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Budget</p><p className="font-medium">{formatCurrency(project.totalAmount, project.currency as Currency)}</p></div>
                      <div><p className="text-muted-foreground">Paid</p><p className="font-medium text-emerald-600">{formatCurrency(project.paidAmount, project.currency as Currency)}</p></div>
                      <div><p className="text-muted-foreground">Due</p><p className="font-bold text-amber-600">{formatCurrency(due, project.currency as Currency)}</p></div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead><tr className="bg-muted/50 border-b border-border/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Client Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Project Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Amount Paid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Outstanding Due</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border/50">
                {(() => {
                  const projectsWithDues = projectsData?.data?.filter(p => (p.totalAmount - p.paidAmount) > 0) ?? [];
                  if (projectsWithDues.length === 0) {
                    return <tr><td colSpan={6} className="h-20 text-center text-muted-foreground text-sm">No active projects with outstanding dues.</td></tr>;
                  }
                  return projectsWithDues.map((project) => {
                    const due = project.totalAmount - project.paidAmount;
                    return (
                      <tr key={project.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-sm text-foreground">{project.clientName || "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{project.name}</td>
                        <td className="px-4 py-3 text-sm font-medium">{formatCurrency(project.totalAmount, project.currency as Currency)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(project.paidAmount, project.currency as Currency)}</td>
                        <td className="px-4 py-3 text-sm font-black text-amber-600 dark:text-amber-400">{formatCurrency(due, project.currency as Currency)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-500/10 text-xs h-8 px-3"
                            onClick={() => { setSelectedManualProject(project); setManualAmount(""); setManualPaymentType("Bank Transfer"); setManualNote(""); setIsManualDialogOpen(true); }}>
                            Record Payment
                          </Button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

{/* Client Submitted Payments & Proofs Table */}
      <Card className="mt-6 border-t-4 border-t-primary">
        <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-foreground">Client Submitted Payments & Proofs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review history of payment screenshots and verify transactions in 2 steps.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search client, project or note..."
              value={submittedSearch}
              onChange={(e) => {
                setSubmittedSearch(e.target.value);
                setSubmittedPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Client Name</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Upload Screenshot Proof</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedPaymentsData === undefined ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading submitted payments...</TableCell></TableRow>
                ) : submittedPaymentsData.data.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No submitted payment proofs found.</TableCell></TableRow>
                ) : (
                  submittedPaymentsData.data.map((payment) => (
                    <TableRow 
                      key={payment.id} 
                      className={`transition-colors ${
                        payment.status === "rejected" || payment.status === "failed"
                          ? "bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-900/20" 
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <TableCell className="font-semibold text-sm text-foreground">{payment.clientName || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payment.projectName || "—"}</TableCell>
                      <TableCell className="font-bold text-foreground text-sm">
                        {formatCurrency(payment.amount, payment.currency as Currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{payment.note || "—"}</TableCell>
                      <TableCell>
                        {payment.screenshotUrl ? (
                          <div
                            className="w-12 h-12 rounded border border-border overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-muted flex items-center justify-center"
                            onClick={() => setSelectedProofPayment(payment)}
                          >
                            <img
                              src={payment.screenshotUrl.startsWith("http") ? payment.screenshotUrl : `${(window as any).BACKEND_URL}${payment.screenshotUrl}`}
                              alt="Receipt proof thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-md leading-none inline-block">
                            Admin Manually Submitted
                          </span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={payment.status} /></TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setSelectedProofPayment(payment)}
                        >
                          Review Proof
                        </Button>
                        {payment.status !== "verified" && payment.status !== "failed" && payment.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-400 text-red-600 hover:bg-red-50 h-7 text-xs"
                            onClick={() => setRejectPayment(payment)}
                          >
                            Reject
                          </Button>
                        )}
                        {payment.status !== "verified" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-500 text-rose-600 hover:bg-rose-50 h-7 text-xs"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this payment request?")) {
                                deletePayment.mutate(payment.id);
                              }
                            }}
                            disabled={deletePayment.isPending}
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {submittedPaymentsData && (submittedPaymentsData.totalPages ?? 0) > 1 && (
            <div className="p-4 border-t border-border/50 flex justify-end">
              <Pagination
                page={submittedPage}
                totalPages={submittedPaymentsData.totalPages ?? 1}
                onPageChange={setSubmittedPage}
                total={submittedPaymentsData.total}
              />
            </div>
          )}
        </CardContent>
      </Card>
 
      {/* Screenshot Proof Modal Dialog */}
      <Dialog open={selectedProofPayment !== null} onOpenChange={(open) => !open && setSelectedProofPayment(null)}>
        <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Review Payment Proof Details</DialogTitle>
          </DialogHeader>
          {selectedProofPayment && (() => {
            const curPayment = (submittedPaymentsData?.data ?? []).find(p => p.id === selectedProofPayment.id) || selectedProofPayment;
            return (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/40 p-4 rounded-lg">
                  <div>
                    <span className="text-xs text-muted-foreground block">Client:</span>
                    <span className="font-semibold text-foreground">{curPayment.clientName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Project:</span>
                    <span className="font-semibold text-foreground">{curPayment.projectName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Amount Paid:</span>
                    <span className="font-bold text-foreground">{formatCurrency(curPayment.amount, curPayment.currency as Currency)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Method / Note:</span>
                    <span className="font-medium text-foreground text-xs truncate block">{curPayment.note || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Submitted Date:</span>
                    <span className="text-xs text-foreground">{new Date(curPayment.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Verification Status:</span>
                    <span className="inline-block mt-0.5"><StatusBadge status={curPayment.status} /></span>
                  </div>
                </div>
 
                {curPayment.screenshotUrl ? (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground block uppercase">Uploaded Receipt Proof Screenshot</span>
                    <div className="border border-border rounded-lg overflow-hidden bg-muted/20 flex justify-center items-center p-2 min-h-[300px]">
                      <img
                        src={curPayment.screenshotUrl.startsWith("http") ? curPayment.screenshotUrl : `${(window as any).BACKEND_URL}${curPayment.screenshotUrl}`}
                        alt="Payment proof full screen"
                        className="max-h-[450px] w-auto object-contain rounded border border-border"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground block uppercase">Receipt Proof Status</span>
                    <div className="border border-dashed border-border rounded-lg overflow-hidden bg-amber-500/5 flex flex-col justify-center items-center p-8 min-h-[200px] text-center">
                      <Shield className="w-10 h-10 text-amber-500 mb-2 animate-pulse" />
                      <p className="font-bold text-sm text-foreground uppercase">Admin Manually Submitted</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">This payment was recorded manually by the admin and verified directly without a client screenshot upload.</p>
                    </div>
                  </div>
                )}

                {/* 2-Step Verification Controls */}
                <div className="border-t border-border pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="flex gap-2">
                    {[1, 2].map(step => (
                      <div key={step} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                          ${curPayment.verificationStep >= step ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                          {step}
                        </div>
                        <span>Step {step} {curPayment.verificationStep >= step ? "Verified" : "Pending"}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button variant="outline" size="sm" onClick={() => setSelectedProofPayment(null)}>
                      Close
                    </Button>
                    {curPayment.status !== "verified" && curPayment.status !== "failed" && curPayment.status !== "rejected" && (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="inline-flex items-center gap-1 text-xs"
                          onClick={() => {
                            setRejectPayment(curPayment);
                            setSelectedProofPayment(null);
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="inline-flex items-center gap-1 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this payment request?")) {
                              deletePayment.mutate(curPayment.id);
                              setSelectedProofPayment(null);
                            }
                          }}
                          disabled={deletePayment.isPending}
                        >
                          Delete
                        </Button>
                        {curPayment.verificationStep === 0 && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1 text-xs"
                            onClick={() => step1Verify.mutate(curPayment.id)}
                            disabled={step1Verify.isPending}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {step1Verify.isPending ? "Verifying..." : "Verify 1 (Initial)"}
                          </Button>
                        )}
                        {curPayment.verificationStep === 1 && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 text-xs"
                            onClick={() => finalVerify.mutate(curPayment.id)}
                            disabled={finalVerify.isPending}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {finalVerify.isPending ? "Verifying..." : "Verify 2 (Final)"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* Reject Payment Modal */}
      <Dialog open={!!rejectPayment} onOpenChange={(open) => !open && setRejectPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Reject Payment Request
            </DialogTitle>
          </DialogHeader>
          {rejectPayment && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{rejectPayment.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium">{rejectPayment.projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">{formatCurrency(rejectPayment.amount, rejectPayment.currency as Currency)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectReason">Rejection Reason</Label>
                <textarea
                  id="rejectReason"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Explain why the payment or proof is rejected..."
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setRejectPayment(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!rejectReasonText.trim()) {
                      toast({ title: "Reason required", description: "Please enter a reason for rejection.", variant: "destructive" });
                      return;
                    }
                    rejectPaymentMutation.mutate({ id: rejectPayment.id, reason: rejectReasonText });
                  }}
                  disabled={rejectPaymentMutation.isPending}
                >
                  {rejectPaymentMutation.isPending ? "Processing..." : "Reject Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Manual Payment Dialog */}
      <Dialog open={isManualDialogOpen} onOpenChange={(open) => !open && setIsManualDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Record Manual Payment</DialogTitle>
          </DialogHeader>
          {selectedManualProject && (
            <form onSubmit={handleManualSubmit} className="space-y-4 pt-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-semibold">{selectedManualProject.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-semibold">{selectedManualProject.clientName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding Balance:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(
                      selectedManualProject.totalAmount - selectedManualProject.paidAmount,
                      selectedManualProject.currency as Currency
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manualAmount">Payment Amount ({selectedManualProject.currency}) *</Label>
                <Input
                  id="manualAmount"
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  required
                  min="0.01"
                  step="0.01"
                  max={selectedManualProject.totalAmount - selectedManualProject.paidAmount}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manualPaymentType">Payment Type *</Label>
                <Select value={manualPaymentType} onValueChange={setManualPaymentType}>
                  <SelectTrigger id="manualPaymentType">
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="UPI/GPay">UPI / GPay</SelectItem>
                    <SelectItem value="PayPal">PayPal</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manualNote">Notes / Reference *</Label>
                <Input
                  id="manualNote"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  required
                  placeholder="e.g. Reference No., Handed to admin, bank transaction ID"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsManualDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={recordManualPayment.isPending} className="bg-primary text-primary-foreground">
                  {recordManualPayment.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
