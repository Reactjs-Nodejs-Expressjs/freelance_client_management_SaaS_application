import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiUploadNotes } from "@/lib/api";
import { 
  FileText, Plus, Calendar, User, Trash2, Edit, AlertCircle, 
  FileUp, Paperclip, Download, Smile, X, Image as ImageIcon, Check,
  Layers, CheckSquare, Briefcase, Share2, Archive, Flag, Building, Star, Search, Lock, Unlock, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  _id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  isImportant: boolean;
  popupTarget?: string;
  attachments: string[];
  createdAt: string;
  category?: string;
}

const EMOJIS = ["💬", "📝", "📢", "💡", "⚠️", "🔥", "🤝", "🚀", "💳", "✅", "❌", "⏳"];

const sidebarCategories = [
  { value: "all", label: "Alls", icon: Layers, color: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
  { value: "tasks", label: "Tasks", icon: CheckSquare, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { value: "works", label: "Works", icon: Briefcase, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { value: "social", label: "Social", icon: Share2, color: "text-pink-600 bg-pink-500/10 border-pink-500/20" },
  { value: "archive", label: "Archive", icon: Archive, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
  { value: "priority", label: "Priority", icon: Flag, color: "text-red-600 bg-red-500/10 border-red-500/20" },
  { value: "personal", label: "Personal", icon: User, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { value: "business", label: "Business", icon: Building, color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  { value: "important", label: "Important", icon: Star, color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/20" }
];

const getCategoryDetails = (categoryVal?: string) => {
  const val = categoryVal || "works";
  switch (val) {
    case "tasks":
      return { label: "Tasks", colorClass: "text-emerald-500", dotClass: "bg-emerald-500", borderClass: "border-l-emerald-500" };
    case "works":
      return { label: "Works", colorClass: "text-blue-500", dotClass: "bg-blue-500", borderClass: "border-l-blue-500" };
    case "social":
      return { label: "Social", colorClass: "text-pink-500", dotClass: "bg-pink-500", borderClass: "border-l-pink-500" };
    case "archive":
      return { label: "Archive", colorClass: "text-slate-400", dotClass: "bg-slate-400", borderClass: "border-l-slate-400" };
    case "priority":
      return { label: "Priority", colorClass: "text-red-500", dotClass: "bg-red-500", borderClass: "border-l-red-500" };
    case "personal":
      return { label: "Personal", colorClass: "text-amber-500", dotClass: "bg-amber-500", borderClass: "border-l-amber-500" };
    case "business":
      return { label: "Business", colorClass: "text-purple-500", dotClass: "bg-purple-500", borderClass: "border-l-purple-500" };
    default:
      return { label: "Works", colorClass: "text-blue-500", dotClass: "bg-blue-500", borderClass: "border-l-blue-500" };
  }
};

export default function AdminNotes() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Layout / Filter states
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("Admin");
  const [noteDate, setNoteDate] = useState("");
  const [noteType, setNoteType] = useState<"normal" | "popup">("normal");
  const [popupTarget, setPopupTarget] = useState<"none" | "admin" | "client" | "both">("none");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [category, setCategory] = useState("works");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Queries
  const { data: notesData, isLoading } = useQuery<{ data: Note[] }>({
    queryKey: ["admin-notes"],
    queryFn: () => apiFetch<{ data: Note[] }>("/notes"),
    refetchInterval: 5000,
  });

  const notes = notesData?.data ?? [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/notes", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notes"] });
      toast({ title: "Note Created ✅", description: "Your note has been added." });
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => apiFetch(`/notes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notes"] });
      toast({ title: "Note Updated ✅", description: "Your note has been updated successfully." });
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleImportantMutation = useMutation({
    mutationFn: ({ id, isImportant }: { id: string; isImportant: boolean }) => 
      apiFetch(`/notes/${id}`, { method: "PUT", body: JSON.stringify({ isImportant }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notes"] });
      toast({ title: "Priority Updated ⭐" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notes"] });
      toast({ title: "Note Deleted 🗑️", description: "The note has been removed." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setAuthor("Admin");
    setNoteDate("");
    setPopupTarget("none");
    setNoteType("normal");
    setAttachments([]);
    setCategory("works");
    setEditingNoteId(null);
    setIsCreateOpen(false);
    setShowEmojiPicker(false);
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast({ title: "Fields Required", description: "Title and content are required.", variant: "destructive" });
      return;
    }

    const body = {
      title,
      content,
      author,
      date: noteDate ? new Date(noteDate).toISOString() : new Date().toISOString(),
      popupTarget: noteType === "normal" ? "none" : (popupTarget === "none" ? "admin" : popupTarget),
      attachments,
      category,
    };

    if (editingNoteId) {
      updateMutation.mutate({ id: editingNoteId, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const handleEditClick = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setAuthor(note.author);
    
    // Format date to YYYY-MM-DDThh:mm
    if (note.date) {
      const d = new Date(note.date);
      const pad = (n: number) => String(n).padStart(2, "0");
      setNoteDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setNoteDate("");
    }
    
    const target = note.popupTarget || (note.isImportant ? "admin" : "none");
    if (target === "none") {
      setNoteType("normal");
      setPopupTarget("none");
    } else {
      setNoteType("popup");
      setPopupTarget(target as any);
    }
    setAttachments(note.attachments || []);
    setCategory(note.category || "works");
    setEditingNoteId(note._id);
    setIsCreateOpen(true);
  };

  const handleAddNoteClick = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await apiUploadNotes(file);
      setAttachments(prev => [...prev, data.url]);
      toast({ title: "Attachment Uploaded 📎" });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const appendEmoji = (emoji: string) => {
    setContent(prev => prev + " " + emoji);
    setShowEmojiPicker(false);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // Filter notes
  const filteredNotes = notes
    .filter(note => {
      // Category filter
      if (selectedCategory === "all") return true;
      if (selectedCategory === "important") return note.isImportant || (note.popupTarget && note.popupTarget !== "none");
      return note.category === selectedCategory;
    })
    .filter(note => {
      // Search query filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.author.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  // Pagination calculation
  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedNotes = filteredNotes.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-pink-500 to-violet-500" />
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Notes & Attachments</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
            Manage announcements, attachments, and alert notifications
          </p>
        </div>
      </div>

      {/* Main Grid & Sidebar Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar categories panel */}
        <div className="w-full lg:w-60 shrink-0">
          <Card className="p-4 bg-card border border-border/80 rounded-xl space-y-4">
            {/* ADD NOTES button inside sidebar */}
            <Button 
              onClick={handleAddNoteClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm h-11 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> ADD NOTE
            </Button>

            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">
                Categories
              </div>

              {/* Desktop view vertical categories list */}
              <div className="hidden lg:flex flex-col gap-1">
                {sidebarCategories.map((cat) => {
                  const IconComponent = cat.icon;
                  const isActive = selectedCategory === cat.value;
                  const count = cat.value === "all" 
                    ? notes.length 
                    : cat.value === "important" 
                    ? notes.filter(n => n.isImportant || (n.popupTarget && n.popupTarget !== "none")).length
                    : notes.filter(n => n.category === cat.value).length;

                  return (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setSelectedCategory(cat.value);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all w-full ${
                        isActive 
                          ? "bg-slate-100 dark:bg-slate-800 text-foreground" 
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComponent className={`w-4 h-4 ${isActive ? cat.color.split(" ")[0] : "text-muted-foreground/70"}`} />
                        <span>{cat.label}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive 
                          ? "bg-white dark:bg-slate-700 text-foreground border shadow-2xs" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile view horizontal scrolling categories list */}
              <div className="flex lg:hidden overflow-x-auto gap-2 py-1.5 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent snap-x">
                {sidebarCategories.map((cat) => {
                  const IconComponent = cat.icon;
                  const isActive = selectedCategory === cat.value;
                  const count = cat.value === "all" 
                    ? notes.length 
                    : cat.value === "important" 
                    ? notes.filter(n => n.isImportant || (n.popupTarget && n.popupTarget !== "none")).length
                    : notes.filter(n => n.category === cat.value).length;

                  return (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setSelectedCategory(cat.value);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 snap-start border ${
                        isActive 
                          ? "bg-slate-100 dark:bg-slate-800 text-foreground border-slate-200 dark:border-slate-700 shadow-2xs" 
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent"
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 ${isActive ? cat.color.split(" ")[0] : "text-muted-foreground/70"}`} />
                      <span>{cat.label}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded-full text-muted-foreground font-black">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Main content grid area */}
        <div className="flex-1 space-y-4">
          {/* Top Bar for Search, Sort and Pagination */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between md:justify-start gap-3">
              <span className="text-base sm:text-lg font-extrabold capitalize text-foreground font-serif">
                {sidebarCategories.find(c => c.value === selectedCategory)?.label || "Notes"}
              </span>
              <Badge variant="outline" className="text-xs font-bold text-muted-foreground px-2.5 py-0.5 border-border/60">
                {filteredNotes.length} Notes
              </Badge>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9.5 text-sm w-full rounded-lg bg-muted/40 border-border/60 focus-visible:ring-primary"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                {/* Sort selector */}
                <select
                  value={sortOrder}
                  onChange={e => {
                    setSortOrder(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="flex h-9.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground font-semibold cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 border border-border/60 rounded-lg p-0.5 bg-muted/30 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-muted-foreground"
                      disabled={activePage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-bold px-1.5 text-muted-foreground min-w-[32px] text-center">
                      {activePage} / {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-muted-foreground"
                      disabled={activePage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground text-xs bg-card border rounded-xl shadow-xs">Loading notes...</div>
          ) : paginatedNotes.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground text-xs border border-dashed rounded-xl bg-card border-border/80">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20 text-primary animate-pulse" />
              <p className="font-semibold text-muted-foreground">No notes found under this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {paginatedNotes.map((note) => {
                  const catDetails = getCategoryDetails(note.category);
                  return (
                    <motion.div
                      key={note._id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`bg-card border border-border/80 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between h-full border-l-[5px] ${catDetails.borderClass}`}
                    >
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Card Header (Title & Category dot) */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-extrabold text-foreground text-sm sm:text-base leading-snug truncate flex-1 font-serif" title={note.title}>
                              {note.title}
                            </h3>
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${catDetails.dotClass}`} />
                          </div>

                          {/* Note Date */}
                          <p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-1">
                            {new Date(note.date).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })}
                          </p>

                          {/* Content Paragraph */}
                          <p className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed font-sans mt-3 line-clamp-5">
                            {note.content}
                          </p>
                        </div>

                        {/* Attachments preview */}
                        {note.attachments && note.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-border/30">
                            {note.attachments.map((url, idx) => {
                              const filename = url.split('/').pop() || "Attachment";
                              const isImg = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                              return (
                                <a 
                                  key={idx} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 text-[10px] sm:text-xs text-blue-600 hover:underline bg-muted px-2.5 py-1 rounded-md font-medium max-w-full truncate"
                                >
                                  {isImg ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                                  <span className="truncate max-w-[120px]">{filename}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Card Footer (Metadata and bottom button actions) */}
                      <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-foreground/80 truncate">By {note.author}</span>
                          {note.popupTarget && note.popupTarget !== 'none' ? (
                            <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[9px] font-black py-0.5 px-1.5 uppercase shrink-0">
                              Popup
                            </Badge>
                          ) : note.isImportant ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black py-0.5 px-1.5 uppercase shrink-0">
                              Alert
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Star toggle icon */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-amber-500"
                            onClick={() => toggleImportantMutation.mutate({ id: note._id, isImportant: !note.isImportant })}
                            title="Toggle Important"
                          >
                            <Star className={`w-4 h-4 ${note.isImportant ? "fill-amber-500 text-amber-500" : ""}`} />
                          </Button>
                          {/* Edit button */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditClick(note)}
                            title="Edit Note"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {/* Delete button */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-red-500"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this note?")) {
                                deleteMutation.mutate(note._id);
                              }
                            }}
                            title="Delete Note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Note Creation / Editing Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="w-[95vw] sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold">{editingNoteId ? "Edit Note" : "Create New Note"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="note-title" className="text-sm font-semibold">Note Title</Label>
              <Input
                id="note-title"
                placeholder="e.g. Bulk Order Discount, Agreement.pdf"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Note Category Selection */}
            <div className="space-y-1">
              <Label htmlFor="note-category" className="text-sm font-semibold">Note Category</Label>
              <select
                id="note-category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground cursor-pointer"
              >
                <option value="works">Works (Blue)</option>
                <option value="tasks">Tasks (Green)</option>
                <option value="social">Social (Pink)</option>
                <option value="archive">Archive (Gray)</option>
                <option value="priority">Priority (Red)</option>
                <option value="personal">Personal (Amber)</option>
                <option value="business">Business (Purple)</option>
              </select>
            </div>

            {/* Content text */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="note-content" className="text-sm font-semibold">Note Content</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-primary font-bold flex items-center gap-1.5"
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                >
                  <Smile className="w-4 h-4" /> Add Emoji
                </Button>
              </div>

              {/* Emoji Picker Row */}
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-2.5 p-3 bg-muted/40 rounded-lg border border-dashed mb-1.5">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => appendEmoji(e)}
                      className="text-xl hover:scale-125 transition-transform"
                    >
                      {e}
                    </button>
                  ))}
                  <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-xs text-muted-foreground ml-auto hover:underline font-bold">
                    Close
                  </button>
                </div>
              )}

              <Textarea
                id="note-content"
                placeholder="Write note description or alert notice details..."
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                rows={4}
                className="text-sm leading-relaxed"
              />
            </div>

            {/* Note Type Dropdown */}
            <div className="space-y-1">
              <Label htmlFor="note-type" className="text-sm font-semibold text-foreground">Note Type</Label>
              <select
                id="note-type"
                value={noteType}
                onChange={e => {
                  const val = e.target.value as "normal" | "popup";
                  setNoteType(val);
                  if (val === "normal") {
                    setPopupTarget("none");
                  } else {
                    setPopupTarget("admin");
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground cursor-pointer"
              >
                <option value="normal">Normal Note (List View Only)</option>
                <option value="popup">Important Popup Modal Alert</option>
              </select>
            </div>

            {/* Whom to show (Popup target selection) - only visible if noteType is 'popup' */}
            {noteType === "popup" && (
              <div className="space-y-2 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="note-popup-target" className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" /> Whom should see this popup modal alert?
                </Label>
                <select
                  id="note-popup-target"
                  value={popupTarget === "none" ? "admin" : popupTarget}
                  onChange={e => setPopupTarget(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground cursor-pointer"
                >
                  <option value="admin">Admin Dashboard Only</option>
                  <option value="client">Client Dashboard Only</option>
                  <option value="both">Both Admin & Client Dashboards</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="note-author" className="text-sm font-semibold">Author / Team</Label>
                <Input
                  id="note-author"
                  placeholder="e.g. Emily Stone, Admin"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="note-date" className="text-sm font-semibold">Custom Date / Time (Optional)</Label>
                <Input
                  id="note-date"
                  type="datetime-local"
                  value={noteDate}
                  onChange={e => setNoteDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 border border-border p-4 rounded-xl bg-muted/20">
              <Label className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-primary" /> Note Attachments
              </Label>
              
              <div className="flex gap-2 items-center">
                <Input 
                  type="file" 
                  onChange={handleFileUpload} 
                  className="h-10 text-sm flex-1 cursor-pointer bg-card" 
                  disabled={uploading} 
                />
                {uploading && <span className="text-xs text-muted-foreground animate-pulse font-bold">Uploading...</span>}
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1.5 max-h-24 overflow-y-auto">
                  {attachments.map((url, idx) => {
                    const filename = url.split('/').pop() || "Attachment";
                    return (
                      <div key={idx} className="flex items-center gap-1.5 text-xs bg-card border px-2.5 py-1.5 rounded-lg shrink-0 shadow-3xs">
                        <span className="truncate max-w-[120px]" title={filename}>{filename}</span>
                        <button 
                          type="button" 
                          onClick={() => removeAttachment(idx)}
                          className="text-red-500 hover:text-red-700 ml-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploading}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingNoteId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
