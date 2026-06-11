import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, 
  AreaChart, Area, PieChart, Pie, Cell, RadialBarChart, RadialBar 
} from "recharts";
import { 
  TrendingUp, IndianRupee, DollarSign, Download, Calendar, 
  Briefcase, CheckCircle2, ShieldAlert, Award, Globe, HelpCircle 
} from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatCurrency, type Currency } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectItem {
  id: string;
  name: string;
  clientName: string | null;
  status: string;
  progress: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  projectType: string | null;
  startDate: string | null;
  deadline: string | null;
}

interface PaymentItem {
  id: string;
  projectName: string | null;
  clientName: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

const PROJECT_TYPES_LABELS: Record<string, string> = {
  portfolio: "Portfolio",
  business_website: "Business Website",
  ecommerce: "E-commerce",
  saas: "SaaS",
  crm: "CRM",
  dashboard: "Dashboard",
  mobile_app: "Mobile App",
  custom_web: "Custom Web Application",
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#14b8a6", "#f43f5e"];

export default function Reports() {
  const [currencyMode, setCurrencyMode] = useState<"INR" | "USD" | "ALL">("ALL");
  const [selectedClient, setSelectedClient] = useState<string>("ALL");

  // Fetch all projects (no limit)
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery<{ data: ProjectItem[] }>({
    queryKey: ["reports-projects"],
    queryFn: () => apiFetch<{ data: ProjectItem[] }>("/projects?limit=500"),
  });

  // Fetch all payments (no limit)
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery<{ data: PaymentItem[] }>({
    queryKey: ["reports-payments"],
    queryFn: () => apiFetch<{ data: PaymentItem[] }>("/payments?limit=1000"),
  });

  // Fetch all clients list for dropdown
  const { data: clientsListData, isLoading: isClientsLoading } = useQuery<{ data: { name: string }[] }>({
    queryKey: ["reports-clients-dropdown"],
    queryFn: () => apiFetch<{ data: { name: string }[] }>("/clients?limit=200"),
  });

  const projects = projectsData?.data ?? [];
  const payments = paymentsData?.data ?? [];

  const isLoading = isProjectsLoading || isPaymentsLoading || isClientsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full animate-pulse" />
          <Skeleton className="h-80 w-full animate-pulse" />
        </div>
      </div>
    );
  }

  // Get unique clients for filtering from the full clients query
  const clientsList = Array.from(
    new Set((clientsListData?.data?.map(c => c.name) || []).filter(Boolean))
  ).sort();

  // Currency conversion logic (Fixed: 1 USD = 83 INR)
  const convertAmount = (amount: number, from: string, target: "INR" | "USD" | "ALL") => {
    if (target === "ALL") {
      // Normalize everything to INR
      return from === "USD" ? amount * 83 : amount;
    }
    if (from === target) return amount;
    if (from === "USD" && target === "INR") return amount * 83;
    if (from === "INR" && target === "USD") return amount / 83;
    return amount;
  };

  // Filter projects based on selections
  const filteredProjects = projects.filter(p => {
    const matchesClient = selectedClient === "ALL" || p.clientName === selectedClient;
    const matchesCurrency = currencyMode === "ALL" || p.currency === currencyMode;
    return matchesClient && matchesCurrency;
  });

  // Filter payments (only verified represent revenue)
  const verifiedPayments = payments.filter(pay => pay.status === "verified");

  const filteredPayments = verifiedPayments.filter(pay => {
    const matchesClient = selectedClient === "ALL" || pay.clientName === selectedClient;
    const matchesCurrency = currencyMode === "ALL" || pay.currency === currencyMode;
    return matchesClient && matchesCurrency;
  });

  // 1. Calculate Stats
  let totalRevenue = 0;
  let totalPending = 0;
  let totalCollected = 0;

  filteredProjects.forEach(p => {
    const projectTotalConverted = convertAmount(p.totalAmount, p.currency, currencyMode);
    const projectPaidConverted = convertAmount(p.paidAmount, p.currency, currencyMode);
    
    totalRevenue += projectTotalConverted;
    totalCollected += projectPaidConverted;
    totalPending += (projectTotalConverted - projectPaidConverted);
  });

