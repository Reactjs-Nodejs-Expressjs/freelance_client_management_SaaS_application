import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, apiUploadChat } from "@/lib/api";
import { useAuthUser } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send, Image, Trash2, Edit2, Check, X, Radio,
  Users, Search, MessageSquare, Download, Loader2, Wifi, WifiOff,
  Eraser, Power, Activity, SmilePlus, Ban, FileText
} from "lucide-react";


interface ChatClient {
  id: string; name: string; email: string; company: string; phone: string;
  photoUrl?: string | null;
  isLiveWorking?: boolean;
  chatDisabled?: boolean;
  lastMessage: { text: string; imageUrl: string | null; createdAt: string } | null;
  unreadCount: number;
}
interface Msg {
  id: string;
  sender: { _id: string; name: string; role: string };
  recipient: string | null;
  text: string;
  imageUrl: string | null;
  isRead: boolean;
  edited: boolean;
  isDeleted?: boolean;
  createdAt: string;
  canEdit?: boolean;
}

export default function AdminChat() {
  const { data: user } = useAuthUser();
  const { socket, isConnected, onlineUsers, sendTyping } = useSocket(user?.id);
  const qc = useQueryClient();
  const { toast } = useToast();

  const renderMessageText = (messageText: string, isOwnMessage: boolean) => {
    if (!messageText) return null;
    const match = messageText.match(/(https?:\/\/[^\s]+invoice-[a-f0-9]+\.html)/i);
    if (match) {
      const url = match[1];
      const textWithoutUrl = messageText.replace(url, "").trim();
      return (
        <div className="space-y-2">
          {textWithoutUrl && <p className="leading-relaxed break-words">{textWithoutUrl}</p>}
          <div className="pt-1">
            <Button
              onClick={() => window.open(url, "_blank")}
              className={`flex items-center gap-2 font-bold px-3 py-1.5 text-xs rounded-xl shadow-md transition-all ${
                isOwnMessage 
                  ? "bg-white text-primary hover:bg-slate-50 shadow-white/10" 
                  : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              View Invoice 📄
            </Button>
          </div>
        </div>
      );
    }
    return <p className="leading-relaxed break-words">{messageText}</p>;
  };

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [editingMsg, setEditingMsg] = useState<{ id: string; text: string } | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [editableIds, setEditableIds] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);

  const QUICK_EMOJIS = ["😀","😂","❤️","👍","🎉","🔥","✨","💯","🚀","👏","😎","🤝","💪","⭐","📌","✅","❌","⚠️","💬","📎"];

  // Queries
  const { data: clientsData } = useQuery<{ data: ChatClient[] }>({
    queryKey: ["chat-clients"],
    queryFn: () => apiFetch("/chat/clients"),
    refetchInterval: 5000,
  });

  const { data: historyData, refetch: refetchHistory } = useQuery<{ data: Msg[] }>({
    queryKey: ["chat-history", selectedClientId],
    queryFn: () => apiFetch(`/chat/history/${selectedClientId}`),
    enabled: !!selectedClientId,
    refetchInterval: 3000,
  });

  const clients = clientsData?.data ?? [];
  const messages = historyData?.data ?? [];

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: Msg) => {
      qc.invalidateQueries({ queryKey: ["chat-clients"] });
      if (msg.sender._id === selectedClientId || msg.recipient === selectedClientId) {
        qc.invalidateQueries({ queryKey: ["chat-history", selectedClientId] });
      }
    };

    const onEdited = (msg: Msg) => {
      qc.invalidateQueries({ queryKey: ["chat-history", selectedClientId] });
    };

    const onDeleted = ({ messageId }: { messageId: string }) => {
      qc.invalidateQueries({ queryKey: ["chat-history", selectedClientId] });
    };

    const onTyping = ({ senderId, isTyping }: { senderId: string; isTyping: boolean }) => {
      setTypingUser(isTyping ? senderId : null);
      setTimeout(() => setTypingUser(null), 3000);
    };

    socket.on("new_message", onNewMessage);
    socket.on("message_edited", onEdited);
    socket.on("message_deleted", onDeleted);
    socket.on("typing", onTyping);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("message_edited", onEdited);
      socket.off("message_deleted", onDeleted);
      socket.off("typing", onTyping);
    };
  }, [socket, selectedClientId, qc]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track 5-second edit window for sent messages
  useEffect(() => {
    messages.forEach((m) => {
      if (m.sender._id === user?.id && !editTimersRef.current.has(m.id)) {
        const age = Date.now() - new Date(m.createdAt).getTime();
        const remaining = 5000 - age;
        if (remaining > 0) {
          setEditableIds((prev) => new Set([...prev, m.id]));
          const timer = setTimeout(() => {
            setEditableIds((prev) => {
              const next = new Set(prev);
              next.delete(m.id);
              return next;
            });
            editTimersRef.current.delete(m.id);
          }, remaining);
          editTimersRef.current.set(m.id, timer);
        }
      }
    });
  }, [messages, user?.id]);

  // Mutations
  const sendMutation = useMutation({
    mutationFn: (body: { recipientId: string | string[] | null; text?: string; imageUrl?: string }) =>
      apiFetch("/chat/send", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat-history", selectedClientId] });
      qc.invalidateQueries({ queryKey: ["chat-clients"] });
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      apiFetch(`/chat/edit/${id}`, { method: "POST", body: JSON.stringify({ text }) }),
    onSuccess: () => {
      setEditingMsg(null);
      qc.invalidateQueries({ queryKey: ["chat-history", selectedClientId] });
    },
    onError: (e: Error) => toast({ title: "Edit failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/chat/delete/${id}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-history", selectedClientId] }),
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const clearChatMutation = useMutation({
    mutationFn: (clientId: string) => apiFetch(`/chat/clear/${clientId}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-history", selectedClientId] });
      qc.invalidateQueries({ queryKey: ["chat-clients"] });
      toast({ title: "Chat cleared ✅" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const toggleLiveMutation = useMutation({
    mutationFn: (clientId: string) => apiFetch(`/chat/toggle-live/${clientId}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-clients"] });
      toast({ title: "Live status toggled" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const toggleChatMutation = useMutation({
    mutationFn: (clientId: string) => apiFetch(`/chat/toggle-chat/${clientId}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-clients"] });
      toast({ title: "Chat access toggled" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !uploadingImg) return;

    if (broadcastMode) {
      sendMutation.mutate({ recipientId: null, text });
      setBroadcastMode(false);
    } else if (selectedClients.length > 1) {
      sendMutation.mutate({ recipientId: selectedClients, text });
      setSelectedClients([]);
    } else if (selectedClientId) {
      sendMutation.mutate({ recipientId: selectedClientId, text });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClientId) return;
    setUploadingImg(true);
    try {
      const { url } = await apiUploadChat(file);
      sendMutation.mutate({ recipientId: selectedClientId, text: "", imageUrl: url });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingImg(false);
    }
  };

  const handleTyping = useCallback((val: string) => {
    setText(val);
    if (selectedClientId) {
      sendTyping(selectedClientId, true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => sendTyping(selectedClientId, false), 2000);
    }
  }, [selectedClientId, sendTyping]);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const isOnline = (clientId: string) => onlineUsers.includes(clientId);

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-0 overflow-hidden rounded-xl border border-border shadow-lg bg-card bg-gradient-to-br from-card to-background">
      {/* Sidebar: Client List */}
      <div className="w-72 shrink-0 flex flex-col border-r border-border bg-sidebar/50">
        <div className="p-4 border-b border-border space-y-3 bg-sidebar/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-white text-base flex items-center gap-2">
              <MessageSquare className="w-4.5 h-4.5 text-primary" /> Chat Channels
            </h2>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={broadcastMode ? "default" : "outline"}
                className={`h-7 text-[10px] px-2.5 font-medium rounded-full transition-all ${
                  broadcastMode ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border-transparent" : "border-sidebar-accent/50 text-slate-200 hover:text-white hover:bg-sidebar-accent/30"
                }`}
                onClick={() => { setBroadcastMode(!broadcastMode); setSelectedClients([]); }}
                title="Broadcast to all clients"
              >
                <Radio className="w-3 h-3 mr-1" />
                Broadcast
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <Input
              className="pl-8 h-8 text-xs bg-sidebar-accent/20 border-sidebar-accent/30 text-white placeholder:text-slate-400 focus-visible:ring-primary"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {selectedClients.length > 0 && (
            <div className="bg-primary/10 rounded-lg p-2 text-xs flex items-center justify-between animate-fade-in">
              <span className="text-primary font-medium">{selectedClients.length} selected</span>
              <Button size="sm" variant="ghost" className="h-5 text-[10px] p-1 hover:bg-transparent hover:underline text-white" onClick={() => setSelectedClients([])}>
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/20">
          {filteredClients.map((client) => {
            const active = selectedClientId === client.id;
            return (
              <div
                key={client.id}
                className={`p-3.5 cursor-pointer transition-all relative flex flex-col gap-1 border-l-4 ${
                  active 
                    ? "bg-sidebar-accent/50 border-l-indigo-500" 
                    : "border-l-transparent hover:bg-sidebar-accent/20"
                }`}
                onClick={() => {
                  if (broadcastMode) return;
                  if (selectedClients.length > 0) {
                    setSelectedClients((prev) =>
                      prev.includes(client.id) ? prev.filter((id) => id !== client.id) : [...prev, client.id]
                    );
                  } else {
                    setSelectedClientId(client.id);
                    refetchHistory();
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {client.photoUrl ? (
                      <img
                        src={client.photoUrl.startsWith('http') ? client.photoUrl : `http://localhost:5000${client.photoUrl}`}
                        alt={client.name}
                        className="w-9 h-9 rounded-full object-cover border border-sidebar-accent/50 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar ${
                      isOnline(client.id) ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-slate-500"
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold truncate ${active ? "text-white" : "text-slate-200"}`}>{client.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {client.isLiveWorking && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center" title="Working">
                            <Activity className="w-2.5 h-2.5 text-emerald-400" />
                          </span>
                        )}
                        {client.chatDisabled && (
                          <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center" title="Chat Disabled">
                            <Ban className="w-2.5 h-2.5 text-red-400" />
                          </span>
                        )}
                        {client.unreadCount > 0 && (
                          <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {client.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-[10px] truncate mt-0.5 font-normal ${active ? "text-slate-200" : "text-slate-400"}`}>
                      {client.lastMessage?.text || "No messages yet"}
                    </p>
                  </div>
                  {selectedClients.includes(client.id) && (
                    <div className="absolute top-3 right-3 w-4.5 h-4.5 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-xs">No clients found</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-zinc-950">
        {/* Chat Header */}
        {broadcastMode ? (
          <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-indigo-500/5 to-purple-500/5 flex items-center gap-3 shrink-0">
            <div className="w-9.5 h-9.5 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-200/30">
              <Radio className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Broadcast Message</p>
              <p className="text-xs text-muted-foreground">Sending announcements to all {clients.length} clients</p>
            </div>
          </div>
        ) : selectedClient ? (
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm">
            <div className="relative shrink-0">
              {selectedClient.photoUrl ? (
                <img
                  src={selectedClient.photoUrl.startsWith('http') ? selectedClient.photoUrl : `http://localhost:5000${selectedClient.photoUrl}`}
                  alt={selectedClient.name}
                  className="w-9.5 h-9.5 rounded-full object-cover border border-slate-200 dark:border-zinc-800 shrink-0"
                />
              ) : (
                <div className="w-9.5 h-9.5 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-100 dark:border-indigo-900/30">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                isOnline(selectedClient.id) ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-slate-300 dark:bg-zinc-600"
              }`} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">{selectedClient.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                {isOnline(selectedClient.id) ? (
                  <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" /> Online</span>
                ) : <span className="text-muted-foreground">Offline</span>}{" "}
                · <span className="opacity-80">{selectedClient.email}</span>
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {selectedClients.length === 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-[10px] px-2 ${selectedClient.isLiveWorking ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10" : "border-slate-200 dark:border-zinc-800"}`}
                    onClick={() => toggleLiveMutation.mutate(selectedClient.id)}
                    title={selectedClient.isLiveWorking ? "Click to stop working" : "Click to start working"}
                  >
                    <Activity className={`w-3 h-3 mr-1 ${selectedClient.isLiveWorking ? "text-emerald-500" : ""}`} />
                    {selectedClient.isLiveWorking ? "Working" : "Start Work"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-[10px] px-2 ${selectedClient.chatDisabled ? "border-red-500/50 text-red-500 bg-red-500/10" : "border-slate-200 dark:border-zinc-800"}`}
                    onClick={() => toggleChatMutation.mutate(selectedClient.id)}
                    title={selectedClient.chatDisabled ? "Chat is disabled — click to enable" : "Click to disable client chat"}
                  >
                    <Ban className={`w-3 h-3 mr-1 ${selectedClient.chatDisabled ? "text-red-500" : ""}`} />
                    {selectedClient.chatDisabled ? "Blocked" : "Block Chat"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] px-2 border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-500/10"
                    onClick={() => {
                      if (confirm(`Clear all chat with ${selectedClient.name}? This cannot be undone.`)) {
                        clearChatMutation.mutate(selectedClient.id);
                      }
                    }}
                    title="Clear all chat history"
                  >
                    <Eraser className="w-3 h-3 mr-1" /> Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-850"
                    onClick={() => setSelectedClients([selectedClientId!])}
                  >
                    <Users className="w-3.5 h-3.5 mr-1" /> Multi
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-slate-50/50 dark:bg-zinc-950/20">
            <div className="text-center p-6 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mx-auto mb-4 border border-indigo-100/40 dark:border-indigo-900/20 shadow-sm">
                <MessageSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Select a client to start chatting</p>
              <p className="text-xs text-muted-foreground">Connect with your clients in real-time, view their online status, and send messages or project files.</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {(selectedClientId || broadcastMode) && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/50 dark:bg-zinc-950">
              {messages.map((msg) => {
                const isOwnMessage = msg.sender._id === user?.id;
                const canEdit = editableIds.has(msg.id);
                const isEditing = editingMsg?.id === msg.id;

                return (
                  <AnimatePresence key={msg.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-end gap-2 group ${isOwnMessage ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        {/* Name label */}
                        <span className="text-[10px] text-muted-foreground/80 px-1.5 font-medium tracking-wide">
                          {isOwnMessage ? "You" : msg.sender.name}
                        </span>

                        {/* Bubble */}
                        <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm relative leading-relaxed transition-all ${
                          isOwnMessage
                            ? "bg-gradient-to-br from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500 text-white rounded-tr-none"
                            : "bg-white text-slate-800 dark:bg-zinc-900 dark:text-zinc-100 rounded-tl-none border border-slate-100 dark:border-zinc-800/40"
                        }`}>
                          {msg.isDeleted && (
                            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mb-1.5 inline-block">
                              🗑️ Deleted by client
                            </span>
                          )}
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingMsg.text}
                                onChange={(e) => setEditingMsg({ ...editingMsg, text: e.target.value })}
                                className="h-7 text-xs bg-background/20 border-white/30 text-inherit"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") editMutation.mutate({ id: editingMsg.id, text: editingMsg.text });
                                  if (e.key === "Escape") setEditingMsg(null);
                                }}
                              />
                              <button onClick={() => editMutation.mutate({ id: editingMsg.id, text: editingMsg.text })}>
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingMsg(null)}>
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              {msg.imageUrl && (
                                <div className="mb-2 relative group/img">
                                  <img
                                    src={msg.imageUrl}
                                    alt="Shared"
                                    className="rounded-lg max-w-[200px] max-h-[180px] object-cover cursor-pointer hover:brightness-95 transition-all"
                                    onClick={() => window.open(msg.imageUrl!, "_blank")}
                                  />
                                  <a
                                    href={msg.imageUrl}
                                    download
                                    className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-black/60 text-white rounded p-1 transition-opacity"
                                  >
                                    <Download className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                              {msg.text && renderMessageText(msg.text, isOwnMessage)}
                              {msg.edited && (
                                <span className="text-[9px] opacity-60 block mt-0.5">(edited)</span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Timestamp + Actions */}
                        <div className={`flex items-center gap-1.5 px-1 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                          <span className="text-[9px] text-muted-foreground font-light">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isOwnMessage && (
                            <span className="text-[9px] text-muted-foreground">
                              {msg.isRead ? "✓✓" : "✓"}
                            </span>
                          )}
                          {isOwnMessage && canEdit && !isEditing && (
                            <button
                              className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditingMsg({ id: msg.id, text: msg.text })}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {isOwnMessage && (
                            <button
                              className="text-[9px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteMutation.mutate(msg.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                );
              })}

              {/* Typing indicator */}
              {typingUser && typingUser !== user?.id && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span>typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Emoji picker */}
            {showEmoji && (
              <div className="px-4 py-2 border-t border-border bg-white/60 dark:bg-zinc-900/40 flex flex-wrap gap-1.5">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="text-lg hover:scale-125 transition-transform p-0.5"
                    onClick={() => { setText((prev) => prev + e); setShowEmoji(false); }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <form onSubmit={handleSend} className="px-4 py-3.5 border-t border-border flex items-center gap-2 shrink-0 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-sm">
              {/* Image upload (Admin only) */}
              {!broadcastMode && selectedClientId && (
                <label className="cursor-pointer p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-all shrink-0 border border-slate-100 dark:border-zinc-800">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
                  {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Image className="w-4 h-4 text-indigo-500" />}
                </label>
              )}
              <Input
                value={text}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder={broadcastMode ? "Type broadcast message to all clients..." : "Type a message..."}
                className="flex-1 h-10 text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus-visible:ring-indigo-500 rounded-xl shadow-inner-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
                }}
              />
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                className={`p-2.5 rounded-xl transition-all shrink-0 border ${showEmoji ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600" : "border-slate-100 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800"}`}
                title="Emoji"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 h-10 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0"
                disabled={sendMutation.isPending || (!text.trim())}
              >
                {sendMutation.isPending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
