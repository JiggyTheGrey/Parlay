import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Swords, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trophy
} from "lucide-react";
import type { MatchWithTeams } from "@shared/schema";

const statusConfig = {
  pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pending" },
  accepted: { icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "Accepted" },
  active: { icon: Swords, color: "text-primary", bg: "bg-primary/10", label: "Active" },
  confirming: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Confirming" },
  disputed: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Disputed" },
  completed: { icon: Trophy, color: "text-green-500", bg: "bg-green-500/10", label: "Completed" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted", label: "Cancelled" },
};

export default function Matches() {
  const [tab, setTab] = useState("all");
  
  const { data: allMatches, isLoading } = useQuery<MatchWithTeams[]>({
    queryKey: ["/api/matches"],
  });

  const filterMatches = (status?: string) => {
    if (!allMatches) return [];
    if (status === "all") return allMatches;
    if (status === "active") {
      return allMatches.filter(m => ["pending", "accepted", "active", "confirming"].includes(m.status));
    }
    return allMatches.filter(m => m.status === status);
  };

  const MatchCard = ({ match }: { match: MatchWithTeams }) => {
    const config = statusConfig[match.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
      <Link href={`/matches/${match.id}`}>
        <Card className="hover-elevate active-elevate-2 cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <Badge variant="secondary" className={`gap-1 ${config.color}`}>
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {match.gameMode} - BO{match.bestOf}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-md bg-primary/10 text-primary font-bold">
                  {match.challengerTeam.tag.slice(0, 2).toUpperCase()}
                </div>
                <p className="mt-2 font-medium truncate">{match.challengerTeam.name}</p>
                <p className="text-sm text-muted-foreground">[{match.challengerTeam.tag}]</p>
              </div>

              <div className="flex flex-col items-center px-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold">
                  VS
                </div>
                <p className="mt-2 font-mono text-lg font-bold text-primary">
                  {parseFloat(match.wagerAmount).toFixed(4)} BTC
                </p>
              </div>

              <div className="flex-1 text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-md bg-primary/10 text-primary font-bold">
                  {match.challengedTeam.tag.slice(0, 2).toUpperCase()}
                </div>
                <p className="mt-2 font-medium truncate">{match.challengedTeam.name}</p>
                <p className="text-sm text-muted-foreground">[{match.challengedTeam.tag}]</p>
              </div>
            </div>

            {match.status === "completed" && match.winner && (
              <div className="mt-4 pt-4 border-t text-center">
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <Trophy className="h-4 w-4" />
                  <span className="font-medium">{match.winner.name} wins!</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  };

  const LoadingSkeleton = () => (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-20 w-24" />
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-20 w-24" />
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Swords className="mb-4 h-16 w-16 text-muted-foreground/50" />
      <h3 className="mb-2 text-lg font-semibold">No matches found</h3>
      <p className="mb-4 max-w-sm text-muted-foreground">
        {tab === "all" 
          ? "No matches have been created yet. Be the first to challenge a team!"
          : "No matches with this status."}
      </p>
      <Link href="/matches/create">
        <Button data-testid="button-create-match-empty">
          <Plus className="mr-1 h-4 w-4" />
          Create Match
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
          <p className="text-muted-foreground">
            View and manage match challenges
          </p>
        </div>
        <Link href="/matches/create">
          <Button className="gap-2" data-testid="button-create-match">
            <Plus className="h-4 w-4" />
            Create Match
          </Button>
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">Active</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
          <TabsTrigger value="disputed" data-testid="tab-disputed">Disputed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => <LoadingSkeleton key={i} />)}
            </div>
          ) : filterMatches(tab).length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filterMatches(tab).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptyState />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
