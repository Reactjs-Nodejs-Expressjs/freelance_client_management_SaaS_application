import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, Plus, Building, Mail, Phone, Clock, UserCircle, Pencil, Trash2, 
  RotateCcw, AlertTriangle, Star, MessageSquare, Heart, ThumbsUp, Calendar, Trash,
  Globe, Code2, LayoutDashboard, ShoppingCart, Cpu, Link2
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { PREMIUM_COLORS } from "@/lib/colors";
import Pagination from "@/components/Pagination";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";

interface Client {
  id: string; 
  name: string; 
  email: string; 
  phone: string | null; 
  company: string | null;
  currency: string; 
  lastLoginAt: string | null; 
  createdAt: string;
  photoUrl?: string | null;
  projectCount?: number;
  registrationType?: string;
}

interface DeletedClient {
  _id: string; 
  originalId: string; 
  name: string; 
  email: string; 
  company: string;
  phone: string; 
  deletedAt: string;
}

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  projectType?: string;
  otherProjectType?: string;
  description?: string;
  subject: string;
  message: string;
  createdAt: string;
}

interface FeedbackItem {
  _id: string;
  projectName: string;
  clientName: string;
  clientCompany: string;
  rating: number;
  comments: string;
  recommendRating: number;
  createdAt: string;
}

interface FeedbackResp {
  data: FeedbackItem[];
  stats: {
    totalCount: number;
    averageRating: number;
    recommendAverage: number;
    satisfactionRate: number;
    ratingCounts: Record<number, number>;
  };
}

interface ClientsResponse { 
  data: Client[]; 
  total: number; 
  page: number; 
  totalPages: number; 
}

