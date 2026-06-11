import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Mail, Phone, Calendar, Globe, Linkedin, Plus } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { formatCurrency, type Currency } from "@/lib/currency";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  planning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  on_hold: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

interface Client {
  id: string; name: string; email: string; phone: string | null; company: string | null;
  currency: string; lastLoginAt: string | null; createdAt: string;
  photoUrl?: string | null;
}

interface Project {
  id: string; name: string; status: string; progress: number;
  totalAmount: number; paidAmount: number; currency: string;
  startDate: string | null; deadline: string | null; projectType: string | null;
}

interface ProjectsResp { data: Project[]; }

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = id!;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [projType, setProjType] = useState("");
  const [projCurrency, setProjCurrency] = useState("INR");

  const { data: clientData, isLoading } = useQuery<{ client: Client; projects: Project[] }>({
    queryKey: ["client", clientId],
    queryFn: () => apiFetch<{ client: Client; projects: Project[] }>(`/clients/${clientId}`),
    enabled: !!clientId,
  });

  const client = clientData?.client;
  const projects = clientData?.projects ?? [];

  const addProject = useMutation({
    mutationFn: (body: unknown) => apiFetch("/projects", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setAddProjectOpen(false);
      toast({ title: "Project Created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addProject.mutate({
      clientId,
      name: fd.get("name"),
      description: fd.get("description") || undefined,
      projectType: projType || undefined,
      totalAmount: Number(fd.get("totalAmount") ?? 0),
      currency: projCurrency,
      startDate: fd.get("startDate") || undefined,
      deadline: fd.get("deadline") || undefined,
    });
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!client) return <div className="p-8 text-center text-muted-foreground">Client not found</div>;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-primary">Clients</Link>
        <span>/</span>
        <span className="text-foreground">{client.name}</span>
      </div>

      {/* Client Header */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start flex-1 min-w-0">
              {client.photoUrl ? (
                <img
                  src={client.photoUrl.startsWith('http') ? client.photoUrl : `http://localhost:5000${client.photoUrl}`}
                  alt={client.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-primary/20 shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl sm:text-2xl font-black border-4 border-primary/20 shrink-0">
                  {client.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
              )}
              <div className="space-y-3 min-w-0 flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">{client.name}</h1>
                  <Badge variant="outline" className={`shrink-0 ${client.currency === "USD" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-orange-500/10 text-orange-600 border-orange-500/20"}`}>
                    {client.currency === "USD" ? "$ USD" : "₹ INR"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-muted-foreground justify-center sm:justify-start">
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" />{client.email}</span>
                  {client.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{client.phone}</span>}
                  {client.company && <span className="flex items-center gap-1.5"><Building className="w-4 h-4" />{client.company}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-muted/50 p-4 rounded-xl text-center">
                <span className="text-xs text-muted-foreground block">Projects</span>
                <span className="text-3xl font-bold text-primary">{projects.length}</span>
              </div>
              {client.lastLoginAt && (
                <div className="bg-muted/50 p-4 rounded-xl text-center">
                  <span className="text-xs text-muted-foreground block">Last Login</span>
                  <span className="text-xs font-medium text-foreground">{new Date(client.lastLoginAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-serif font-semibold text-foreground">Projects</h2>
          <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1.5" /> Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Project for {client.name}</DialogTitle></DialogHeader>
              <form onSubmit={handleAddProject} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name *</Label>
                    <Input name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={projType} onValueChange={setProjType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Input name="description" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget</Label>
                    <Input type="number" name="totalAmount" min="0" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={projCurrency} onValueChange={setProjCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ INR</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Start Date</Label><Input type="date" name="startDate" /></div>
                  <div className="space-y-2"><Label>Deadline</Label><Input type="date" name="deadline" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAddProjectOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={addProject.isPending} className="bg-primary text-primary-foreground">{addProject.isPending ? "Creating..." : "Create Project"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center text-muted-foreground">No projects yet. Add one above.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 h-full">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
                      <Badge variant="outline" className={`capitalize shrink-0 text-xs ${STATUS_COLORS[project.status] ?? ""}`}>
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {project.projectType && <Badge variant="secondary" className="text-[10px] w-fit">{project.projectType.replace("_", " ")}</Badge>}
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold text-emerald-500">{formatCurrency(project.paidAmount, project.currency as Currency)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold">{formatCurrency(project.totalAmount, project.currency as Currency)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
