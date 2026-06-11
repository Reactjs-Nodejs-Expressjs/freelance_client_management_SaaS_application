import { useState } from "react";
import { useLogin } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "admin">("client");
  const login = useLogin();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password, role }, {
      onSuccess: (data) => {
        if (data.user.role === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/client";
        }
      },
      onError: (err: Error) => {
        toast({ title: "Login failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleQuickFill = (targetEmail: string, targetPass: string, targetRole: "client" | "admin") => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setRole(targetRole);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="SBS Logo" className="w-16 h-16 rounded-full border-2 border-primary object-cover shadow-sm mb-4" />
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">Strategic Brand Solutions</h1>
          <p className="text-muted-foreground text-sm mt-2">Sign in to your dashboard</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardContent className="p-6 sm:p-8">
            {/* Role Selector Tabs */}
            <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl mb-6 border border-border/40">
              <button
                type="button"
                onClick={() => setRole("client")}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === "client"
                    ? "bg-background text-primary shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Client Portal
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === "admin"
                    ? "bg-background text-primary shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Admin Console
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  placeholder={role === "admin" ? "admin@example.com" : "client@example.com"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 border-border/80 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 border-border/80 focus-visible:ring-primary"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer"
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in..." : `Sign In as ${role === "admin" ? "Admin" : "Client"}`}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/40 rounded-lg border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Click to quick-fill credentials</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => handleQuickFill("akhilthadaka97@gmail.com", "Akhil@7777", "admin")}
                  className="flex w-full text-left gap-2 p-1 hover:bg-muted rounded transition-colors group cursor-pointer focus:outline-none"
                >
                  <span className="font-semibold text-primary w-12 shrink-0 group-hover:underline">Admin:</span>
                  <span className="font-mono">akhilthadaka97@gmail.com / Akhil@7777</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("arjun@techflow.in", "client123", "client")}
                  className="flex w-full text-left gap-2 p-1 hover:bg-muted rounded transition-colors group cursor-pointer focus:outline-none"
                >
                  <span className="font-semibold text-secondary w-12 shrink-0 group-hover:underline">Client:</span>
                  <span className="font-mono">arjun@techflow.in / client123</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
