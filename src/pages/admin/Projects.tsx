import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar, Table2, LayoutGrid, Columns3, GanttChart, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatCurrency, type Currency } from "@/lib/currency";
import Pagination from "@/components/Pagination";
import { PREMIUM_COLORS, getRandomColor, getColorForClient } from "@/lib/colors";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  planning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  on_hold: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const STATUS_DOT: Record<string, string> = {
  completed: "bg-emerald-500",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  planning: "bg-orange-500",
  on_hold: "bg-gray-500",
};

const BOARD_COLUMNS = [
  { key: "planning", label: "Planning", color: "border-t-orange-500", dotColor: "bg-orange-500", bgHover: "bg-orange-500/5" },
  { key: "in_progress", label: "In Progress", color: "border-t-blue-500", dotColor: "bg-blue-500", bgHover: "bg-blue-500/5" },
  { key: "review", label: "Review", color: "border-t-purple-500", dotColor: "bg-purple-500", bgHover: "bg-purple-500/5" },
  { key: "completed", label: "Completed", color: "border-t-emerald-500", dotColor: "bg-emerald-500", bgHover: "bg-emerald-500/5" },
  { key: "on_hold", label: "On Hold", color: "border-t-gray-500", dotColor: "bg-gray-500", bgHover: "bg-gray-500/5" },
];

const PROJECT_TYPES = [
  { value: "portfolio", label: "Portfolio" },
  { value: "business_website", label: "Business Website" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "saas", label: "SaaS" },
  { value: "crm", label: "CRM" },
  { value: "dashboard", label: "Dashboard" },
  { value: "mobile_app", label: "Mobile App" },
  { value: "custom_web", label: "Custom Web Application" },
];

type ViewMode = "board" | "table" | "cards" | "timeline";

