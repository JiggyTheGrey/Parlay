import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Users, 
  Swords, 
  Wallet, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Clock,
  Trophy,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Team, MatchWithTeams, Transaction } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams/my"],
  });

  const { data: pendingMatches, isLoading: matchesLoading } = useQuery<MatchWithTeams[]>({
    queryKey: ["/api/matches/pending"],
  });

  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: stats } = useQuery<{
    totalWins: number;
    totalLosses: number;
    totalEarnings: string;
    activeMatches: number;
  }>({
    queryKey: ["/api/stats/user"],
  });

  const winRate = stats?.totalWins && stats?.totalLosses 
    ? ((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || "Player"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/teams/create">
            <Button variant="outline" className="gap-2" data-testid="button-create-team">
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          </Link>
          <Link href="/matches/create">
            <Button className="gap-2" data-testid="button-new-match">
              <Swords className="h-4 w-4" />
              New Match
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-balance">
              {parseFloat(user?.balance || "0").toFixed(4)} BTC
            </div>
            <p className="text-xs text-muted-foreground">
              Custodial wallet balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-winrate">
              {winRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalWins || 0}W - {stats?.totalLosses || 0}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Matches
            </CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-matches">
              {stats?.activeMatches || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Matches in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wagered
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-total-wagered">
              {parseFloat(stats?.totalEarnings || "0").toFixed(4)} BTC
            </div>
            <p className="text-xs text-muted-foreground">
              Total earnings from wins
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>My Teams</CardTitle>
              <CardDescription>Teams you're a member of</CardDescription>
            </div>
            <Link href="/teams">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : teams && teams.length > 0 ? (
              <div className="space-y-3">
                {teams.slice(0, 3).map((team) => (
                  <Link key={team.id} href={`/teams/${team.id}`}>
                    <div className="flex items-center gap-4 rounded-md p-3 hover-elevate active-elevate-2 cursor-pointer border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-bold">
                        {team.tag.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-muted-foreground">
                          [{team.tag}] • {team.wins}W - {team.losses}L
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium">
                          {parseFloat(team.balance).toFixed(4)} BTC
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="mb-2 font-medium">No teams yet</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create or join a team to start competing
                </p>
                <Link href="/teams/create">
                  <Button size="sm" data-testid="button-create-first-team">
                    <Plus className="mr-1 h-4 w-4" />
                    Create Team
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Pending Actions</CardTitle>
              <CardDescription>Matches requiring your attention</CardDescription>
            </div>
            <Link href="/matches">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {matchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingMatches && pendingMatches.length > 0 ? (
              <div className="space-y-3">
                {pendingMatches.slice(0, 3).map((match) => (
                  <Link key={match.id} href={`/matches/${match.id}`}>
                    <div className="flex items-center gap-4 rounded-md p-3 hover-elevate active-elevate-2 cursor-pointer border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {match.status === "pending" ? (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        ) : match.status === "confirming" ? (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        ) : (
                          <Swords className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {match.challengerTeam.name} vs {match.challengedTeam.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {match.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {match.gameMode}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium text-primary">
                          {parseFloat(match.wagerAmount).toFixed(4)} BTC
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Swords className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="mb-2 font-medium">No pending matches</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Challenge a team or wait for incoming challenges
                </p>
                <Link href="/matches/create">
                  <Button size="sm" data-testid="button-create-first-match">
                    <Plus className="mr-1 h-4 w-4" />
                    Create Match
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest wallet activity</CardDescription>
          </div>
          <Link href="/wallet">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-md p-3 border"
                  data-testid={`transaction-${tx.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      tx.type.includes("win") || tx.type === "deposit" 
                        ? "bg-green-500/10 text-green-500" 
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {tx.type.includes("win") || tx.type === "deposit" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingUp className="h-4 w-4 rotate-180" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {tx.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description || tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-medium ${
                      tx.type.includes("win") || tx.type === "deposit"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}>
                      {tx.type.includes("win") || tx.type === "deposit" ? "+" : "-"}
                      {parseFloat(tx.amount).toFixed(4)} BTC
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wallet className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-2 font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Deposit funds or complete matches to see activity
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
