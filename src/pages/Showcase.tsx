import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, clearToken } from "@/lib/api";
import { useAuthUser, useLogout } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Globe, Star, Heart, CheckCircle2, ChevronRight, Sun, Moon, 
  Settings, LogOut, LayoutDashboard, Calendar, IndianRupee, DollarSign,
  AlertCircle, ShieldCheck, Clock, Award
} from "lucide-react";
import SBLogo from "@/components/SBLogo";

interface Milestone {
  _id: string;
  title: string;
  status: "pending" | "in-progress" | "completed";
  dueDate?: string;
}

interface ProjectUpdate {
  _id: string;
  title: string;
  description: string;
  category: "milestone" | "general" | "payment" | "alert";
  progress: number;
  createdAt: string;
}

interface PublicProject {
  id: string;
  name: string;
  description: string;
  clientName: string;
  clientCompany: string;
  status: string;
  progress: number;
  color?: string;
  liveUrl?: string;
  imageUrl?: string;
  milestones?: Milestone[];
  updates?: ProjectUpdate[];
  startDate?: string;
  deadline?: string;
  totalAmount?: number;
  paidAmount?: number;
  currency?: string;
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

const DEFAULT_TESTIMONIALS = [
  {
    _id: "t1",
    author: "Arjun Sen",
    company: "TechFlow Systems",
    rating: 5,
    content: "The custom dashboard developed by Strategic Brand Solutions has revolutionized our internal operations. Outstanding speed and sleek design.",
    projectName: "TechFlow ERP Portal"
  },
  {
    _id: "t2",
    author: "Rohit Sharma",
    company: "Blue Creative",
    rating: 5,
    content: "Excellent communication and brilliant design sensibilities. The live website preview cards on the client portal are a massive hit.",
    projectName: "Creative Agency Hub"
  },
  {
    _id: "t3",
    author: "Sara Jenkins",
    company: "Veloce SaaS",
    rating: 5,
    content: "We got exactly what we needed: a high-converting landing page and an integrated chat system. Exceptional MERN stack consulting.",
    projectName: "Veloce Landing Page"
  }
];

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  planning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  on_hold: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default function Showcase() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: user } = useAuthUser();
  const logoutMutation = useLogout();
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PublicProject | null>(null);

  // Sync theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Fetch showcase projects
  const { data: projectsData, isLoading: loadingProjects } = useQuery<{ data: PublicProject[] }>({
    queryKey: ["public-projects-showcase"],
    queryFn: () => apiFetch<{ data: PublicProject[] }>("/projects/public"),
    staleTime: 10000
  });

  // Fetch testimonials
  const { data: cardsData } = useQuery<{ services: HomeCard[], testimonials: HomeCard[] }>({
    queryKey: ["home-page-cards"],
    queryFn: () => apiFetch<{ services: HomeCard[], testimonials: HomeCard[] }>("/home-cards"),
    staleTime: 60000
  });

  const testimonialsList = cardsData?.testimonials?.length ? cardsData.testimonials : DEFAULT_TESTIMONIALS;
  const projectsList = projectsData?.data ?? [];

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setProfileDropdownOpen(false);
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        window.location.href = "/";
      }
    });
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer select-none">
            <SBLogo size={40} rounded="xl" />
            <div className="hidden sm:block">
              <span className="font-serif font-black text-foreground text-sm tracking-wide block leading-none">Strategic Brand Solutions</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Creative Brand Consulting</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors cursor-pointer">Home</Link>
            <span className="text-primary font-bold cursor-default">Showcase</span>
          </nav>

          <div className="flex items-center gap-2.5 relative">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDark(prev => !prev)} 
              className="rounded-full w-9 h-9 border border-border/30 hover:bg-muted shrink-0 text-foreground"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-600" />}
            </Button>

            {user ? (
              <div className="relative">
                {/* Profile Initial Circle Avatar */}
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-background focus:outline-none hover:scale-105 active:scale-95 transition-transform"
                >
                  {getInitial(user.name)}
                </button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setProfileDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-card border border-border/85 shadow-2xl p-1.5 z-50 backdrop-blur-md bg-opacity-95"
                      >
                        <div className="px-3 py-2 border-b border-border/40 mb-1">
                          <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Link href={user.role === "admin" ? "/admin" : "/client"}>
                          <button 
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-left"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                          </button>
                        </Link>
                        <Link href={user.role === "admin" ? "/admin/settings" : "/client/profile"}>
                          <button 
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-left"
                          >
                            <Settings className="w-3.5 h-3.5" /> Settings
                          </button>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left font-semibold"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Logout
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="h-9 text-xs sm:text-sm border-primary/20 hover:bg-primary/5 text-primary font-bold">
                  Login
                </Button>
              </Link>
            )}

            <Link href="/?contact=true">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs sm:text-sm shrink-0">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Visual Hero Section */}
      <section className="relative pt-16 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[300px] bg-gradient-to-b from-primary/10 via-primary/2 to-transparent rounded-b-full blur-3xl pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Badge variant="outline" className="bg-primary/5 text-primary font-mono text-[10px] uppercase tracking-widest py-1 border-primary/20 select-none">
            SBS Portfolio
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight leading-none text-foreground">
            Showcase Projects
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-muted-foreground font-serif leading-relaxed italic border-x border-border/30 px-6 sm:px-10">
            Explore our curated selection of high-fidelity MERN stack applications, brand identity dashboards, and custom client portal systems.
          </p>
        </div>
      </section>

      {/* 3. Showcase Projects Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1">
        {loadingProjects ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 rounded-3xl bg-muted animate-pulse border border-border/50" />
            ))}
          </div>
        ) : projectsList.length === 0 ? (
          <div className="text-center p-16 border border-dashed rounded-3xl max-w-md mx-auto text-muted-foreground text-sm bg-card">
            No showcase projects active. Please check back later.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {projectsList.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className="group cursor-pointer rounded-3xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-500 flex flex-col h-full relative"
              >
                {/* Project Image */}
                <div className="relative w-full overflow-hidden bg-muted aspect-video select-none">
                  {p.imageUrl ? (
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : p.liveUrl ? (
                    <div className="w-full h-full relative overflow-hidden">
                      <iframe
                        src={p.liveUrl}
                        className="w-full h-full border-none pointer-events-none absolute inset-0"
                        style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%', height: '133%' }}
                        title={`${p.name} preview`}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                      <Globe className="w-10 h-10 text-primary/30" />
                    </div>
                  )}
                  {/* Bottom accent bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: p.color || '#7c3aed' }} />
                </div>

                {/* Project content */}
                <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <span className="text-[9px] font-mono font-bold text-primary uppercase block tracking-wider truncate">
                      {p.clientCompany || "Enterprise solution"}
                    </span>
                    <h3 className="text-sm font-serif font-black text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {p.name}
                    </h3>
                  </div>

                  {/* View Details button at bottom */}
                  <Button
                    variant="secondary"
                    className="w-full h-9 rounded-xl text-xs font-bold bg-muted/60 text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Project Detail Popup Modal */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => { if (!open) setSelectedProject(null); }}>
        {selectedProject && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-t-4 border-t-primary p-0">
            <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <Badge variant="outline" className={`capitalize text-[9px] font-mono font-bold select-none ${STATUS_COLORS[selectedProject.status] ?? ""}`}>
                    {selectedProject.status.replace("_", " ")}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{selectedProject.clientCompany || "Strategic Client"}</span>
                </div>
                <DialogTitle className="font-serif text-xl sm:text-2xl text-foreground mt-2 leading-tight">
                  {selectedProject.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Comprehensive project roadmap, status milestones, and execution logs.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Overview</h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {selectedProject.description || "No project overview available."}
                </p>
              </div>

              {/* Status and Progress */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-border/60 py-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Development Progress</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${selectedProject.progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-primary font-mono">{selectedProject.progress}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Budget & Currency</h4>
                  <div className="flex items-center gap-1 text-sm font-bold text-emerald-500 font-mono">
                    {selectedProject.currency === 'USD' ? <DollarSign className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                    <span>{selectedProject.totalAmount ? selectedProject.totalAmount.toLocaleString() : "TBD"}</span>
                    <span className="text-[10px] text-muted-foreground font-normal ml-1.5">
                      ({selectedProject.paidAmount ? `${((selectedProject.paidAmount / (selectedProject.totalAmount || 1)) * 100).toFixed(0)}% paid` : "Pending"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Timings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block">Initiated Date</span>
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : "Pending"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block">Estimated Delivery</span>
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : "Pending"}</span>
                  </div>
                </div>
              </div>

              {/* Milestones Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Deliverables checklist
                </h4>
                {(!selectedProject.milestones || selectedProject.milestones.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic">No milestones defined for this showcase.</p>
                ) : (
                  <div className="border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/30 bg-muted/10">
                    {selectedProject.milestones.map((m) => (
                      <div key={m._id} className="flex items-center justify-between p-3.5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            m.status === 'completed' ? 'bg-emerald-500' :
                            m.status === 'in-progress' ? 'bg-blue-500 animate-pulse' :
                            'bg-muted-foreground/30'
                          }`} />
                          <span className={`${m.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                            {m.title}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-muted-foreground shrink-0 uppercase tracking-wide">
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Updates Logs Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> Project logs timeline
                </h4>
                {(!selectedProject.updates || selectedProject.updates.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic">No updates logs posted yet.</p>
                ) : (
                  <div className="relative border-l border-border/70 ml-2.5 pl-5 space-y-5">
                    {selectedProject.updates.map((u) => (
                      <div key={u._id} className="relative group">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                          u.category === 'milestone' ? 'bg-indigo-500' : 'bg-muted-foreground/60'
                        }`} />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h5 className="text-xs font-bold text-foreground leading-none">{u.title}</h5>
                            <span className="text-[9px] font-mono text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{u.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => setSelectedProject(null)} className="h-10 text-xs px-6 font-bold">
                  Close Preview
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* 5. Testimonials Scrolling Marquee */}
      <section className="py-16 md:py-24 bg-muted/15 border-t border-b overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-serif font-black text-foreground flex items-center justify-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" /> Client Success Stories
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Read comments left by verified companies and clients upon successful project completion.
          </p>
        </div>

        <div className="relative w-full overflow-hidden py-4">
          <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          <div className="animate-marquee-testimonials">
            {[...testimonialsList, ...testimonialsList, ...testimonialsList].map((f: any, idx) => (
              <Card 
                key={`${f._id || idx}-${idx}`} 
                className="w-[300px] sm:w-[360px] shrink-0 border border-border/50 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden bg-card select-none"
              >
                <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-primary" />
                <CardContent className="p-5 pl-6 space-y-4 flex flex-col justify-between h-[180px]">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, idx2) => (
                          <Star 
                            key={idx2} 
                            className={`w-3.5 h-3.5 ${
                              idx2 < (f.rating ?? 5) 
                                ? "fill-amber-400 text-amber-400" 
                                : "text-zinc-200 dark:text-zinc-800"
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">Verified client</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-foreground/80 leading-relaxed italic line-clamp-3">
                      "{f.content || f.comments}"
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {f.avatarUrl ? (
                        <img 
                          src={f.avatarUrl} 
                          alt={f.author || f.clientName} 
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-border"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary/20">
                          {getInitial(f.author || f.clientName || "C")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-foreground block truncate">{f.author || f.clientName}</span>
                        <span className="block mt-0.5 truncate text-[9px]">{f.company || f.clientCompany || "Client"}</span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      {f.projectName && (
                        <span className="font-medium text-primary block truncate max-w-[120px] text-[10px]">{f.projectName}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="border-t bg-card py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground mt-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2">
            <SBLogo size={24} rounded="lg" />
            <span className="font-serif font-bold text-foreground">Strategic Brand Solutions</span>
          </div>
          <p>© {new Date().getFullYear()} Strategic Brand Solutions. All rights reserved.</p>
          <div className="flex justify-center gap-4 text-muted-foreground/80 flex-wrap">
            <span>Email: akhilthadaka97@gmail.com</span>
            <span>•</span>
            <span>Support Portfolio Portal</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