interface HomeCard {
  _id: string;
  type: 'service' | 'testimonial';
  title: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  icon?: string;
  author?: string;
  company?: string;
  rating?: number;
  avatarUrl?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Globe: Globe,
  Code2: Code2,
  LayoutDashboard: LayoutDashboard,
  ShoppingCart: ShoppingCart,
  Cpu: Cpu,
  Link2: Link2
};

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [adminPage, setAdminPage] = useState(1);
  const [selfPage, setSelfPage] = useState(1);
  const [activeTab, setActiveTab] = useState("clients-admin");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [currency, setCurrency] = useState("INR");

  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [editCard, setEditCard] = useState<HomeCard | null>(null);
  const [cardType, setCardType] = useState<'service' | 'testimonial'>('service');
  const [cardIcon, setCardIcon] = useState('Globe');

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [editProject, setEditProject] = useState<any | null>(null);
  const [deleteProject, setDeleteProject] = useState<any | null>(null);
  const [projectColor, setProjectColor] = useState('#3b82f6');
  
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [isContactDetailsOpen, setIsContactDetailsOpen] = useState(false);
  
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: clientsSelectData } = useQuery<{ data: any[] }>({
    queryKey: ["clients-select-list"],
    queryFn: () => apiFetch<{ data: any[] }>("/clients?limit=200"),
  });

  // 1. Admin Created Clients Query
  const { data: adminData, isLoading: isLoadingAdmin } = useQuery<ClientsResponse>({
    queryKey: ["clients-admin-created", adminPage, searchTerm],
    queryFn: () => apiFetch<ClientsResponse>(`/clients?page=${adminPage}&limit=10&registrationType=admin_created&search=${searchTerm}`),
    placeholderData: (prev) => prev,
    refetchInterval: 5000,
  });

  // 2. Self Registered Clients Query
  const { data: selfData, isLoading: isLoadingSelf } = useQuery<ClientsResponse>({
    queryKey: ["clients-self-registered", selfPage, searchTerm],
    queryFn: () => apiFetch<ClientsResponse>(`/clients?page=${selfPage}&limit=10&registrationType=self_registered&search=${searchTerm}`),
    placeholderData: (prev) => prev,
    refetchInterval: 5000,
  });

  // 3. Recycle Bin Query
  const { data: recycleBinData } = useQuery<{ data: DeletedClient[] }>({
    queryKey: ["clients-recycle-bin"],
    queryFn: () => apiFetch("/clients/recycle-bin"),
    refetchInterval: 5000,
  });

  // 4. Contact Inquiries Query
  const { data: contactData, isLoading: isLoadingContacts } = useQuery<{ data: ContactMessage[] }>({
    queryKey: ["contact-messages"],
    queryFn: () => apiFetch<{ data: ContactMessage[] }>("/contact"),
    refetchInterval: 5000,
  });

  // 5. Client Feedbacks Query
  const { data: feedbackData, isLoading: isLoadingFeedback } = useQuery<FeedbackResp>({
    queryKey: ["admin-feedback-list"],
    queryFn: () => apiFetch<FeedbackResp>("/feedback"),
    refetchInterval: 5000,
  });

  // --- Mutations ---
  const createClient = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/clients", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-admin-created"] });
      qc.invalidateQueries({ queryKey: ["credentials"] });
      setIsCreateOpen(false);
      toast({ title: "Client Created", description: "New client registered successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateClient = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-admin-created"] });
      qc.invalidateQueries({ queryKey: ["clients-self-registered"] });
      setIsEditOpen(false);
      setEditClient(null);
      toast({ title: "Client Updated", description: "Client details updated successfully." });
    },
    onError: (e: Error) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/clients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-admin-created"] });
      qc.invalidateQueries({ queryKey: ["clients-self-registered"] });
      qc.invalidateQueries({ queryKey: ["clients-recycle-bin"] });
      setIsDeleteOpen(false);
      setDeleteClient(null);
      toast({ title: "Client Deleted", description: "Client moved to recycle bin." });
    },
    onError: (e: Error) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  const restoreClient = useMutation({
    mutationFn: (id: string) => apiFetch(`/clients/recycle-bin/${id}/restore`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-admin-created"] });
      qc.invalidateQueries({ queryKey: ["clients-self-registered"] });
      qc.invalidateQueries({ queryKey: ["clients-recycle-bin"] });
      toast({ title: "Client Restored ✅", description: "Client account has been restored." });
    },
    onError: (e: Error) => toast({ title: "Restore Failed", description: e.message, variant: "destructive" }),
  });

  const permanentDeleteClient = useMutation({
    mutationFn: (id: string) => apiFetch(`/clients/recycle-bin/${id}/permanent`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-recycle-bin"] });
      toast({ title: "Permanently Deleted 🗑️", description: "Client has been permanently removed." });
    },
    onError: (e: Error) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  const deleteContactMessage = useMutation({
    mutationFn: (id: string) => apiFetch(`/contact/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-messages"] });
      toast({ title: "Inquiry Deleted 🗑️", description: "Contact message deleted successfully." });
    },
    onError: (e: Error) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  // --- Home Card Queries & Mutations ---
  const { data: homeCardsData, isLoading: isLoadingHomeCards } = useQuery<{ services: HomeCard[], testimonials: HomeCard[] }>({
    queryKey: ["admin-home-cards"],
    queryFn: () => apiFetch<{ services: HomeCard[], testimonials: HomeCard[] }>("/home-cards"),
    refetchInterval: 5000,
  });

  const createHomeCard = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/home-cards", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-cards"] });
      qc.invalidateQueries({ queryKey: ["home-page-cards"] });
      setIsCreateCardOpen(false);
      toast({ title: "Card Created", description: "Home page card created successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateHomeCard = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/home-cards/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-cards"] });
      qc.invalidateQueries({ queryKey: ["home-page-cards"] });
      setIsEditCardOpen(false);
      setEditCard(null);
      toast({ title: "Card Updated", description: "Home page card updated successfully." });
    },
    onError: (e: Error) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const deleteHomeCard = useMutation({
    mutationFn: (id: string) => apiFetch(`/home-cards/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-home-cards"] });
      qc.invalidateQueries({ queryKey: ["home-page-cards"] });
      toast({ title: "Card Deleted", description: "Home page card deleted successfully." });
    },
    onError: (e: Error) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  // Fetch all projects for home page editor showcase toggle
  const { data: allProjectsData, isLoading: isLoadingAllProjects } = useQuery<{ data: any[] }>({
    queryKey: ["admin-all-projects-showcase"],
    queryFn: () => apiFetch<{ data: any[] }>("/projects?limit=200"),
    refetchInterval: 5000,
  });

  const updateProjectShowcase = useMutation({
    mutationFn: ({ id, showcase }: { id: string; showcase: boolean }) =>
      apiFetch(`/projects/${id}`, { method: "PUT", body: JSON.stringify({ showcase }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-projects-showcase"] });
      qc.invalidateQueries({ queryKey: ["public-projects-showcase"] });
      toast({ title: "Showcase Updated ✅", description: "Project showcase status updated." });
    },
    onError: (e: Error) => toast({ title: "Toggle Failed", description: e.message, variant: "destructive" }),
  });

  const createProjectMutation = useMutation({
    mutationFn: (body: any) =>
      apiFetch("/projects", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-projects-showcase"] });
      qc.invalidateQueries({ queryKey: ["public-projects-showcase"] });
      setIsCreateProjectOpen(false);
      toast({ title: "Project Created ✅", description: "New project created successfully." });
    },
    onError: (e: Error) => toast({ title: "Creation Failed", description: e.message, variant: "destructive" }),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiFetch(`/projects/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-projects-showcase"] });
      qc.invalidateQueries({ queryKey: ["public-projects-showcase"] });
      setIsEditProjectOpen(false);
      setEditProject(null);
      toast({ title: "Project Updated ✅", description: "Project updated successfully." });
    },
    onError: (e: Error) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-projects-showcase"] });
      qc.invalidateQueries({ queryKey: ["public-projects-showcase"] });
      setIsDeleteProjectOpen(false);
      setDeleteProject(null);
      toast({ title: "Project Deleted 🗑️", description: "Project deleted successfully." });
    },
    onError: (e: Error) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  // --- Handlers ---
  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    fd.forEach((v, k) => { if (v) body[k] = v; });
    body.currency = currency;
    if (!body.password) body.password = "client123";
    createClient.mutate(body);
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editClient) return;
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    fd.forEach((v, k) => { if (v) body[k] = v; });
    updateClient.mutate({ id: editClient.id, body });
  };

  const handleCreateCardSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, any> = {
      type: cardType,
      title: fd.get("title") as string,
    };
    
    if (cardType === 'service') {
      body.subtitle = fd.get("subtitle") as string;
      body.icon = cardIcon;
      const bulletsStr = fd.get("bullets") as string;
      body.bullets = bulletsStr ? bulletsStr.split("\n").map(b => b.trim()).filter(Boolean) : [];
    } else {
      body.content = fd.get("content") as string;
      body.author = fd.get("author") as string;
      body.company = fd.get("company") as string;
      body.rating = Number(fd.get("rating"));
      body.avatarUrl = fd.get("avatarUrl") as string;
    }

    createHomeCard.mutate(body);
  };

  const handleEditCardSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editCard) return;
    const fd = new FormData(e.currentTarget);
    const body: Record<string, any> = {
      title: fd.get("title") as string,
    };

    if (editCard.type === 'service') {
      body.subtitle = fd.get("subtitle") as string;
      body.icon = cardIcon;
      const bulletsStr = fd.get("bullets") as string;
      body.bullets = bulletsStr ? bulletsStr.split("\n").map(b => b.trim()).filter(Boolean) : [];
    } else {
      body.content = fd.get("content") as string;
      body.author = fd.get("author") as string;
      body.company = fd.get("company") as string;
      body.rating = Number(fd.get("rating"));
      body.avatarUrl = fd.get("avatarUrl") as string;
    }

    updateHomeCard.mutate({ id: editCard._id, body });
  };

  const handleCreateProjectSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, any> = {
      clientId: fd.get("clientId") as string,
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      color: projectColor,
      totalAmount: Number(fd.get("totalAmount")),
      currency: fd.get("currency") as string,
      startDate: fd.get("startDate") as string || undefined,
      deadline: fd.get("deadline") as string || undefined,
      liveUrl: fd.get("liveUrl") as string || "",
      imageUrl: fd.get("imageUrl") as string || "",
      showcase: fd.get("showcase") === "true",
      status: fd.get("status") as string || "planning",
      progress: Number(fd.get("progress") || 0)
    };
    createProjectMutation.mutate(body);
  };

  const handleEditProjectSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editProject) return;
    const fd = new FormData(e.currentTarget);
    const body: Record<string, any> = {
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      color: projectColor,
      totalAmount: Number(fd.get("totalAmount")),
      currency: fd.get("currency") as string,
      startDate: fd.get("startDate") as string || undefined,
      deadline: fd.get("deadline") as string || undefined,
      liveUrl: fd.get("liveUrl") as string || "",
      imageUrl: fd.get("imageUrl") as string || "",
      showcase: fd.get("showcase") === "true",
      status: fd.get("status") as string,
      progress: Number(fd.get("progress"))
    };
    updateProjectMutation.mutate({ id: editProject.id, body });
  };

  // --- Filtering on Front-End for Local Search in Sub-tables ---
  const contacts = contactData?.data ?? [];
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const feedbacks = feedbackData?.data ?? [];
  const filteredFeedbacks = feedbacks.filter(f =>
    f.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.clientCompany?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    f.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.comments.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = feedbackData?.stats ?? {
    totalCount: 0,
    averageRating: 0,
    recommendAverage: 0,
    satisfactionRate: 100,
    ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };

  const chartData = [
    { name: "5 Stars", count: stats.ratingCounts[5] || 0, fill: "#10b981" },
    { name: "4 Stars", count: stats.ratingCounts[4] || 0, fill: "#3b82f6" },
    { name: "3 Stars", count: stats.ratingCounts[3] || 0, fill: "#eab308" },
    { name: "2 Stars", count: stats.ratingCounts[2] || 0, fill: "#f97316" },
    { name: "1 Star",  count: stats.ratingCounts[1] || 0, fill: "#ef4444" },
  ].reverse();

  const statCards = [
    { title: "Average Rating", value: `${stats.averageRating} / 5`, sub: "out of 5 stars total", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Satisfaction Rate", value: `${stats.satisfactionRate}%`, sub: "4 & 5 star reviews", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "Recommend Score", value: `${stats.recommendAverage} / 10`, sub: "willingness to recommend", icon: ThumbsUp, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Reviews", value: stats.totalCount, sub: "submitted feedback forms", icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-500/10" }
  ];

  const renderClientTable = (clientsList: Client[], isLoading: boolean) => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Contact</TableHead>
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="hidden sm:table-cell">Last Login</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading clients...</TableCell></TableRow>
            ) : clientsList.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No clients found.</TableCell></TableRow>
            ) : (
              clientsList.map((client) => {
                const hasNoProjects = client.projectCount === 0;
                return (
                  <TableRow 
                    key={client.id} 
                    className={`transition-colors ${
                      hasNoProjects 
                        ? "bg-red-500/10 hover:bg-red-500/15 text-red-900 dark:text-red-200" 
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <TableCell>
                      <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
                        {client.photoUrl ? (
                          <img
                            src={client.photoUrl.startsWith('http') ? client.photoUrl : `${(window as any).BACKEND_URL}${client.photoUrl}`}
                            alt={client.name}
                            className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                            {client.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                        )}
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3 h-3" />{client.email}</span>
                        {client.phone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3 h-3" />{client.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-sm"><Building className="w-3.5 h-3.5 text-muted-foreground" />{client.company || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${client.currency === "USD" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-orange-500/10 text-orange-600 border-orange-500/20"}`}>
                        {client.currency === "USD" ? "$ USD" : "₹ INR"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {client.lastLoginAt ? (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(client.lastLoginAt).toLocaleString()}</span>
                      ) : "Never"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 hover:border-primary hover:text-primary"
                          onClick={() => { setEditClient(client); setIsEditOpen(true); }}
                          title="Edit Client"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 hover:border-red-500 hover:text-red-500"
                          onClick={() => { setDeleteClient(client); setIsDeleteOpen(true); }}
                          title="Delete Client"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">Clients & Inquiries Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage clients, self-registered users, general contact inquiries, and overall feedback ratings.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search across all..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => { 
                setSearchTerm(e.target.value); 
                setAdminPage(1); 
                setSelfPage(1); 
              }} 
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Register New Client (Admin Created)</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-1.5"><Label htmlFor="name">Full Name *</Label><Input id="name" name="name" required placeholder="John Smith" /></div>
                <div className="space-y-1.5"><Label htmlFor="email">Email Address *</Label><Input id="email" type="email" name="email" required placeholder="john@company.com" /></div>
                <div className="space-y-1.5"><Label htmlFor="phone">Cell Number</Label><Input id="phone" name="phone" placeholder="+91 98765 43210" /></div>
                <div className="space-y-1.5"><Label htmlFor="company">Company Name</Label><Input id="company" name="company" placeholder="Acme Corp" /></div>
                <div className="space-y-1.5">
                  <Label>Billing Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                      <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label htmlFor="password">Login Password</Label><Input id="password" type="text" name="password" placeholder="Default: client123" /></div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createClient.isPending} className="bg-primary text-primary-foreground">
                    {createClient.isPending ? "Creating..." : "Create Client"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs list section */}
      <Tabs defaultValue="clients-admin" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl flex flex-wrap gap-1 w-full justify-start md:w-auto h-auto">
          <TabsTrigger value="clients-admin" className="rounded-lg py-2 text-xs md:text-sm font-semibold">
            Clients (Admin Created) ({adminData?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="recycle" className="rounded-lg py-2 text-xs md:text-sm font-semibold">
            🗑️ Recycle Bin ({recycleBinData?.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="clients-self" className="rounded-lg py-2 text-xs md:text-sm font-semibold">
            Self-Registered ({selfData?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="contact-inquiries" className="rounded-lg py-2 text-xs md:text-sm font-semibold">
            Contact Messages ({filteredContacts.length})
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="rounded-lg py-2 text-xs md:text-sm font-semibold">
            Reviews & Charts ({filteredFeedbacks.length})
          </TabsTrigger>
          <TabsTrigger value="home-editor" className="rounded-lg py-2 text-xs md:text-sm font-semibold">
            🎨 Home Page Editor
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Admin Created Clients */}
        <TabsContent value="clients-admin">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-0">
              {renderClientTable(adminData?.data ?? [], isLoadingAdmin)}
              {adminData && adminData.totalPages > 1 && (
                <Pagination 
                  page={adminPage} 
                  totalPages={adminData.totalPages} 
                  total={adminData.total} 
                  limit={10} 
                  onPageChange={setAdminPage} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Self Registered Clients */}
        <TabsContent value="clients-self">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-0">
              {renderClientTable(selfData?.data ?? [], isLoadingSelf)}
              {selfData && selfData.totalPages > 1 && (
                <Pagination 
                  page={selfPage} 
                  totalPages={selfData.totalPages} 
                  total={selfData.total} 
                  limit={10} 
                  onPageChange={setSelfPage} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Contact Inquiry Messages */}
        <TabsContent value="contact-inquiries">
          <div className="space-y-4">
            {isLoadingContacts ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : filteredContacts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-10 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                  <Mail className="w-10 h-10 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No contact inquiries found</p>
                  <p className="text-xs max-w-xs leading-relaxed">Submit requests on the public Home Page and they will appear here in real-time.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredContacts.map((msg) => (
                  <Card 
                    key={msg._id} 
                    className="border-border/60 hover:shadow-md hover:border-primary/30 transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer group"
                    onClick={() => {
                      setSelectedContact(msg);
                      setIsContactDetailsOpen(true);
                    }}
                  >
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary/70 group-hover:bg-primary transition-colors" />
                    <CardHeader className="pb-2 pl-6 pr-4 pt-4 flex flex-row items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge className="mb-1 bg-primary/10 text-primary border-primary/20 text-[9px] capitalize font-bold tracking-wider">
                          Inquiry
                        </Badge>
                        <CardTitle className="text-sm font-bold font-serif leading-tight text-foreground truncate group-hover:text-primary transition-colors">
                          {msg.subject}
                        </CardTitle>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-red-500 border-red-200 hover:border-red-500 hover:bg-red-500/10 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to permanently delete this contact inquiry message?")) {
                            deleteContactMessage.mutate(msg._id);
                          }
                        }}
                        disabled={deleteContactMessage.isPending}
                        title="Delete inquiry"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </Button>
                    </CardHeader>
                    
                    <CardContent className="pl-6 pr-4 pb-4 space-y-3 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-foreground/80 leading-relaxed italic bg-muted/40 p-2.5 rounded-lg border border-border/10 line-clamp-3">
                        "{msg.message}"
                      </p>
                      
                      <div className="pt-2.5 border-t border-border/40 flex justify-between items-center text-[10px] flex-wrap gap-2 text-muted-foreground">
                        <div className="min-w-0">
                          <span className="font-bold text-foreground block truncate">{msg.name}</span>
                          <span className="block mt-0.5 truncate text-[9px]">{msg.email}</span>
                        </div>
                        <div className="text-right flex items-center gap-1 font-medium shrink-0">
                          <Calendar className="w-3 h-3 opacity-60" />
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Inquiry Details Modal */}
            <Dialog open={isContactDetailsOpen} onOpenChange={setIsContactDetailsOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" /> Contact Inquiry Details
                  </DialogTitle>
                </DialogHeader>
                {selectedContact && (
                  <div className="space-y-4 pt-3 text-sm">
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Sender Name</span>
                        <span className="font-semibold text-foreground">{selectedContact.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Email Address</span>
                        <a href={`mailto:${selectedContact.email}`} className="font-semibold text-primary hover:underline truncate block">{selectedContact.email}</a>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Phone / Contact</span>
                        <span className="font-semibold text-foreground">{selectedContact.phone || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Submission Date</span>
                        <span className="font-semibold text-foreground">{new Date(selectedContact.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {(selectedContact.projectType || selectedContact.otherProjectType) && (
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 grid grid-cols-2 gap-4">
                        {selectedContact.projectType && (
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-primary/80 block">Project Type</span>
                            <span className="font-semibold text-foreground capitalize">{selectedContact.projectType}</span>
                          </div>
                        )}
                        {selectedContact.otherProjectType && (
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-primary/80 block">Other Details</span>
                            <span className="font-semibold text-foreground">{selectedContact.otherProjectType}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-0.5">Subject</span>
                      <div className="p-3 bg-card border rounded-lg font-serif font-bold text-base text-foreground">
                        {selectedContact.subject}
                      </div>
                    </div>

                    {selectedContact.description && (
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-0.5">Description</span>
                        <div className="p-3 bg-card border rounded-lg text-foreground leading-relaxed whitespace-pre-wrap">
                          {selectedContact.description}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-0.5">Message Content</span>
                      <div className="p-3 bg-muted/50 border rounded-lg text-foreground italic leading-relaxed whitespace-pre-wrap">
                        "{selectedContact.message}"
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to permanently delete this contact inquiry message?")) {
                            deleteContactMessage.mutate(selectedContact._id);
                            setIsContactDetailsOpen(false);
                          }
                        }}
                        disabled={deleteContactMessage.isPending}
                        className="h-9"
                      >
                        <Trash className="w-4 h-4 mr-2" /> Delete Message
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsContactDetailsOpen(false)} className="h-9">
                        Close Details
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* Tab 4: Client Feedbacks */}
        <TabsContent value="feedbacks" className="space-y-6">
          {isLoadingFeedback ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {statCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <Card key={i} className="border-border/50 shadow-sm">
                      <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-muted-foreground truncate uppercase tracking-wider">{card.title}</p>
                          <h3 className="text-base sm:text-lg md:text-xl font-bold mt-1.5 text-foreground truncate">{card.value}</h3>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{card.sub}</p>
                        </div>
                        <div className={`p-2.5 sm:p-3 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>              {/* Chart & Insights Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Rating Distribution Chart (col-span-2) */}
                <Card className="lg:col-span-2 border-border/50 shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg font-serif">Rating Distribution</CardTitle>
                    <CardDescription className="text-xs">Visualizing review frequencies across star rating levels</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1">
                    <div className="h-56 sm:h-64 w-full">
                      {stats.totalCount > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                            <XAxis type="number" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={60} />
                            <ChartTooltip
                              cursor={{ fill: "rgba(120, 120, 120, 0.08)" }}
                              contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                              formatter={(val: number) => [`${val} reviews`, "Count"]}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                              {chartData.map((entry, index) => (
                                <rect key={`rect-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No review details available yet</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Highlight Stats Info Box (col-span-1) */}
                <Card className="lg:col-span-1 border-border/50 shadow-sm bg-gradient-to-br from-primary/[0.04] via-indigo-500/[0.01] to-transparent">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg font-serif">Satisfaction Insights</CardTitle>
                    <CardDescription className="text-xs">Summary of overall loyalty index metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="p-4 bg-card rounded-xl border border-border/60 space-y-3 shadow-xs">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Client satisfaction rate</span>
                        <span className="font-bold text-emerald-500">{stats.satisfactionRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${stats.satisfactionRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <h4 className="font-semibold text-xs text-foreground uppercase tracking-widest leading-none">Net Promoter Metric</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your average recommendation score is <span className="font-bold text-primary">{stats.recommendAverage}/10</span>. An average score above 8.5 indicates outstanding client advocacy and reference potential.
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t text-[11px] text-muted-foreground/80 leading-relaxed">
                      When projects reach 100% completion in updates, a feedback email trigger links clients directly to their project review page.
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feedbacks reviews cards list */}
              <div className="space-y-4">
                <h2 className="text-lg font-serif font-bold text-foreground">Feedback Reviews</h2>
                
                {filteredFeedbacks.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-10 text-center text-muted-foreground text-sm">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No feedback reviews found.</p>
                      <p className="text-xs mt-1 text-muted-foreground/60">Form invites will be sent out as active client projects are completed.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredFeedbacks.map((f) => (
                      <Card key={f._id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                        
                        {/* Visual Accent border based on star rating */}
                        <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${
                          f.rating >= 4 ? "bg-emerald-500" :
                          f.rating === 3 ? "bg-yellow-500" :
                          "bg-red-500"
                        }`} />

                        <CardContent className="p-5 pl-6 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            
                            {/* Header: Stars & Recommendation */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${
                                      i < f.rating 
                                        ? "fill-amber-400 text-amber-400" 
                                        : "text-zinc-200 dark:text-zinc-800"
                                    }`} 
                                  />
                                ))}
                              </div>
                              <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium">
                                Recommend: {f.recommendRating || 10}/10
                              </Badge>
                            </div>

                            {/* Feedback Comments Box */}
                            <p className="text-sm text-foreground/80 font-serif leading-relaxed italic bg-muted/20 p-3 rounded-lg border border-border/20">
                              "{f.comments}"
                            </p>
                          </div>

                          {/* Footer metadata details */}
                          <div className="pt-3 border-t border-border/40 flex justify-between items-center text-xs flex-wrap gap-2">
                            <div>
                              <p className="font-bold text-foreground">{f.clientName}</p>
                              <p className="text-[10px] text-muted-foreground">{f.clientCompany || "Client"}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-primary">{f.projectName}</p>
                              <p className="text-[9px] text-muted-foreground/60 flex items-center justify-end gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" /> {new Date(f.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab 5: Recycle Bin */}
        <TabsContent value="recycle">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden md:table-cell">Company</TableHead>
                      <TableHead>Deleted At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!recycleBinData?.data?.length ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Recycle bin is empty.</TableCell></TableRow>
                    ) : (
                      recycleBinData.data
                        .filter(dc => 
                          dc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          dc.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (dc.company || "").toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((dc) => (
                          <TableRow key={dc._id} className="hover:bg-muted/20">
                            <TableCell className="font-medium text-muted-foreground">{dc.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{dc.email}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{dc.company || "—"}</TableCell>
                            <TableCell className="text-xs text-red-500">{new Date(dc.deletedAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-500/10"
                                  onClick={() => restoreClient.mutate(dc._id)}
                                  disabled={restoreClient.isPending}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" /> Restore
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-red-500 text-red-500 hover:bg-red-500/10"
                                  onClick={() => {
                                    if (confirm(`Permanently delete ${dc.name}? This cannot be undone.`)) {
                                      permanentDeleteClient.mutate(dc._id);
                                    }
                                  }}
                                  disabled={permanentDeleteClient.isPending}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Home Page Editor */}
        <TabsContent value="home-editor" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-foreground">Home Page Editor</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage Services and Testimonials dynamically displayed on the public Home Page.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => { setCardType('service'); setCardIcon('Globe'); setIsCreateCardOpen(true); }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Service Card
              </Button>
              <Button 
                onClick={() => { setCardType('testimonial'); setIsCreateCardOpen(true); }}
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Testimonial
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Services Column */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base sm:text-lg font-serif flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" /> Service Cards
                </CardTitle>
                <CardDescription className="text-xs">These cards represent your core developer offerings.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {isLoadingHomeCards ? (
                  <p className="text-sm text-center text-muted-foreground">Loading services...</p>
                ) : !homeCardsData?.services?.length ? (
                  <p className="text-sm text-center text-muted-foreground py-6">No services cards defined.</p>
                ) : (
                  <div className="space-y-3">
                    {homeCardsData.services.map((service) => {
                      const LucideIcon = ICON_MAP[service.icon || 'Globe'] || Globe;
                      return (
                        <div key={service._id} className="p-4 bg-muted/20 border border-border/60 rounded-xl flex items-start gap-3 justify-between group hover:border-primary/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                              <LucideIcon className="w-4 h-4" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold font-mono text-primary uppercase tracking-wide leading-none">{service.subtitle}</p>
                              <h4 className="text-sm font-bold text-foreground">{service.title}</h4>
                              {service.bullets && service.bullets.length > 0 && (
                                <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-muted-foreground font-sans">
                                  {service.bullets.map((b, i) => (
                                    <li key={i} className="flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-primary/60" /> {b}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => {
                                setEditCard(service);
                                setCardType('service');
                                setCardIcon(service.icon || 'Globe');
                                setIsEditCardOpen(true);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => {
                                if (confirm(`Delete service card "${service.title}"?`)) {
                                  deleteHomeCard.mutate(service._id);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Testimonials Column */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base sm:text-lg font-serif flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Testimonials & Reviews
                </CardTitle>
                <CardDescription className="text-xs">Dynamic customer feedback shown in the homepage carousel.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {isLoadingHomeCards ? (
                  <p className="text-sm text-center text-muted-foreground">Loading testimonials...</p>
                ) : !homeCardsData?.testimonials?.length ? (
                  <p className="text-sm text-center text-muted-foreground py-6">No testimonials defined.</p>
                ) : (
                  <div className="space-y-3">
                    {homeCardsData.testimonials.map((test) => (
                      <div key={test._id} className="p-4 bg-muted/20 border border-border/60 rounded-xl flex items-start gap-3 justify-between group hover:border-primary/30 transition-colors">
                        <div className="min-w-0 space-y-2 flex-1">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${(test.rating ?? 5) > i ? "fill-amber-400 text-amber-400" : "text-zinc-200 dark:text-zinc-800"}`} />
                            ))}
                          </div>
                          <p className="text-xs text-foreground/80 italic line-clamp-2">"{test.content}"</p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40 font-mono">
                            <span className="font-bold text-foreground">{test.author}</span>
                            <span>{test.company}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setEditCard(test);
                              setCardType('testimonial');
                              setIsEditCardOpen(true);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => {
                              if (confirm(`Delete testimonial by ${test.author}?`)) {
                                deleteHomeCard.mutate(test._id);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Showcase Projects Column */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-serif flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-indigo-500" /> Showcase Projects
                  </CardTitle>
                  <CardDescription className="text-xs">Select which client projects appear on the home page portfolio.</CardDescription>
                </div>
                <Button 
                  size="sm"
                  onClick={() => { setProjectColor('#3b82f6'); setIsCreateProjectOpen(true); }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs py-1 h-8 px-3.5"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Project
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {isLoadingAllProjects ? (
                  <p className="text-sm text-center text-muted-foreground">Loading projects...</p>
                ) : !allProjectsData?.data?.length ? (
                  <p className="text-sm text-center text-muted-foreground py-6">No projects defined.</p>
                ) : (
                  <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
                    {allProjectsData.data.map((proj) => (
                      <div key={proj.id} className="p-3 bg-muted/20 border border-border/60 rounded-xl flex items-center justify-between gap-3 group hover:border-primary/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-foreground truncate">{proj.name}</h4>
                          <span className="text-[10px] text-muted-foreground block truncate">{proj.clientCompany || "No Company"} ({proj.clientName})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Label htmlFor={`showcase-${proj.id}`} className="text-[10px] cursor-pointer text-muted-foreground select-none">
                            Showcase
                          </Label>
                          <input 
                            type="checkbox"
                            id={`showcase-${proj.id}`}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                            checked={proj.showcase || false}
                            onChange={(e) => {
                              updateProjectShowcase.mutate({ id: proj.id, showcase: e.target.checked });
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setEditProject(proj);
                              setProjectColor(proj.color || '#3b82f6');
                              setIsEditProjectOpen(true);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => {
                              setDeleteProject(proj);
                              setIsDeleteProjectOpen(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) setEditClient(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Client Details</DialogTitle>
          </DialogHeader>
          {editClient && (
            <form onSubmit={handleEdit} className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Full Name</Label><Input name="name" defaultValue={editClient.name} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" defaultValue={editClient.email} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" defaultValue={editClient.phone ?? ""} /></div>
              <div className="space-y-1.5"><Label>Company</Label><Input name="company" defaultValue={editClient.company ?? ""} /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateClient.isPending} className="bg-primary text-primary-foreground">
                  {updateClient.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(o) => { setIsDeleteOpen(o); if (!o) setDeleteClient(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" /> Move to Recycle Bin
            </DialogTitle>
          </DialogHeader>
          {deleteClient && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-semibold text-foreground">{deleteClient.name}</span>?
                This will move the client to the recycle bin. You can restore them later.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteClientMutation.mutate(deleteClient.id)}
                  disabled={deleteClientMutation.isPending}
                >
                  {deleteClientMutation.isPending ? "Deleting..." : "Move to Recycle Bin"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Card Dialog */}
      <Dialog open={isCreateCardOpen} onOpenChange={setIsCreateCardOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Create {cardType === 'service' ? 'Service Card' : 'Testimonial'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCardSubmit} className="space-y-4 pt-2">
            {cardType === 'service' ? (
              <>
                <div className="space-y-1.5">
                  <Label>Service Title *</Label>
                  <Input name="title" required placeholder="Web Development" />
                </div>
                <div className="space-y-1.5">
                  <Label>Badge Subtitle</Label>
                  <Input name="subtitle" placeholder="🌐 Web Development" />
                </div>
                <div className="space-y-1.5">
                  <Label>Lucide Icon</Label>
                  <Select value={cardIcon} onValueChange={setCardIcon}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Globe">Globe (🌐)</SelectItem>
                      <SelectItem value="Code2">Code2 (⚛️)</SelectItem>
                      <SelectItem value="LayoutDashboard">Dashboard (📊)</SelectItem>
                      <SelectItem value="ShoppingCart">ShoppingCart (🛒)</SelectItem>
                      <SelectItem value="Cpu">Cpu (🤖)</SelectItem>
                      <SelectItem value="Link2">Link2 (🔗)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Feature Bullets (one per line)</Label>
                  <Textarea name="bullets" rows={4} placeholder="Responsive Websites&#10;Landing Pages&#10;Portfolio Websites" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Client Review Title *</Label>
                  <Input name="title" required placeholder="Outstanding Dashboard Architecture" />
                </div>
                <div className="space-y-1.5">
                  <Label>Review Comments *</Label>
                  <Textarea name="content" required placeholder="Describe feedback comments..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Author Name *</Label>
                  <Input name="author" required placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Company Name</Label>
                  <Input name="company" placeholder="Acme Corp" />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Avatar / Company Logo URL</Label>
                  <Input name="avatarUrl" placeholder="https://example.com/logo.jpg" />
                </div>
                <div className="space-y-1.5">
                  <Label>Star Rating</Label>
                  <select name="rating" defaultValue="5" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsCreateCardOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createHomeCard.isPending} className="bg-primary text-primary-foreground">
                {createHomeCard.isPending ? "Creating..." : "Create Card"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={isEditCardOpen} onOpenChange={(o) => { setIsEditCardOpen(o); if (!o) setEditCard(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Edit {editCard?.type === 'service' ? 'Service Card' : 'Testimonial'}
            </DialogTitle>
          </DialogHeader>
          {editCard && (
            <form onSubmit={handleEditCardSubmit} className="space-y-4 pt-2">
              {editCard.type === 'service' ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Service Title *</Label>
                    <Input name="title" defaultValue={editCard.title} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Badge Subtitle</Label>
                    <Input name="subtitle" defaultValue={editCard.subtitle} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lucide Icon</Label>
                    <Select value={cardIcon} onValueChange={setCardIcon}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Globe">Globe (🌐)</SelectItem>
                        <SelectItem value="Code2">Code2 (⚛️)</SelectItem>
                        <SelectItem value="LayoutDashboard">Dashboard (📊)</SelectItem>
                        <SelectItem value="ShoppingCart">ShoppingCart (🛒)</SelectItem>
                        <SelectItem value="Cpu">Cpu (🤖)</SelectItem>
                        <SelectItem value="Link2">Link2 (🔗)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Feature Bullets (one per line)</Label>
                    <Textarea name="bullets" defaultValue={editCard.bullets?.join("\n")} rows={4} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Client Review Title *</Label>
                    <Input name="title" defaultValue={editCard.title} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Review Comments *</Label>
                    <Textarea name="content" defaultValue={editCard.content} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Client Author Name *</Label>
                    <Input name="author" defaultValue={editCard.author} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Client Company Name</Label>
                    <Input name="company" defaultValue={editCard.company} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Client Avatar / Company Logo URL</Label>
                    <Input name="avatarUrl" defaultValue={editCard.avatarUrl ?? ""} placeholder="https://example.com/logo.jpg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Star Rating</Label>
                    <select name="rating" defaultValue={String(editCard.rating ?? 5)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsEditCardOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateHomeCard.isPending} className="bg-primary text-primary-foreground">
                  {updateHomeCard.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Showcase Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Start & Showcase New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProjectSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <select name="clientId" required defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="" disabled>Select a client</option>
                {clientsSelectData?.data?.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company || "No Company"})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Project Name *</Label>
                <Input name="name" required placeholder="SaaS Billing System" />
              </div>
              <div className="space-y-1.5">
                <Label>Showcase on Homepage</Label>
                <select name="showcase" defaultValue="true" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea name="description" placeholder="Project overview and tech stack..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Live Website URL</Label>
                <Input name="liveUrl" placeholder="https://example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Screenshot / Image URL</Label>
                <Input name="imageUrl" placeholder="https://unsplash.com/...jpg" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Budget / Amount *</Label>
                <Input type="number" name="totalAmount" required min="0" defaultValue="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <select name="currency" defaultValue="INR" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" name="startDate" />
              </div>
              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <Input type="date" name="deadline" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select name="status" defaultValue="planning" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input type="number" name="progress" min="0" max="100" defaultValue="0" />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between items-center">
                <Label>Client Project Color</Label>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-bold leading-none">
                  {projectColor}
                </span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-[80px] overflow-y-auto border border-border/50 rounded-xl p-2 bg-muted/20 select-none">
                {PREMIUM_COLORS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setProjectColor(col.value)}
                    className="w-5.5 h-5.5 rounded-full transition-all border border-black/10 flex items-center justify-center shrink-0 hover:scale-110 active:scale-95"
                    style={{ backgroundColor: col.value }}
                    title={col.name}
                  >
                    {projectColor.toLowerCase() === col.value.toLowerCase() && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createProjectMutation.isPending} className="bg-primary text-primary-foreground">
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Showcase Project Dialog */}
      <Dialog open={isEditProjectOpen} onOpenChange={(o) => { setIsEditProjectOpen(o); if (!o) setEditProject(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Showcase Project</DialogTitle>
          </DialogHeader>
          {editProject && (
            <form onSubmit={handleEditProjectSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Project Name *</Label>
                  <Input name="name" required defaultValue={editProject.name} />
                </div>
                <div className="space-y-1.5">
                  <Label>Showcase on Homepage</Label>
                  <select name="showcase" defaultValue={String(editProject.showcase ?? true)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea name="description" defaultValue={editProject.description || ""} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Live Website URL</Label>
                  <Input name="liveUrl" defaultValue={editProject.liveUrl || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Screenshot / Image URL</Label>
                  <Input name="imageUrl" defaultValue={editProject.imageUrl || ""} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Budget / Amount *</Label>
                  <Input type="number" name="totalAmount" required min="0" defaultValue={editProject.totalAmount} />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <select name="currency" defaultValue={editProject.currency || "INR"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    name="startDate" 
                    defaultValue={editProject.startDate ? new Date(editProject.startDate).toISOString().split('T')[0] : ""} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Deadline</Label>
                  <Input 
                    type="date" 
                    name="deadline" 
                    defaultValue={editProject.deadline ? new Date(editProject.deadline).toISOString().split('T')[0] : ""} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select name="status" defaultValue={editProject.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none">
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Progress (%)</Label>
                  <Input type="number" name="progress" min="0" max="100" defaultValue={editProject.progress} />
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center">
                  <Label>Client Project Color</Label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-bold leading-none">
                    {projectColor}
                  </span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-[80px] overflow-y-auto border border-border/50 rounded-xl p-2 bg-muted/20 select-none">
                  {PREMIUM_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setProjectColor(col.value)}
                      className="w-5.5 h-5.5 rounded-full transition-all border border-black/10 flex items-center justify-center shrink-0 hover:scale-110 active:scale-95"
                      style={{ backgroundColor: col.value }}
                      title={col.name}
                    >
                      {projectColor.toLowerCase() === col.value.toLowerCase() && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsEditProjectOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateProjectMutation.isPending} className="bg-primary text-primary-foreground">
                  {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={isDeleteProjectOpen} onOpenChange={(o) => { setIsDeleteProjectOpen(o); if (!o) setDeleteProject(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" /> Permanent Project Deletion
            </DialogTitle>
          </DialogHeader>
          {deleteProject && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Are you sure you want to permanently delete project <span className="font-semibold text-foreground">"{deleteProject.name}"</span>?
                This action is irreversible and will also clean up associated payments and schedule records.
              </p>
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDeleteProjectOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteProjectMutation.mutate(deleteProject.id)}
                  disabled={deleteProjectMutation.isPending}
                >
                  {deleteProjectMutation.isPending ? "Deleting..." : "Delete Permanently"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
