import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Teams from "@/pages/teams";
import TeamCreate from "@/pages/team-create";
import TeamDetail from "@/pages/team-detail";
import Matches from "@/pages/matches";
import MatchCreate from "@/pages/match-create";
import MatchDetail from "@/pages/match-detail";
import Wallet from "@/pages/wallet";
import History from "@/pages/history";
import Admin from "@/pages/admin";
import BattleChallenge from "@/pages/battle-challenge";
import Campaign from "@/pages/campaign";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/battle/:token" component={BattleChallenge} />
        <Route path="/campaigns/:id" component={Campaign} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard">{() => <AuthenticatedLayout><Dashboard /></AuthenticatedLayout>}</Route>
      <Route path="/teams">{() => <AuthenticatedLayout><Teams /></AuthenticatedLayout>}</Route>
      <Route path="/teams/create">{() => <AuthenticatedLayout><TeamCreate /></AuthenticatedLayout>}</Route>
      <Route path="/teams/:id">{(params) => <AuthenticatedLayout><TeamDetail /></AuthenticatedLayout>}</Route>
      <Route path="/matches">{() => <AuthenticatedLayout><Matches /></AuthenticatedLayout>}</Route>
      <Route path="/matches/create">{() => <AuthenticatedLayout><MatchCreate /></AuthenticatedLayout>}</Route>
      <Route path="/matches/:id">{(params) => <AuthenticatedLayout><MatchDetail /></AuthenticatedLayout>}</Route>
      <Route path="/wallet">{() => <AuthenticatedLayout><Wallet /></AuthenticatedLayout>}</Route>
      <Route path="/history">{() => <AuthenticatedLayout><History /></AuthenticatedLayout>}</Route>
      <Route path="/campaigns/:id" component={Campaign} />
      <Route path="/admin">{() => <AuthenticatedLayout><Admin /></AuthenticatedLayout>}</Route>
      <Route path="/battle/:token" component={BattleChallenge} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="parlay-it-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