interface Project {
  id: string; clientId: string; clientName: string | null; name: string;
  description: string | null; projectType: string | null; status: string;
  progress: number; totalAmount: number; paidAmount: number; currency: string;
  startDate: string | null; deadline: string | null; createdAt: string;
}
interface ProjectsResp { data: Project[]; total: number; page: number; totalPages: number; }
interface ClientsResp { data: { id: string; name: string; currency: string }[]; }

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectStatusTab, setProjectStatusTab] = useState<"active" | "completed">("active");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectType, setProjectType] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedColor, setSelectedColor] = useState(getRandomColor);
  const [preferredSlot, setPreferredSlot] = useState("morning");

  const [newProjStartDate, setNewProjStartDate] = useState("");
  const [newProjDeadline, setNewProjDeadline] = useState("");
  const [calCurrentDate, setCalCurrentDate] = useState<Date>(new Date());

  const { data: schedulesData } = useQuery<{ data: any[] }>({
    queryKey: ["projects-calendar-schedules"],
    queryFn: () => apiFetch<{ data: any[] }>("/schedules"),
    enabled: isDialogOpen,
    refetchInterval: 5000,
  });

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      setSelectedColor(getRandomColor());
      setCalCurrentDate(new Date());
    } else {
      setPreferredSlot("morning");
      setNewProjStartDate("");
      setNewProjDeadline("");
    }
  };

  const getDaysInMonthForCal = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getDaySchedules = (date: Date) => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    
    return (schedulesData?.data ?? []).filter(t => {
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.endDate);
      return tStart <= dayEnd && tEnd >= dayStart;
    });
  };

  const getTaskClientColor = (task: any) => {
    if (task.color) return task.color;
    // fallback if project client has custom color
    return "#3b82f6";
  };

  const getContrastTextColor = (bgColor: string) => {
    if (!bgColor) return "#ffffff";
    const cleaned = bgColor.trim().toLowerCase();
    if (cleaned.startsWith("#")) {
      const hex = cleaned.replace("#", "");
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 128 ? "#0f172a" : "#ffffff";
      } else if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 128 ? "#0f172a" : "#ffffff";
      }
    }
    return "#ffffff";
  };

  const handleDateClick = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    
    if (!newProjStartDate) {
      setNewProjStartDate(ymd);
    } else if (!newProjDeadline) {
      if (new Date(ymd) >= new Date(newProjStartDate)) {
        setNewProjDeadline(ymd);
      } else {
        setNewProjStartDate(ymd);
      }
    } else {
      setNewProjStartDate(ymd);
      setNewProjDeadline("");
    }
  };

  const adjustCalMonth = (dir: number) => {
    const next = new Date(calCurrentDate);
    next.setMonth(calCurrentDate.getMonth() + dir);
    setCalCurrentDate(next);
  };

  const miniCalendarDays = getDaysInMonthForCal(calCurrentDate);
  const monthYearLabel = calCurrentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const clearDates = () => {
    setNewProjStartDate("");
    setNewProjDeadline("");
  };

  // Drag & drop state
  const dragProjectId = useRef<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // For board view, always fetch ALL projects (no status filter)
  const boardQuery = useQuery<ProjectsResp>({
    queryKey: ["projects-board"],
    queryFn: () => apiFetch<ProjectsResp>("/projects?limit=200"),
    enabled: viewMode === "board",
    refetchInterval: 5000,
  });

  // For other views, use status filter + pagination
  const listQuery = useQuery<ProjectsResp>({
    queryKey: ["projects", page, statusFilter, projectStatusTab],
    queryFn: () => apiFetch<ProjectsResp>(`/projects?page=${page}&limit=10${projectStatusTab === "completed" ? "&status=completed" : (statusFilter !== "all" ? `&status=${statusFilter}` : "")}`),
    placeholderData: (p) => p,
    enabled: viewMode !== "board",
    refetchInterval: 5000,
  });

  const activeQuery = viewMode === "board" ? boardQuery : listQuery;
  const data = activeQuery.data;
  const isLoading = activeQuery.isLoading;

  const { data: clientsData } = useQuery<ClientsResp>({
    queryKey: ["clients-select"],
    queryFn: () => apiFetch<ClientsResp>("/clients?limit=100"),
  });

  const createProject = useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects-board"] });
      qc.invalidateQueries({ queryKey: ["client-projects-detail"] });
      setIsDialogOpen(false);
      toast({ title: "Project Started", description: "New project created successfully." });
    },
    mutationFn: (body: unknown) => apiFetch("/projects", { method: "POST", body: JSON.stringify(body) }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Drag & drop status update mutation
  const updateStatus = useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: string }) =>
      apiFetch(`/projects/${projectId}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects-board"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["client-projects-detail"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Status Updated", description: "Project moved successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createProject.mutate({
      clientId: fd.get("clientId") as string,
      name: fd.get("name"),
      description: fd.get("description") || undefined,
      projectType: projectType || undefined,
      totalAmount: Number(fd.get("totalAmount")),
      currency,
      startDate: fd.get("startDate") || undefined,
      deadline: fd.get("deadline") || undefined,
      color: selectedColor,
      preferredSlot,
      liveUrl: fd.get("liveUrl") || "",
    });
  };

  const filtered = data?.data?.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(s) || (p.clientName ?? "").toLowerCase().includes(s);
    
    const matchesTab = projectStatusTab === "completed"
      ? p.status === "completed"
      : p.status !== "completed";
      
    return matchesSearch && matchesTab;
  }) ?? [];

  // ---- Drag & Drop handlers ----
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    dragProjectId.current = projectId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", projectId);
    // Make the card semi-transparent while dragging
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => el.style.opacity = "0.4", 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    dragProjectId.current = null;
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const projectId = e.dataTransfer.getData("text/plain") || dragProjectId.current;
    if (!projectId) return;

    const project = filtered.find(p => p.id === projectId);
    if (!project || project.status === targetStatus) return;

    // Optimistic update
    updateStatus.mutate({ projectId, status: targetStatus });
  };

  const VIEW_MODES: { key: ViewMode; icon: typeof Table2; label: string }[] = [
    { key: "board", icon: Columns3, label: "Board" },
    { key: "table", icon: Table2, label: "Table" },
    { key: "cards", icon: LayoutGrid, label: "Cards" },
    { key: "timeline", icon: GanttChart, label: "Timeline" },
  ];

  // ---- Timeline helpers ----
  const getTimelineBounds = () => {
    const dates = filtered
      .flatMap(p => [p.startDate, p.deadline].filter(Boolean))
      .map(d => new Date(d!).getTime());
    if (dates.length === 0) return { min: Date.now(), max: Date.now() + 30 * 86400000 };
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const pad = (max - min) * 0.05 || 7 * 86400000;
    return { min: min - pad, max: max + pad };
  };

  const getBarPosition = (start: string | null, end: string | null, bounds: { min: number; max: number }) => {
    const range = bounds.max - bounds.min || 1;
    const s = start ? new Date(start).getTime() : bounds.min;
    const e = end ? new Date(end).getTime() : s + 14 * 86400000;
    const left = ((s - bounds.min) / range) * 100;
    const width = Math.max(((e - s) / range) * 100, 2);
    return { left: `${Math.max(0, left)}%`, width: `${Math.min(width, 100 - Math.max(0, left))}%` };
  };

  const timelineBounds = getTimelineBounds();

  // Timeline month markers
  const getMonthMarkers = () => {
    const markers: { label: string; left: string }[] = [];
    const start = new Date(timelineBounds.min);
    const end = new Date(timelineBounds.max);
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      const pos = ((current.getTime() - timelineBounds.min) / (timelineBounds.max - timelineBounds.min)) * 100;
      if (pos >= 0 && pos <= 100) {
        markers.push({
          label: current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          left: `${pos}%`,
        });
      }
      current.setDate(current.getDate() + 7);
    }
    return markers;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
      {/* Active vs Completed Tab Switcher */}
      <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50 max-w-xs select-none">
        <button
          type="button"
          onClick={() => { setProjectStatusTab("active"); setPage(1); }}
          className={`flex-1 text-center text-xs py-2 px-4 rounded-lg font-bold transition-all ${
            projectStatusTab === "active"
              ? "bg-background text-primary shadow-xs border border-border/20 font-black"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          Active Projects
        </button>
        <button
          type="button"
          onClick={() => { setProjectStatusTab("completed"); setPage(1); }}
          className={`flex-1 text-center text-xs py-2 px-4 rounded-lg font-bold transition-all ${
            projectStatusTab === "completed"
              ? "bg-background text-primary shadow-xs border border-border/20 font-black"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          Completed Projects
        </button>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search projects..." className="pl-9 h-9 text-sm" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
          {viewMode !== "board" && projectStatusTab !== "completed" && (
            <div className="w-full sm:w-40">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5 gap-0.5 shrink-0 border border-border/50 h-9">
            {VIEW_MODES.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => { setViewMode(key); if (key === "board") setStatusFilter("all"); }}
                title={label}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === key
                    ? "bg-background text-primary shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 h-9 text-sm">
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Start New Project</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Form Fields (spans 7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <select name="clientId" required defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="" disabled>Select a client</option>
                      {clientsData?.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project Name *</Label>
                      <Input name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Type</Label>
                      <Select value={projectType} onValueChange={setProjectType}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input name="description" />
                  </div>
                  <div className="space-y-2">
                    <Label>Live Website URL</Label>
                    <Input name="liveUrl" placeholder="https://example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Budget</Label>
                      <Input type="number" name="totalAmount" required min="0" step="0.01" defaultValue="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">₹ INR</SelectItem>
                          <SelectItem value="USD">$ USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Start Date & Deadline Input Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Start Date</Label>
                        {newProjStartDate && (
                          <button type="button" onClick={() => setNewProjStartDate("")} className="text-[10px] text-muted-foreground hover:text-red-500">Clear</button>
                        )}
                      </div>
                      <Input 
                        type="date" 
                        name="startDate" 
                        value={newProjStartDate} 
                        onChange={(e) => setNewProjStartDate(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Deadline</Label>
                        {newProjDeadline && (
                          <button type="button" onClick={() => setNewProjDeadline("")} className="text-[10px] text-muted-foreground hover:text-red-500">Clear</button>
                        )}
                      </div>
                      <Input 
                        type="date" 
                        name="deadline" 
                        value={newProjDeadline} 
                        onChange={(e) => setNewProjDeadline(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Auto-Schedule Shift</Label>
                      <Select value={preferredSlot} onValueChange={setPreferredSlot}>
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning Shift (10 AM - 2 PM)</SelectItem>
                          <SelectItem value="afternoon">Afternoon Shift (3 PM - 8 PM)</SelectItem>
                          <SelectItem value="fullday">Full Day Shift (10 AM - 8 PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Client Project Color</Label>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-bold leading-none">
                          {selectedColor}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5 max-h-[85px] overflow-y-auto border border-border/50 rounded-xl p-2 bg-muted/20 select-none custom-scrollbar">
                        {PREMIUM_COLORS.map((col) => (
                          <button
                            key={col.value}
                            type="button"
                            onClick={() => setSelectedColor(col.value)}
                            className="w-5.5 h-5.5 rounded-full transition-all border border-black/10 flex items-center justify-center shrink-0 hover:scale-110 active:scale-95 shadow-xs"
                            style={{ backgroundColor: col.value }}
                            title={col.name}
                          >
                            {selectedColor.toLowerCase() === col.value.toLowerCase() && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Visual calendar of booked slots in client colors (spans 5 cols) */}
                <div className="md:col-span-5 space-y-4 border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-sm text-foreground font-serif">Client Booked Dates</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                        Dates in client-created colors are already booked. Click a date to set Start Date or Deadline.
                      </p>
                    </div>

                    <div className="p-3 bg-muted/20 border border-border/50 rounded-xl">
                      {/* Month navigation */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] font-black text-foreground uppercase tracking-wider">{monthYearLabel}</span>
                        <div className="flex items-center gap-1.5">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => adjustCalMonth(-1)}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => adjustCalMonth(1)}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Weekday headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground mb-1">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                          <span key={i} className="py-1">{d}</span>
                        ))}
                      </div>

                      {/* Days grid */}
                      <div className="grid grid-cols-7 gap-1 text-center select-none">
                        {miniCalendarDays.map((date, idx) => {
                          if (!date) return <span key={`empty-${idx}`} className="w-8 h-8" />;
                          
                          const dateStringYmd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                          const isDateToday = date.toDateString() === new Date().toDateString();
                          const isStart = dateStringYmd === newProjStartDate;
                          const isDeadline = dateStringYmd === newProjDeadline;
                          const isSelectedRange = newProjStartDate && newProjDeadline && date >= new Date(newProjStartDate) && date <= new Date(newProjDeadline);
                          
                          const dayTasks = getDaySchedules(date);
                          const hasTasks = dayTasks.length > 0;
                          const dayClientColor = hasTasks ? getTaskClientColor(dayTasks[0]) : null;

                          let btnClass = "w-8 h-8 rounded-lg flex flex-col items-center justify-center relative transition-all mx-auto text-[11px] font-bold border border-transparent shadow-xs ";
                          let btnStyle: React.CSSProperties = {};

                          if (hasTasks) {
                            btnStyle.backgroundColor = dayClientColor || undefined;
                            btnClass += "text-white font-extrabold ";
                            if (isStart || isDeadline) {
                              btnClass += "ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 scale-105 z-10 ";
                            } else {
                              btnClass += "hover:opacity-90 ";
                            }
                          } else {
                            if (isStart || isDeadline) {
                              btnClass += "bg-primary text-white font-extrabold ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 scale-105 z-10 ";
                            } else if (isSelectedRange) {
                              btnClass += "bg-primary/20 text-primary border border-primary/20 ";
                            } else if (isDateToday) {
                              btnClass += "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/25 hover:bg-rose-500/20 ";
                            } else {
                              btnClass += "text-muted-foreground/75 bg-muted/20 dark:text-muted-foreground/70 hover:bg-muted hover:text-foreground ";
                            }
                          }

                          const taskTitles = dayTasks.map(t => t.title).join(", ");

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleDateClick(date)}
                              className={btnClass}
                              style={btnStyle}
                              title={hasTasks ? `Booked: ${taskTitles}` : undefined}
                            >
                              <span>{date.getDate()}</span>
                              {hasTasks && (
                                <span className="w-1 h-1 rounded-full absolute bottom-0.5 bg-white/80" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="space-y-3 pt-2">
                    <div className="bg-muted/30 border border-border/40 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b pb-1.5 border-border/40">
                        <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Date Selection</span>
                        {(newProjStartDate || newProjDeadline) && (
                          <button 
                            type="button" 
                            onClick={clearDates}
                            className="text-[10px] text-red-500 hover:underline font-bold"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span className="font-bold text-foreground">{newProjStartDate || "Not Selected"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deadline:</span>
                        <span className="font-bold text-foreground">{newProjDeadline || "Not Selected"}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                      <Button type="submit" disabled={createProject.isPending} className="bg-primary text-primary-foreground font-semibold">
                        {createProject.isPending ? "Creating..." : "Start Project"}
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === "board" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="space-y-0">
              {[...Array(6)].map((_, i) => <div key={i} className="h-14 border-b border-border/30 bg-muted/30 animate-pulse" />)}
            </div>
          </Card>
        )
      ) : filtered.length === 0 && viewMode !== "board" ? (
        <Card className="border-dashed">
          <CardContent className="p-10 sm:p-16 text-center text-muted-foreground">No projects found.</CardContent>
        </Card>
      ) : (
        <>
          {/* ========== BOARD VIEW (Kanban with Drag & Drop) ========== */}
          {viewMode === "board" && (
            <div className={`grid gap-3 sm:gap-4 items-start ${
              projectStatusTab === "completed" 
                ? "grid-cols-1 max-w-sm" 
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            }`}>
              {BOARD_COLUMNS.filter(col => 
                projectStatusTab === "completed" 
                  ? col.key === "completed" 
                  : col.key !== "completed"
              ).map(col => {
                const colProjects = filtered.filter(p => p.status === col.key);
                const isOver = dragOverColumn === col.key;
                return (
                  <div
                    key={col.key}
                    className="space-y-2.5 min-h-[200px]"
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.key)}
                  >
                    {/* Column Header */}
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 border-t-2 ${col.color} transition-colors`}>
                      <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{col.label}</span>
                      <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border border-border/50">
                        {colProjects.length}
                      </span>
                    </div>

                    {/* Drop zone */}
                    <div className={`space-y-2.5 rounded-lg p-1 min-h-[120px] transition-all ${
                      isOver ? `${col.bgHover} ring-2 ring-primary/30 ring-dashed` : ""
                    }`}>
                      {colProjects.length === 0 && !isOver ? (
                        <div className="border border-dashed border-border/50 rounded-lg px-3 py-8 text-center">
                          <p className="text-[10px] text-muted-foreground/50">Drag projects here</p>
                        </div>
                      ) : null}

                      {colProjects.map(project => (
                        <div
                          key={project.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, project.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <Card className="hover:shadow-md hover:border-primary/30 transition-all group border-border/60">
                            <CardContent className="p-3 space-y-2.5">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-xs line-clamp-2 group-hover:text-primary transition-colors leading-snug">{project.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{project.clientName}</p>
                              </div>
                              {/* Progress */}
                              <div>
                                <div className="flex justify-between text-[10px] mb-0.5">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span className="font-bold text-primary">{project.progress}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1">
                                  <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                                </div>
                              </div>
                              {/* Budget */}
                              <div className="flex justify-between text-[10px] pt-1.5 border-t border-border/40">
                                <span className="text-emerald-500 font-semibold">{formatCurrency(project.paidAmount, project.currency as Currency)}</span>
                                <span className="text-muted-foreground font-medium">/ {formatCurrency(project.totalAmount, project.currency as Currency)}</span>
                              </div>
                              {/* Deadline */}
                              {project.deadline && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      ))}

                      {/* Drop indicator when hovering and column is empty */}
                      {isOver && colProjects.length === 0 && (
                        <div className="border-2 border-dashed border-primary/40 rounded-lg px-3 py-6 text-center bg-primary/5 animate-pulse">
                          <p className="text-[10px] text-primary font-medium">Drop here</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========== TABLE VIEW ========== */}
          {viewMode === "table" && (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Project</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Client</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Progress</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Paid</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Budget</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Start</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((project, idx) => (
                      <tr
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className={`cursor-pointer transition-colors hover:bg-primary/5 group ${idx < filtered.length - 1 ? "border-b border-border/40" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[220px]">{project.name}</p>
                            {project.projectType && (
                              <span className="text-[10px] text-muted-foreground/70 capitalize">{project.projectType.replace("_", " ")}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-muted-foreground text-xs whitespace-nowrap">{project.clientName}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`capitalize text-[10px] ${STATUS_COLORS[project.status] ?? ""}`}>
                            {project.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-center min-w-[100px]">
                            <div className="w-16 bg-muted rounded-full h-1.5 shrink-0">
                              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                            </div>
                            <span className="text-xs font-bold text-primary w-8 text-right shrink-0">{project.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-emerald-500 font-semibold text-xs whitespace-nowrap">
                            {formatCurrency(project.paidAmount, project.currency as Currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-foreground text-xs whitespace-nowrap">
                            {formatCurrency(project.totalAmount, project.currency as Currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {project.startDate ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(project.startDate).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/30">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {project.deadline ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(project.deadline).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ========== CARDS VIEW ========== */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filtered.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/40 h-full flex flex-col group">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">{project.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.clientName}</p>
                        </div>
                        <Badge variant="outline" className={`capitalize shrink-0 text-xs ${STATUS_COLORS[project.status] ?? ""}`}>
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {project.projectType && (
                        <Badge variant="secondary" className="text-[10px] w-fit mt-1">{project.projectType.replace("_", " ")}</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-end space-y-3 pt-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-border text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Paid</p>
                          <p className="font-semibold text-emerald-500">
                            {formatCurrency(project.paidAmount, project.currency as Currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(project.totalAmount, project.currency as Currency)}
                          </p>
                        </div>
                      </div>
                      {(project.startDate || project.deadline) && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                          {project.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />Start: {new Date(project.startDate).toLocaleDateString()}
                            </span>
                          )}
                          {project.deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />Due: {new Date(project.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* ========== TIMELINE VIEW (Gantt-style) ========== */}
          {viewMode === "timeline" && (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Timeline Header with date markers */}
                <div className="border-b border-border bg-muted/30 px-4 py-2.5 relative overflow-hidden" style={{ minHeight: 32 }}>
                  <div className="relative h-5 ml-[200px]">
                    {getMonthMarkers().map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-0 flex flex-col items-center"
                        style={{ left: m.left, transform: "translateX(-50%)" }}
                      >
                        <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">{m.label}</span>
                        <div className="w-px h-[500px] bg-border/30 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border/30">
                  {filtered.map(project => {
                    const bar = getBarPosition(project.startDate, project.deadline, timelineBounds);
                    return (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="flex items-center cursor-pointer hover:bg-primary/5 transition-colors group"
                      >
                        {/* Project Info */}
                        <div className="w-[200px] shrink-0 px-4 py-3 border-r border-border/30">
                          <p className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors truncate">{project.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[project.status] ?? "bg-gray-400"}`} />
                            <span className="text-[10px] text-muted-foreground capitalize">{project.status.replace("_", " ")}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">•</span>
                            <span className="text-[10px] font-bold text-primary">{project.progress}%</span>
                          </div>
                        </div>

                        {/* Timeline Bar */}
                        <div className="flex-1 relative h-12 px-2">
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md flex items-center px-2 gap-1.5 transition-all group-hover:h-7 ${
                              project.status === "completed" ? "bg-emerald-500/20 border border-emerald-500/40" :
                              project.status === "in_progress" ? "bg-blue-500/20 border border-blue-500/40" :
                              project.status === "review" ? "bg-purple-500/20 border border-purple-500/40" :
                              project.status === "planning" ? "bg-orange-500/20 border border-orange-500/40" :
                              "bg-gray-500/20 border border-gray-500/40"
                            }`}
                            style={{ left: bar.left, width: bar.width, minWidth: 60 }}
                          >
                            <span className="text-[9px] font-semibold text-foreground truncate">{project.clientName}</span>
                            <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
                              {formatCurrency(project.totalAmount, project.currency as Currency)}
                            </span>
                          </div>
                          {/* Progress fill inside bar */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-l-md opacity-30 pointer-events-none ${
                              project.status === "completed" ? "bg-emerald-500" :
                              project.status === "in_progress" ? "bg-blue-500" :
                              project.status === "review" ? "bg-purple-500" :
                              project.status === "planning" ? "bg-orange-500" :
                              "bg-gray-500"
                            }`}
                            style={{
                              left: bar.left,
                              width: `calc(${bar.width} * ${project.progress / 100})`,
                              borderRadius: project.progress >= 100 ? "0.375rem" : "0.375rem 0 0 0.375rem",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filtered.length === 0 && (
                  <div className="px-8 py-16 text-center text-muted-foreground text-sm">No projects with dates to display.</div>
                )}
              </CardContent>
            </Card>
          )}

          {data && viewMode !== "board" && (
            <div className="flex justify-center pt-2">
              <Pagination page={page} totalPages={data.totalPages} total={data.total} limit={10} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
