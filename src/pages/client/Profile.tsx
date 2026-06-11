import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiUpload } from "@/lib/api";
import { useAuthUser } from "@/hooks/useAuth";
import { User, Camera, Lock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Client {
  id: string; name: string; email: string; phone: string | null;
  company: string | null; photoUrl: string | null;
}

export default function ClientProfile() {
  const { data: user } = useAuthUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const { data: client } = useQuery<Client>({
    queryKey: ["client-profile", user?.id],
    queryFn: () => apiFetch<any>(`/clients/${user!.id}`).then(res => res.client),
    enabled: !!user?.id,
  });

  const updatePhoto = useMutation({
    mutationFn: (photoUrl: string) =>
      apiFetch(`/clients/${user?.id}`, { method: "PATCH", body: JSON.stringify({ photoUrl }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-profile"] });
      qc.invalidateQueries({ queryKey: ["auth-user"] });
      toast({ title: "Profile photo updated!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateProfile = useMutation({
    mutationFn: (body: { name: string; phone: string; company: string }) =>
      apiFetch(`/clients/${user?.id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-profile"] });
      qc.invalidateQueries({ queryKey: ["auth-user"] });
      toast({ title: "Profile details updated successfully!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const changePassword = useMutation({
    mutationFn: (body: unknown) =>
      apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
      toast({ title: "Password changed successfully!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await apiUpload(file);
      await updatePhoto.mutateAsync(url);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateProfile.mutate({
      name: fd.get("name") as string,
      phone: fd.get("phone") as string,
      company: fd.get("company") as string,
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (newPass.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return;
    }
    changePassword.mutate({ currentPassword: currentPass, newPassword: newPass });
  };

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "C";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your profile photo, details, and password.</p>
      </div>

      {/* Profile Photo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Profile Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            {client?.photoUrl ? (
              <img src={client.photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-primary/20" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold border-4 border-primary/20">
                {initials}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-lg font-semibold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {client?.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
            {client?.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
            <p className="text-xs text-muted-foreground mt-2">Click the camera icon to update your photo.</p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Details Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  name="name"
                  key={user?.name || ""}
                  defaultValue={user?.name || ""}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email (Username)</Label>
                <Input
                  name="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  name="company"
                  key={client?.company || ""}
                  defaultValue={client?.company || ""}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone / Cell Number</Label>
                <Input
                  name="phone"
                  key={client?.phone || ""}
                  defaultValue={client?.phone || ""}
                  placeholder="Enter cell number"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending} className="bg-primary text-primary-foreground">
                {updateProfile.isPending ? "Saving..." : "Save Details"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Repeat new password"
                required
              />
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={changePassword.isPending} className="bg-primary text-primary-foreground">
                {changePassword.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
