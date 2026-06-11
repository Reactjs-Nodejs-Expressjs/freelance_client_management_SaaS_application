import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus, CheckCircle2, Clock, ExternalLink, Edit2, Star, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { apiFetch } from "@/lib/api";
import { formatCurrency, type Currency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["planning", "in_progress", "review", "completed", "on_hold"];

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  planning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  on_hold: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const PAYMENT_COLORS: Record<string, string> = {
  verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  first_verified: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  pending: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
};

interface Project {
  id: string; name: string; clientId: string; clientName: string | null;
  description: string | null; projectType: string | null; status: string;
  progress: number; totalAmount: number; paidAmount: number; currency: string;
  startDate: string | null; deadline: string | null; createdAt: string;
  liveUrl?: string; showcase?: boolean;
}
interface Update {
  id: string; title: string; description: string | null; progress: number;
  links: string[] | null; imageUrls: string[] | null; createdAt: string;
}
interface Payment {
  id: string; amount: number; currency: string; status: string;
  verificationStep: number; note: string | null; createdAt: string;
}
interface UpdatesResp { data: Update[]; }
interface PaymentsResp { data: Payment[]; }

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = id!;
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editStatus, setEditStatus] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const [editLiveUrl, setEditLiveUrl] = useState("");
  const [editShowcase, setEditShowcase] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => apiFetch<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: updatesData } = useQuery<UpdatesResp>({
    queryKey: ["updates", projectId],
    queryFn: () => apiFetch<UpdatesResp>(`/updates?projectId=${projectId}`),
    enabled: !!projectId,
  });

  const { data: paymentsData } = useQuery<PaymentsResp>({
    queryKey: ["payments", "project", projectId],
    queryFn: () => apiFetch<PaymentsResp>(`/payments?projectId=${projectId}&limit=50`),
    enabled: !!projectId,
  });

  const updateProject = useMutation({
    // Changed PATCH to PUT to match backend routes
    mutationFn: (body: unknown) => apiFetch(`/projects/${projectId}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditOpen(false);
      toast({ title: "Project Updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteProject = useMutation({
    mutationFn: () => apiFetch(`/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects-board"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Project Deleted", description: "The project has been deleted successfully." });
      navigate("/projects");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );

  if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found</div>;

  const updates = updatesData?.data ?? [];
  const payments = paymentsData?.data ?? [];
  const paidPercent = project.totalAmount > 0 ? ((project.paidAmount / project.totalAmount) * 100).toFixed(0) : "0";
  const progressData = [
    { name: "Done", value: project.progress },
    { name: "Left", value: 100 - project.progress },
  ];
  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

  const handleEditOpen = () => {
    setEditStatus(project.status);
    setEditProgress(project.progress);
    setEditLiveUrl(project.liveUrl || "");
    setEditShowcase(project.showcase || false);
    setEditOpen(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <span className="text-foreground">{project.name}</span>
      </div>

      {/* Header */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">{project.name}</h1>
                <Badge variant="outline" className={`capitalize ${STATUS_COLORS[project.status] ?? ""}`}>
                  {project.status.replace("_", " ")}
                </Badge>
                {project.showcase && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 border text-[10px]">
                    <Star className="w-3 h-3 mr-1 fill-amber-500" /> Featured on Home
                  </Badge>
                )}
                {project.projectType && (
                  <Badge variant="secondary" className="capitalize text-xs">
                    {project.projectType.replace("_", " ")}
                  </Badge>
                )}
              </div>
              {project.description && <p className="text-muted-foreground text-sm mb-4">{project.description}</p>}
              <div className="flex flex-wrap gap-3 sm:gap-5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{project.clientName}</span>
                {project.startDate && (
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />
                    Start: {new Date(project.startDate).toLocaleDateString()}
                  </span>
                )}
                {project.deadline && (
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />
                    Due: {new Date(project.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Button size="sm" variant="outline" onClick={handleEditOpen}>
                <Edit2 className="w-4 h-4 mr-1.5" /> Edit
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => navigate(`/projects/${projectId}/updates/new`)}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Update
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-border">
            <div className="bg-muted/40 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
              <p className="font-bold text-foreground text-sm sm:text-base">{formatCurrency(project.totalAmount, project.currency as Currency)}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Paid</p>
              <p className="font-bold text-emerald-500 text-sm sm:text-base">{formatCurrency(project.paidAmount, project.currency as Currency)}</p>
            </div>
            <div className="bg-orange-500/10 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className="font-bold text-orange-500 text-sm sm:text-base">{formatCurrency(project.totalAmount - project.paidAmount, project.currency as Currency)}</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Payment %</p>
              <p className="font-bold text-primary text-sm sm:text-base">{paidPercent}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Project Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Progress</Label>
                <span className="font-bold text-primary">{editProgress}%</span>
              </div>
              <Slider value={[editProgress]} onValueChange={v => setEditProgress(v[0])} max={100} step={5} className="py-4" />
            </div>
            <div className="space-y-2">
              <Label>Live Website URL</Label>
              <Input value={editLiveUrl} onChange={e => setEditLiveUrl(e.target.value)} placeholder="https://example.com" />
            </div>
            {/* Show on Home Page toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-semibold text-foreground">Show on Home Page</p>
                <p className="text-xs text-muted-foreground mt-0.5">Feature this project in the public portfolio showcase</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editShowcase}
                onClick={() => setEditShowcase(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors focus:outline-none ${
                  editShowcase ? 'bg-primary border-primary' : 'bg-muted border-border'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  editShowcase ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={() => updateProject.mutate({ status: editStatus, progress: editProgress, liveUrl: editLiveUrl, showcase: editShowcase })} disabled={updateProject.isPending} className="bg-primary text-primary-foreground">
                {updateProject.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Project</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this project? This will permanently remove all associated schedules, timeline updates, and payment records. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteProject.mutate()} disabled={deleteProject.isPending}>
                {deleteProject.isPending ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Updates Timeline */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base sm:text-lg font-serif">Project Timeline</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${projectId}/updates/new`)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Update
            </Button>
          </CardHeader>
          <CardContent>
            {updates.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <p>No updates yet.</p>
                <Button variant="link" className="mt-2 text-primary" onClick={() => navigate(`/projects/${projectId}/updates/new`)}>
                  Post the first update →
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
                {updates.map(update => (
                  <div key={update.id} className="flex gap-3 sm:gap-4 pb-4 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-sm">{update.title}</h4>
                        <span className="text-xs text-muted-foreground shrink-0">{new Date(update.createdAt).toLocaleDateString()}</span>
                      </div>
                      {update.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{update.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-muted rounded-full h-1">
                          <div className="bg-primary h-1 rounded-full" style={{ width: `${update.progress}%` }} />
                        </div>
                        <span className="text-xs font-bold text-primary">{update.progress}%</span>
                      </div>
                      {update.links && update.links.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {update.links.map((l, i) => (
                            <a key={i} href={l} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <ExternalLink className="w-3 h-3" />View Link
                            </a>
                          ))}
                        </div>
                      )}
                      {update.imageUrls && update.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {update.imageUrls.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noreferrer">
                              <img src={img} alt={`screenshot-${i}`} className="h-12 w-16 object-cover rounded-md border border-border hover:opacity-80 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Progress Circle */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base font-serif">Completion</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={progressData} cx="50%" cy="50%" innerRadius={42} outerRadius={54} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                      {progressData.map((_, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{project.progress}%</span>
                  <span className="text-xs text-muted-foreground">Done</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-serif">Payments</CardTitle>
              <Link href="/payments"><Button size="sm" variant="ghost" className="text-xs h-7">Manage →</Button></Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                {payments.length === 0 ? (
                  <div className="px-5 py-8 text-center text-muted-foreground text-sm">No payments yet</div>
                ) : (
                  payments.map(p => (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(p.amount, p.currency as Currency)}</p>
                        {p.note && <p className="text-xs text-muted-foreground truncate">{p.note}</p>}
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2].map(step => (
                            <div key={step} className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${p.verificationStep >= step ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>{step}</div>
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-1">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`capitalize text-xs shrink-0 ${PAYMENT_COLORS[p.status] ?? ""}`}>
                        {p.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
