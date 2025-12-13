import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Trophy, 
  Swords, 
  Clock,
  CheckCircle,
  XCircle,
  History as HistoryIcon
} from "lucide-react";
import type { MatchWithTeams } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function History() {
  const { user } = useAuth();
  
  const { data: completedMatches, isLoading } = useQuery<MatchWithTeams[]>({
    queryKey: ["/api/matches/history"],
  });

  const { data: myTeams } = useQuery<{ id: string }[]>({
    queryKey: ["/api/teams/my"],
  });

  const myTeamIds = myTeams?.map(t => t.id) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Match History</h1>
          <p className="text-muted-foreground">Your completed matches</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Match History</h1>
        <p className="text-muted-foreground">
          View your completed matches and results
        </p>
      </div>

      {completedMatches && completedMatches.length > 0 ? (
        <div className="space-y-4">
          {completedMatches.map((match) => {
            const isChallenger = myTeamIds.includes(match.challengerTeamId);
            const isChallenged = myTeamIds.includes(match.challengedTeamId);
            const myTeamId = isChallenger ? match.challengerTeamId : match.challengedTeamId;
            const isWinner = match.winnerId === myTeamId;
            const myTeam = isChallenger ? match.challengerTeam : match.challengedTeam;
            const opponent = isChallenger ? match.challengedTeam : match.challengerTeam;

            return (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <Card className="hover-elevate active-elevate-2 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                        match.status === "completed" 
                          ? isWinner 
                            ? "bg-green-500/10 text-green-500" 
                            : "bg-red-500/10 text-red-500"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {match.status === "completed" ? (
                          isWinner ? <Trophy className="h-7 w-7" /> : <XCircle className="h-7 w-7" />
                        ) : match.status === "cancelled" ? (
                          <XCircle className="h-7 w-7" />
                        ) : (
                          <Clock className="h-7 w-7" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">
                            {myTeam.name} vs {opponent.name}
                          </h3>
                          <Badge 
                            variant={match.status === "completed" ? (isWinner ? "default" : "secondary") : "outline"}
                            className={match.status === "completed" && isWinner ? "bg-green-500" : ""}
                          >
                            {match.status === "completed" ? (isWinner ? "Victory" : "Defeat") : match.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{match.gameMode} - BO{match.bestOf}</span>
                          <span>
                            {match.completedAt 
                              ? new Date(match.completedAt).toLocaleDateString() 
                              : new Date(match.createdAt!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-mono text-lg font-bold ${
                          match.status === "completed" 
                            ? isWinner ? "text-green-500" : "text-red-500"
                            : "text-muted-foreground"
                        }`}>
                          {match.status === "completed" && (isWinner ? "+" : "-")}
                          {parseFloat(match.wagerAmount).toFixed(4)} BTC
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total pot: {(parseFloat(match.wagerAmount) * 2).toFixed(4)} BTC
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <HistoryIcon className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
            <h2 className="mb-2 text-xl font-semibold">No match history</h2>
            <p className="text-muted-foreground">
              Complete some matches to see them here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
