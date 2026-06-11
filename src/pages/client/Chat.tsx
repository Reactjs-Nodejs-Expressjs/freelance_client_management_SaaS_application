import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, apiUploadChat } from "@/lib/api";
import { useAuthUser } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Edit2, Check, X, MessageSquare, Loader2, Image, Trash2, SmilePlus, Ban, FileText } from "lucide-react";

interface Msg {
  id: string;
  sender: { _id: string; name: string; role: string };
  recipient: string | null;
  text: string;
  imageUrl: string | null;
  isRead: boolean;
  edited: boolean;
  createdAt: string;
}

export default function ClientChat() {
  const { data: user } = useAuthUser();
  const { socket, isConnected, onlineUsers, sendTyping } = useSocket(user?.id);

  // Fetch admin branding (logo + text)
  const { data: brandingData } = useQuery<{ logoUrl: string; logoText: string }>({
    queryKey: ["admin-branding"],
    queryFn: () => apiFetch<{ logoUrl: string; logoText: string }>("/auth/branding"),
    staleTime: 30000,
  });

  const brandInitials = (brandingData?.logoText || "Strategic Brand Solutions")
    .split(/\s+/)
    .map(w => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "SBS";

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
  const qc = useQueryClient();
  const { toast } = useToast();

  const [text, setText] = useState("");
  const [editingMsg, setEditingMsg] = useState<{ id: string; text: string } | null>(null);
  const [typingAdmin, setTypingAdmin] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [editableIds, setEditableIds] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);

  const QUICK_EMOJIS = ["😀","😂","❤️","👍","🎉","🔥","✨","💯","🚀","👏","😎","🤝","💪","⭐","📌","✅","❌","⚠️","💬","📎"];

  // Chat disabled status
  const { data: clientStatusData } = useQuery<{ isLiveWorking: boolean; chatDisabled: boolean }>({
    queryKey: ["client-chat-status"],
    queryFn: () => apiFetch<{ isLiveWorking: boolean; chatDisabled: boolean }>("/chat/client-status"),
    refetchInterval: 5000,
  });
  const isChatDisabled = clientStatusData?.chatDisabled ?? false;

  // Get admin id from messages (first admin sender)
  const [adminId, setAdminId] = useState<string | null>(null);

  // Query for chat history with admin (use "admin" as placeholder)
  const { data: historyData, refetch: refetchHistory } = useQuery<{ data: Msg[] }>({
    queryKey: ["client-chat-history"],
    queryFn: () => apiFetch("/chat/history/admin"),
    refetchInterval: 3000,
    enabled: !!user?.id,
  });

  const messages = historyData?.data ?? [];

  // Discover admin ID from messages
  useEffect(() => {
    const adminMsg = messages.find((m) => m.sender.role === "admin");
    if (adminMsg && !adminId) setAdminId(adminMsg.sender._id);
  }, [messages, adminId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: Msg) => {
      qc.invalidateQueries({ queryKey: ["client-chat-history"] });
      qc.invalidateQueries({ queryKey: ["client-messages"] });
    };

    const onEdited = () => qc.invalidateQueries({ queryKey: ["client-chat-history"] });
    const onDeleted = () => qc.invalidateQueries({ queryKey: ["client-chat-history"] });

    const onTyping = ({ senderId, isTyping }: { senderId: string; isTyping: boolean }) => {
      setTypingAdmin(isTyping);
      setTimeout(() => setTypingAdmin(false), 3000);
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
  }, [socket, qc]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track 5-second edit window for sent messages
  useEffect(() => {
    messages.forEach((m) => {
      if (m.sender._id === user?.id && !editTimersRef.current.has(m.id)) {
        const age = Date.now() - new Date(m.createdAt).getTime();
        const remaining = 600000 - age; // 10 minutes
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
    mutationFn: (body: { recipientId: string | null; text: string; imageUrl?: string }) =>
      apiFetch("/chat/send", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["client-chat-history"] });
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      apiFetch(`/chat/edit/${id}`, { method: "POST", body: JSON.stringify({ text }) }),
    onSuccess: () => {
      setEditingMsg(null);
      qc.invalidateQueries({ queryKey: ["client-chat-history"] });
    },
    onError: (e: Error) => toast({ title: "Edit failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/chat/delete/${id}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-chat-history"] });
      qc.invalidateQueries({ queryKey: ["client-messages"] });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMutation.mutate({ recipientId: null, text }); // admin determined server-side
  };

  const handleTyping = useCallback((val: string) => {
    setText(val);
    if (adminId) {
      sendTyping(adminId, true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => sendTyping(adminId, false), 2000);
    }
  }, [adminId, sendTyping]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Upload failed", description: "File size exceeds 3MB limit.", variant: "destructive" });
      return;
    }

    setUploadingImg(true);
    try {
      const { url } = await apiUploadChat(file);
      sendMutation.mutate({ recipientId: null, text: "", imageUrl: url });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingImg(false);
    }
  };

  const isAdminOnline = adminId ? onlineUsers.includes(adminId) : false;

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col overflow-hidden rounded-xl border border-border shadow-lg bg-card">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0 bg-card">
        <div className="relative shrink-0">
          {brandingData?.logoUrl ? (
            <img
              src={brandingData.logoUrl.startsWith('http') ? brandingData.logoUrl : `http://localhost:5000${brandingData.logoUrl}`}
              alt={brandingData.logoText || "Strategic Brand Solutions"}
              className="w-10 h-10 rounded-full border border-border shrink-0 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
              {brandInitials}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
            isAdminOnline ? "bg-emerald-500" : "bg-gray-400"
          }`} />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{brandingData?.logoText || "Strategic Brand Solutions"}</p>
          <p className="text-xs text-muted-foreground">
            {isAdminOnline ? (
              <span className="text-emerald-500 font-medium">● Online</span>
            ) : "● Admin"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] px-2 ${isConnected ? "border-emerald-500 text-emerald-500" : "border-gray-400 text-gray-400"}`}>
            {isConnected ? "● Connected" : "○ Connecting..."}
          </Badge>
        </div>
      </div>

      {/* Info banner */}
      <div className="px-4 py-2 bg-primary/5 border-b border-border/50 text-xs text-muted-foreground flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
        You can send text messages and images (up to 3MB). You can edit your message within 10 minutes of sending.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Send a message to start your conversation with us.</p>
            </div>
          </div>
        )}

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
                {/* Avatar */}
                {!isOwnMessage && (
                  brandingData?.logoUrl ? (
                    <img
                      src={brandingData.logoUrl.startsWith('http') ? brandingData.logoUrl : `http://localhost:5000${brandingData.logoUrl}`}
                      alt={brandingData.logoText || "Strategic Brand Solutions"}
                      className="w-7 h-7 rounded-full object-cover border border-border shrink-0 mb-4"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mb-4">
                      {brandInitials}
                    </div>
                  )
                )}

                <div className={`max-w-[75%] ${isOwnMessage ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    isOwnMessage
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : msg.recipient === null
                      ? "bg-indigo-500/10 text-indigo-700 border border-indigo-300/30 rounded-bl-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {msg.recipient === null && !isOwnMessage && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block mb-1">📢 Broadcast</span>
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
                          <img
                            src={msg.imageUrl.startsWith('http') ? msg.imageUrl : `http://localhost:5000${msg.imageUrl}`}
                            alt="Shared"
                            className="rounded-lg max-w-[200px] max-h-[180px] object-cover mb-2 cursor-pointer"
                            onClick={() => window.open(msg.imageUrl!.startsWith('http') ? msg.imageUrl! : `http://localhost:5000${msg.imageUrl}`, "_blank")}
                          />
                        )}
                        {msg.text && renderMessageText(msg.text, isOwnMessage)}
                        {msg.edited && <span className="text-[9px] opacity-60 block mt-0.5">(edited)</span>}
                      </>
                    )}
                  </div>

                  {/* Timestamp + edit button */}
                  <div className={`flex items-center gap-1.5 px-1 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isOwnMessage && <span className="text-[9px] text-muted-foreground">{msg.isRead ? "✓✓" : "✓"}</span>}
                    {isOwnMessage && canEdit && !isEditing && (
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditingMsg({ id: msg.id, text: msg.text })}
                        title="Edit (within 10 minutes)"
                      >
                        <Edit2 className="w-3 h-3 text-primary" />
                      </button>
                    )}
                    {isOwnMessage && !isEditing && (
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this message?")) {
                            deleteMutation.mutate(msg.id);
                          }
                        }}
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {isOwnMessage && canEdit && (
                      <span className="text-[9px] text-orange-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        ⏱ Edit
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          );
        })}

        {/* Typing indicator */}
        {typingAdmin && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-9">
            <div className="bg-muted rounded-full px-3 py-2 flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <span className="text-[10px]">{brandingData?.logoText || "Strategic Brand Solutions"} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && !isChatDisabled && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex flex-wrap gap-1.5">
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
      {isChatDisabled ? (
        <div className="px-4 py-4 border-t border-border flex items-center justify-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20">
          <Ban className="w-4 h-4" />
          <span className="font-medium">Chat has been disabled by admin. Please contact support.</span>
        </div>
      ) : (
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-border flex items-center gap-2 shrink-0">
          <label className="cursor-pointer p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg || sendMutation.isPending} />
            {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Image className="w-4 h-4" />}
          </label>
          <Input
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
            }}
          />
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={`p-2 rounded-lg transition-all shrink-0 ${showEmoji ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            title="Emoji"
          >
            <SmilePlus className="w-4 h-4" />
          </button>
          <Button
            type="submit"
            size="sm"
            className="bg-primary text-primary-foreground h-9 px-3"
            disabled={sendMutation.isPending || uploadingImg || !text.trim()}
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      )}
    </div>
  );
}
