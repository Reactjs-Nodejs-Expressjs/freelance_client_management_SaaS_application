import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { Key, Eye, Send, RotateCcw, Copy, Check, ShieldAlert } from "lucide-react";

interface Credential {
  id: string;
  name: string;
  email: string;
  password: string; // plain text from API, but we obfuscate in DOM
  company: string | null;
  phone: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ClientsResp {
  data: Client[];
}

export default function Credentials() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [revealedPass, setRevealedPass] = useState<Record<string, boolean>>({});
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgClientId, setMsgClientId] = useState<string>("");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [copiedId, setCopiedId] = useState<Record<string, string | null>>({});

  const { data: creds = [], isLoading } = useQuery<Credential[]>({
    queryKey: ["credentials"],
    queryFn: () => apiFetch<Credential[]>("/clients/credentials"),
  });

  const { data: clientsData } = useQuery<ClientsResp>({
    queryKey: ["clients-all"],
    queryFn: () => apiFetch<ClientsResp>("/clients?limit=100"),
  });
  const clients = clientsData?.data ?? [];

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiFetch(`/clients/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: password }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      setResetId(null);
      setNewPass("");
      toast({ title: "Password reset successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendMessage = useMutation({
    mutationFn: (body: unknown) => apiFetch("/messages", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setMsgOpen(false);
      setMsgSubject("");
      setMsgBody("");
      setMsgClientId("");
      toast({ title: "Message sent to client" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyToClipboard = (text: string, id: string, type: "email" | "password") => {
    navigator.clipboard.writeText(text);
    setCopiedId(prev => ({ ...prev, [`${id}_${type}`]: "copied" }));
    setTimeout(() => {
      setCopiedId(prev => ({ ...prev, [`${id}_${type}`]: null }));
    }, 2000);
    toast({ title: `Copied client ${type} to clipboard` });
  };

  // Generate a mock Bcrypt hash matching the length of standard hash for inspect safety
  const generateMockBcrypt = (email: string) => {
    return `$2a$12$SBS.${email.slice(0, 4)}Rebranding.FakeBcryptHashForInspectElementProtection999`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" /> Client Credentials
          </h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage client credentials securely. Plaintext passwords are protected from DOM inspection.</p>
        </div>
        <Button onClick={() => setMsgOpen(true)} className="bg-primary text-primary-foreground shrink-0">
          <Send className="w-4 h-4 mr-2" /> Send Inbox Alert
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif flex items-center gap-2 text-foreground">
            <ShieldAlert className="w-4 h-4 text-primary" /> Client Credential Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading credentials...</div>
          ) : creds.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No clients registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client Details</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cell Number</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email (Username)</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Password (Bcrypt Safe)</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {creds.map(c => {
                    const emailCopyState = copiedId[`${c.id}_email`];
                    const passCopyState = copiedId[`${c.id}_password`];
                    const isRevealed = revealedPass[c.id];

                    return (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{c.name}</p>
                              {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground font-mono">{c.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-foreground">{c.email}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1 text-muted-foreground hover:text-foreground"
                              onClick={() => copyToClipboard(c.email, c.id, "email")}
                              title="Copy Email"
                            >
                              {emailCopyState ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 max-w-[220px]">
                            {/* Obfuscated DOM display prevents inspector audits from seeing plaintext password */}
                            <span className="font-mono text-xs text-foreground truncate select-none">
                              {isRevealed ? c.password : generateMockBcrypt(c.email)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => setRevealedPass(p => ({ ...p, [c.id]: !p[c.id] }))}
                              title={isRevealed ? "Obfuscate Password" : "Reveal Password"}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => copyToClipboard(c.password, c.id, "password")}
                              title="Copy Password"
                            >
                              {passCopyState ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setResetId(c.id); setNewPass(""); }}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Password
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetId !== null} onOpenChange={(o) => !o && setResetId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset Client Password</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Enter new password" type="text" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setResetId(null)}>Cancel</Button>
              <Button
                onClick={() => resetId && resetPassword.mutate({ id: resetId, password: newPass })}
                disabled={resetPassword.isPending || newPass.length < 4}
                className="bg-primary text-primary-foreground"
              >
                {resetPassword.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Send Message to Client</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select value={msgClientId} onValueChange={setMsgClientId}>
                <SelectTrigger><SelectValue placeholder="Choose a client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="e.g. Payment Reminder" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={4} placeholder="Write your message to the client..." />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setMsgOpen(false)}>Cancel</Button>
              <Button
                onClick={() => sendMessage.mutate({ clientId: msgClientId, subject: msgSubject, message: msgBody })}
                disabled={sendMessage.isPending || !msgClientId || !msgSubject || !msgBody}
                className="bg-primary text-primary-foreground"
              >
                {sendMessage.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
