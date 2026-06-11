import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import { getToken, clearToken } from "@/lib/api";
import { useAuthUser } from "@/hooks/useAuth";

import AdminLayout from "./components/layout/AdminLayout";
import ClientLayout from "./components/layout/ClientLayout";

import AdminDashboard from "./pages/admin/Dashboard";
import Clients from "./pages/admin/Clients";
import ClientDetail from "./pages/admin/ClientDetail";
import Projects from "./pages/admin/Projects";
import ProjectDetail from "./pages/admin/ProjectDetail";
import NewUpdate from "./pages/admin/NewUpdate";
import Payments from "./pages/admin/Payments";
import Invoices from "./pages/admin/Invoices";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import Credentials from "./pages/admin/Credentials";
import AdminChat from "./pages/admin/Chat";
import AdminSchedule from "./pages/admin/Schedule";
import AdminNotes from "./pages/admin/Notes";

import ClientDashboard from "./pages/client/Dashboard";
import ClientProjectDetail from "./pages/client/ProjectDetail";
import ClientPayments from "./pages/client/Payments";
import ClientProfile from "./pages/client/Profile";
import ClientChat from "./pages/client/Chat";
import FeedbackForm from "./pages/client/FeedbackForm";
import AdminFeedback from "./pages/admin/Feedback";
import Home from "./pages/Home";
import Showcase from "./pages/Showcase";
import SBLogo from "@/components/SBLogo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-6">
      <div className="relative flex items-center justify-center">
        {/* Spinning border */}
        <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        {/* Logo in center */}
        <SBLogo size={60} rounded="2xl" className="absolute animate-pulse" />
      </div>
      <div className="flex flex-col items-center space-y-1 text-center">
        <span className="font-serif font-bold text-lg text-foreground tracking-wide">Strategic Brand Solutions</span>
        <span className="text-xs text-muted-foreground animate-pulse">Initializing secure session...</span>
      </div>
    </div>
  );
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useAuthUser();

  useEffect(() => {
    if (!isLoading) {
      if (!getToken() || isError || !user) {
        clearToken();
        window.location.href = "/login";
      } else if (user.role !== "admin") {
        window.location.href = "/client";
      }
    }
  }, [user, isLoading, isError]);

  if (isLoading) return <LoadingScreen />;
  if (!getToken() || isError || !user || user.role !== "admin") return null;
  return <>{children}</>;
}

function ProtectedClient({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useAuthUser();

  useEffect(() => {
    if (!isLoading) {
      if (!getToken() || isError || !user) {
        clearToken();
        window.location.href = "/login";
      } else if (user.role !== "client") {
        window.location.href = "/";
      }
    }
  }, [user, isLoading, isError]);

  if (isLoading) return <LoadingScreen />;
  if (!getToken() || isError || !user || user.role !== "client") return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/showcase" component={Showcase} />
      <Route path="/login" component={Login} />
      <Route path="/feedback" component={FeedbackForm} />

      {/* Client routes — must come before "/" catch-all */}
      <Route path="/client">
        <ProtectedClient>
          <ClientLayout>
            <ClientDashboard />
          </ClientLayout>
        </ProtectedClient>
      </Route>
      <Route path="/client/project">
        <ProtectedClient>
          <ClientLayout>
            <ClientProjectDetail />
          </ClientLayout>
        </ProtectedClient>
      </Route>
      <Route path="/client/payments">
        <ProtectedClient>
          <ClientLayout>
            <ClientPayments />
          </ClientLayout>
        </ProtectedClient>
      </Route>
      <Route path="/client/chat">
        <ProtectedClient>
          <ClientLayout>
            <ClientChat />
          </ClientLayout>
        </ProtectedClient>
      </Route>
      <Route path="/client/profile">
        <ProtectedClient>
          <ClientLayout>
            <ClientProfile />
          </ClientLayout>
        </ProtectedClient>
      </Route>

      {/* Admin routes */}
      <Route path="/admin" nest>
        <ProtectedAdmin>
          <AdminLayout>
            <Switch>
              <Route path="/" component={AdminDashboard} />
              <Route path="/clients" component={Clients} />
              <Route path="/clients/:id" component={ClientDetail} />
              <Route path="/projects" component={Projects} />
              <Route path="/projects/:id" component={ProjectDetail} />
              <Route path="/projects/:id/updates/new" component={NewUpdate} />
              <Route path="/payments" component={Payments} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/reports" component={Reports} />
              <Route path="/schedule" component={AdminSchedule} />
              <Route path="/notes" component={AdminNotes} />
              <Route path="/credentials" component={Credentials} />
              <Route path="/chat" component={AdminChat} />
              <Route path="/feedback" component={AdminFeedback} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </AdminLayout>
        </ProtectedAdmin>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
