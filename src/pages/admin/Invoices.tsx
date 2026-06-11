import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, Search, Send, Printer, FileText, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatCurrency, type Currency } from "@/lib/currency";
import Pagination from "@/components/Pagination";

interface Payment {
  id: string;
  projectId: string;
  projectName: string | null;
  clientName: string | null;
  amount: number;
  currency: string;
  status: string;
  qrToken: string | null;
  isUsed: boolean;
  screenshotUrl: string | null;
  note: string | null;
  createdAt: string;
}

interface PaymentsResp {
  data: Payment[];
  page: number;
  totalPages: number;
  total: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    first_verified: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    pending: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
    rejected: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };
  
  const labelMap: Record<string, string> = {
    verified: "Paid",
    first_verified: "Initial Check",
    pending: "Unpaid / Pending",
    submitted: "Submitted",
    failed: "Failed",
    rejected: "Rejected",
  };

  return (
    <Badge variant="outline" className={`capitalize text-xs font-bold ${map[status] ?? ""}`}>
      {labelMap[status] ?? status.replace("_", " ")}
    </Badge>
  );
}

export default function Invoices() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "verified" | "pending" | "submitted">("all");
  
  const qc = useQueryClient();
  const { toast } = useToast();

  // Fetch payments with search
  const { data: paymentsData, isLoading } = useQuery<PaymentsResp>({
    queryKey: ["invoices-payments", page, search],
    queryFn: () => apiFetch<PaymentsResp>(`/payments?page=${page}&limit=10&search=${encodeURIComponent(search)}`),
    placeholderData: (p) => p,
    refetchInterval: 5000,
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: (id: string) => apiFetch<{ success: boolean; url: string }>(`/payments/${id}/send-invoice`, { method: "POST" }),
    onSuccess: (data) => {
      toast({
        title: "Invoice Sent! 📄",
        description: "The HTML invoice was generated and delivered to the client's chat.",
      });
      qc.invalidateQueries({ queryKey: ["invoices-payments"] });
      // Open the invoice in a new window/tab for verification
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Error Sending Invoice",
        description: err.message || "Failed to generate or send invoice.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/payments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({
        title: "Payment Request Deleted",
        description: "The payment request was successfully removed.",
      });
      qc.invalidateQueries({ queryKey: ["invoices-payments"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Error Deleting Request",
        description: err.message || "Failed to delete request.",
        variant: "destructive",
      });
    },
  });

  const handleSendInvoice = (id: string) => {
    sendInvoiceMutation.mutate(id);
  };

  const handlePrintInvoice = (paymentId: string) => {
    const url = `http://localhost:5000/uploads/invoices/invoice-${paymentId}.html`;
    window.open(url, "_blank");
  };

  const payments = paymentsData?.data ?? [];
  
  // Filter by tab client-side to allow fine status distinction
  const filteredPayments = payments.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "verified") return p.status === "verified";
    if (activeTab === "pending") return p.status === "pending";
    if (activeTab === "submitted") return p.status === "submitted";
    return true;
  });

  // Calculate statistics from the payments list
  const totalCount = paymentsData?.total ?? 0;
  
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500" />
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-7 h-7 text-primary shrink-0" /> Invoices
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Manage billing, print invoices, and send verification documents to client chats.
          </p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Status Tabs */}
        <div className="flex items-center bg-muted rounded-lg p-1 border border-border overflow-x-auto w-full sm:w-auto">
          {([
            { id: "all", label: "All Invoices" },
            { id: "verified", label: "Paid / Verified" },
            { id: "pending", label: "Unpaid / Pending" },
            { id: "submitted", label: "Submitted Proofs" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs px-3.5 py-1.5 rounded-md font-bold tracking-wider transition-all uppercase whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search client, project, note..."
            className="pl-9 h-10 text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <span className="text-xs text-muted-foreground font-medium">Loading invoices...</span>
            </div>
          ) : filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-32">Invoice ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p) => {
                    const invoiceId = `SBS-INV-${p.id.slice(18).toUpperCase()}`;
                    const dateStr = new Date(p.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <TableRow key={p.id} className="hover:bg-muted/10">
                        <TableCell className="font-mono font-bold text-xs text-muted-foreground">
                          {invoiceId}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">{p.clientName}</TableCell>
                        <TableCell className="font-semibold text-xs text-muted-foreground">
                          {p.projectName || "Direct Payment"}
                        </TableCell>
                        <TableCell className="font-black text-foreground">
                          {formatCurrency(p.amount, p.currency as Currency)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{dateStr}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View / Print button */}
                            <Button
                              onClick={() => handlePrintInvoice(p.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 text-[10px] font-bold uppercase gap-1"
                              title="Print / View Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" /> View HTML
                            </Button>

                            {/* Send to Client Chat button */}
                            <Button
                              onClick={() => handleSendInvoice(p.id)}
                              size="sm"
                              disabled={sendInvoiceMutation.isPending}
                              className="h-8 text-[10px] font-bold uppercase gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                              title="Generate and send invoice link to client chat"
                            >
                              <Send className="w-3 h-3 animate-pulse" /> Send to Chat
                            </Button>

                            {/* Delete button if unpaid */}
                            {p.status !== "verified" && (
                              <Button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this payment request?")) {
                                    deletePaymentMutation.mutate(p.id);
                                  }
                                }}
                                size="sm"
                                variant="outline"
                                disabled={deletePaymentMutation.isPending}
                                className="h-8 text-[10px] font-bold uppercase gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-50"
                                title="Delete payment request"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-20 space-y-3">
              <Receipt className="w-12 h-12 text-muted-foreground/35 mx-auto" />
              <p className="text-sm font-bold text-foreground">No invoices found</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                No matching payments were found in the database. Invoices are automatically generated for any payment record.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paymentsData && paymentsData.totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination
            page={page}
            totalPages={paymentsData.totalPages}
            onPageChange={setPage}
            total={paymentsData.total}
          />
        </div>
      )}
    </div>
  );
}