  const avgProjectValue = filteredProjects.length > 0 ? totalRevenue / filteredProjects.length : 0;
  const completedProjects = filteredProjects.filter(p => p.status === "completed").length;
  const completionRate = filteredProjects.length > 0 ? (completedProjects / filteredProjects.length) * 100 : 0;

  // 2. Prepare Data for Bar Chart: Project Breakdown (Limit to top 10 for readability)
  const projectRevenueData = filteredProjects.slice(0, 10).map(p => {
    const total = convertAmount(p.totalAmount, p.currency, currencyMode);
    const paid = convertAmount(p.paidAmount, p.currency, currencyMode);
    return {
      name: p.name,
      paid: parseFloat(paid.toFixed(2)),
      pending: parseFloat((total - paid).toFixed(2)),
    };
  });

  // 3. Prepare Data for Status Breakdown
  const statusCounts: Record<string, number> = {};
  filteredProjects.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });
  const projectStatusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.toUpperCase().replace("_", " "),
    value: count,
  }));

  // 4. Prepare Data for Revenue Trend over Time (monthly)
  const monthlyRevenueMap: Record<string, number> = {};
  filteredPayments.forEach(p => {
    const date = new Date(p.createdAt);
    const monthYear = date.toLocaleString("en-US", { month: "short", year: "numeric" });
    const convertedAmount = convertAmount(p.amount, p.currency, currencyMode);
    monthlyRevenueMap[monthYear] = (monthlyRevenueMap[monthYear] || 0) + convertedAmount;
  });

  // Sort months chronologically
  const revenueTrendData = Object.entries(monthlyRevenueMap)
    .map(([month, amount]) => ({
      month,
      revenue: parseFloat(amount.toFixed(2)),
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // 5. Prepare Data for Project Types Revenue
  const typeRevenueMap: Record<string, number> = {};
  filteredProjects.forEach(p => {
    const typeLabel = PROJECT_TYPES_LABELS[p.projectType || ""] || "Custom / Other";
    const convertedPaid = convertAmount(p.paidAmount, p.currency, currencyMode);
    typeRevenueMap[typeLabel] = (typeRevenueMap[typeLabel] || 0) + convertedPaid;
  });
  const projectTypeRevenueData = Object.entries(typeRevenueMap).map(([type, amount]) => ({
    name: type,
    revenue: parseFloat(amount.toFixed(2)),
  }));

  // Format helper for Currency display
  const renderValue = (val: number) => {
    if (currencyMode === "ALL") {
      return formatCurrency(val, "INR");
    }
    return formatCurrency(val, currencyMode as Currency);
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ["Project Name", "Client Name", "Status", "Progress", "Total Budget", "Paid Amount", "Pending Balance", "Currency"];
    const rows = filteredProjects.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.clientName || "").replace(/"/g, '""')}"`,
      p.status,
      `${p.progress}%`,
      p.totalAmount,
      p.paidAmount,
      p.totalAmount - p.paidAmount,
      p.currency
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sbs_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500" />
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-xs text-muted-foreground font-medium">
            Review income generated, pending balances, and project distributions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Client Filter */}
          <div className="w-full sm:w-44">
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Clients</SelectItem>
                {clientsList.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
            {(["ALL", "INR", "USD"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setCurrencyMode(mode)}
                className={`text-[10px] px-3.5 py-1.5 rounded-md font-bold tracking-wider transition-all uppercase ${
                  currencyMode === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "ALL" ? "Combined" : mode}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <Button 
            onClick={handleExportCSV}
            variant="outline" 
            className="h-10 text-xs font-bold gap-2 shrink-0 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Normalized Warning Message */}
      {currencyMode === "ALL" && (
        <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-primary font-medium">
          <Globe className="w-4 h-4 animate-pulse" />
          <span>Showing combined USD & INR data normalized to Indian Rupee (₹ INR) at an exchange rate of 1 USD = 83 INR.</span>
        </div>
      )}

      {/* Key Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-border/50 hover:shadow-md transition-shadow relative overflow-hidden min-h-[145px] flex flex-col justify-center">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground tracking-wider uppercase">Total Generated Revenue</p>
              <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-foreground mt-1.5 truncate">{renderValue(totalRevenue)}</h3>
              <p className="text-[9px] text-muted-foreground leading-normal mt-0.5">Budget sum of filtered projects</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
              {currencyMode === "USD" ? <DollarSign className="w-5 h-5" /> : <IndianRupee className="w-5 h-5" />}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow relative overflow-hidden min-h-[145px] flex flex-col justify-center">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground tracking-wider uppercase">
                {currencyMode === "ALL" ? "Paid Amount (INR)" : currencyMode === "USD" ? "Paid Amount (USD)" : "Paid Amount (INR)"}
              </p>
              <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-emerald-500 mt-1.5 truncate">{renderValue(totalCollected)}</h3>
              <p className="text-[9px] text-emerald-500/80 leading-normal mt-0.5">Verified payments applied</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow relative overflow-hidden min-h-[145px] flex flex-col justify-center">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground tracking-wider uppercase">Total Pending / Dues</p>
              <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-amber-500 mt-1.5 truncate">{renderValue(totalPending)}</h3>
              <p className="text-[9px] text-amber-500/85 leading-normal mt-0.5">Unpaid outstanding balance</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow relative overflow-hidden min-h-[145px] flex flex-col justify-center">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground tracking-wider uppercase">Avg Budget & Success</p>
              <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-foreground mt-1.5 truncate">{renderValue(avgProjectValue)}</h3>
              <p className="text-[9px] text-primary/80 font-bold leading-normal mt-0.5">{completionRate.toFixed(0)}% Completion Rate ({completedProjects} Done)</p>
            </div>
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-500 shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Project Income & Pending Bar Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold font-serif uppercase tracking-wider text-foreground">Project Revenue & Pending Split</CardTitle>
            <CardDescription className="text-xs">Displays paid income vs outstanding pending balance per project (Top 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              {projectRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" fontSize={9} stroke="#888888" tickLine={false} axisLine={false} tickFormatter={(v) => v.length > 12 ? v.slice(0, 10) + "..." : v} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => currencyMode === "USD" ? `$${v}` : `₹${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: number) => renderValue(val)}
                    />
                    <Legend />
                    <Bar dataKey="paid" name="Paid Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pending Balance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No project revenue data yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend Over Time Line/Area Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold font-serif uppercase tracking-wider text-foreground">Income Growth Trend</CardTitle>
            <CardDescription className="text-xs">Timeline of monthly verified payments received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              {revenueTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" fontSize={9} stroke="#888888" tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => currencyMode === "USD" ? `$${v}` : `₹${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: number) => renderValue(val)}
                    />
                    <Area type="monotone" dataKey="revenue" name="Income Received" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No payment history to show trend</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Project Statuses Pie Chart */}
        <Card className="md:col-span-1 border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold font-serif uppercase tracking-wider text-foreground">Project Status Breakdown</CardTitle>
            <CardDescription className="text-xs">Distribution of active vs completed projects</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="h-56 w-full relative">
              {projectStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No project status data</div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
              {projectStatusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-[10px] font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-muted-foreground truncate max-w-[80px]">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Type Distribution Bar Chart */}
        <Card className="md:col-span-2 border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold font-serif uppercase tracking-wider text-foreground">Income by Project Category</CardTitle>
            <CardDescription className="text-xs">Generated income (paid amount) summed by project types</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="h-64 w-full">
              {projectTypeRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectTypeRevenueData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <XAxis type="number" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => currencyMode === "USD" ? `$${v}` : `₹${v}`} />
                    <YAxis type="category" dataKey="name" fontSize={9} stroke="#888888" tickLine={false} axisLine={false} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: number) => renderValue(val)}
                    />
                    <Bar dataKey="revenue" name="Earned Income" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No category revenue data</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
