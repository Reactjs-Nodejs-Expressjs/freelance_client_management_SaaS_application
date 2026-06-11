import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiUploadProfile, apiUploadLogo } from "@/lib/api";
import { useAuthUser } from "@/hooks/useAuth";
import { Shield, Lock, Bell, Building2, CreditCard, Camera, Loader2, User, Upload, ImageIcon, X, Type } from "lucide-react";
import defaultLogo from "@/assets/logo.jpg";

export default function Settings() {
  const { data: user } = useAuthUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [logoText, setLogoText] = useState("");

  // Initialize form fields from user data
  useState(() => {
    if (user) {
      setName(user.name || "");
      setCompany(user.company || "");
      setPhone(user.phone || "");
      setAddress((user as any).address || "");
      setExpiryHours((user as any).rejectedPaymentsExpiryHours !== undefined ? (user as any).rejectedPaymentsExpiryHours : 24);
      setLogoText((user as any).logoText || "Strategic Brand");
    }
  });

  const updateProfile = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-user"] });
      toast({ title: "Settings Updated ✅", description: "Your settings have been saved." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const changePw = useMutation({
    mutationFn: (body: unknown) => apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: "Password Changed", description: "Your password has been updated." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    changePw.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { url } = await apiUploadProfile(file);
      updateProfile.mutate({ photoUrl: url });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ name, company, phone, address });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setLogoUploading(true);
    try {
      const { url } = await apiUploadLogo(file);
      updateProfile.mutate({ logoUrl: url });
    } catch (err: any) {
      toast({ title: "Logo upload failed", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ logoText });
  };

  const handleRemoveLogo = () => {
    updateProfile.mutate({ logoUrl: "" });
  };

  const photoUrl = user?.photoUrl;
  const currentLogoUrl = (user as any)?.logoUrl;
  const currentLogoText = (user as any)?.logoText || "Strategic Brand";

  return (
    <div className="max-w-2xl space-y-5 sm:space-y-6">
      <h1 className="text-2xl font-serif font-bold text-foreground">Admin Profile & Settings</h1>

      {/* Brand Logo & Text */}
      <Card className="border-t-4 border-t-violet-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ImageIcon className="w-5 h-5 text-violet-500" /> Brand Logo & Text
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Live Preview */}
          <div className="rounded-xl bg-sidebar p-4 border border-sidebar-accent/30">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-3 font-semibold">Sidebar Preview</p>
            <div className="flex items-center gap-3">
              <img
                src={currentLogoUrl ? (currentLogoUrl.startsWith("http") ? currentLogoUrl : `${(window as any).BACKEND_URL}${currentLogoUrl}`) : defaultLogo}
                alt="Logo"
                className="w-9 h-9 rounded-full border-2 border-primary shrink-0 object-cover"
              />
              <div className="min-w-0">
                <span className="font-serif font-bold text-sidebar-foreground text-sm leading-tight block">{logoText || currentLogoText}</span>
                <span className="text-[10px] text-sidebar-foreground/50 block">Admin Dashboard</span>
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Logo Image
            </Label>
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={currentLogoUrl ? (currentLogoUrl.startsWith("http") ? currentLogoUrl : `${(window as any).BACKEND_URL}${currentLogoUrl}`) : defaultLogo}
                  alt="Current Logo"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20 shadow-md"
                />
                <button
                  onClick={() => logoFileRef.current?.click()}
                  disabled={logoUploading}
                  className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {logoUploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
                <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={logoUploading}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {logoUploading ? "Uploading..." : "Upload New Logo"}
                </Button>
                {currentLogoUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={handleRemoveLogo}
                  >
                    <X className="w-3 h-3 mr-1" /> Remove Logo
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Recommended: Square image, at least 128×128px. JPG or PNG, max 5MB.</p>
          </div>

          {/* Logo Text */}
          <form onSubmit={handleSaveBranding} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" /> Sidebar Brand Name
              </Label>
              <Input
                value={logoText || currentLogoText}
                onChange={e => setLogoText(e.target.value)}
                placeholder="e.g. Strategic Brand"
                maxLength={30}
              />
              <p className="text-[11px] text-muted-foreground">This text appears next to the logo in both Admin & Client sidebars.</p>
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="w-full sm:w-auto">
              {updateProfile.isPending ? "Saving..." : "Save Branding"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Agency Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Building2 className="w-5 h-5 text-primary" /> Agency Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={name || user?.name || ""}
                  onChange={e => setName(e.target.value)}
                  placeholder="Admin Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input defaultValue={user?.email ?? ""} readOnly className="bg-muted/40" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input
                  value={company || user?.company || ""}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Company Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={phone || user?.phone || ""}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Phone Number"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Agency Address (e.g. Mumbai, Maharashtra, India)"
              />
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="w-full sm:w-auto">
              {updateProfile.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="w-5 h-5 text-primary" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePw} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" disabled={changePw.isPending} className="w-full sm:w-auto">
              {changePw.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payment Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="w-5 h-5 text-primary" /> Payment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Double Verification</span>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 border">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Currencies Supported</span>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">₹ INR</Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">$ USD</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">QR Payment Requests</span>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 border">Active</Badge>
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate({ rejectedPaymentsExpiryHours: expiryHours }); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rejected-expiry">Auto-Hide Rejected Payments for Client</Label>
              <select
                id="rejected-expiry"
                value={expiryHours}
                onChange={e => setExpiryHours(parseInt(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="-1">Keep Forever</option>
                <option value="1">1 Hour</option>
                <option value="12">12 Hours</option>
                <option value="24">1 Day</option>
                <option value="72">3 Days</option>
                <option value="168">7 Days</option>
                <option value="720">30 Days</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Time after which rejected payment requests will be hidden from the client's dashboard and payment log history.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>UPI ID / Bank Account</Label>
              <Input defaultValue="akhilthadaka1@ybl" readOnly className="bg-muted/40" />
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="w-full sm:w-auto">
              {updateProfile.isPending ? "Saving..." : "Save Payment Config"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="w-5 h-5 text-primary" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">JWT Auth Tokens</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Session Duration</span>
              <span className="font-medium">7 days</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Admin Role</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 border">Admin</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
