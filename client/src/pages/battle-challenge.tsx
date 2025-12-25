import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Swords, 
  Users, 
  Trophy,
  ArrowRight,
  Loader2,
  Gamepad2,
  Target,
  XCircle,
  CheckCircle
} from "lucide-react";
import type { MatchWithTeams } from "@shared/schema";
import { SUPPORTED_GAMES } from "@shared/schema";

export default function BattleChallenge() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: match, isLoading } = useQuery<MatchWithTeams>({
    queryKey: ["/api/battles", token],
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${match?.id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/battles", token] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Challenge accepted!",
        description: "The battle has been scheduled. Good luck!",
      });
      navigate(`/matches/${match?.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${match?.id}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/battles", token] });
      toast({
        title: "Challenge declined",
        description: "The battle has been cancelled.",
      });
      navigate("/matches");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to decline challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <XCircle className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h2 className="mb-2 text-xl font-semibold">Battle Not Found</h2>
        <p className="mb-4 text-muted-foreground">
          This battle link is invalid or has expired.
        </p>
        <Link href="/matches">
          <Button>Browse Battles</Button>
        </Link>
      </div>
    );
  }

  const gameInfo = SUPPORTED_GAMES.find(g => g.id === match.game);
  const isChallengedTeamMember = user && match.challengedTeam.ownerId === user.id;
  const isChallengerTeamMember = user && match.challengerTeam.ownerId === user.id;
  const canRespond = isChallengedTeamMember && match.status === "pending";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <Badge variant="secondary" className="mb-4">
          Battle Challenge
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          You've Been Challenged!
        </h1>
        <p className="text-muted-foreground">
          {match.challengerTeam.name} wants to battle for crypto
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="text-center flex-1">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg">{match.challengerTeam.name}</h3>
              <Badge variant="secondary">[{match.challengerTeam.tag}]</Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {match.challengerTeam.wins}W - {match.challengerTeam.losses}L
              </p>
            </div>

            <div className="flex flex-col items-center">
              <Swords className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">VS</span>
            </div>

            <div className="text-center flex-1">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="font-bold text-lg">{match.challengedTeam.name}</h3>
              <Badge variant="secondary">[{match.challengedTeam.tag}]</Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {match.challengedTeam.wins}W - {match.challengedTeam.losses}L
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 border-y">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Gamepad2 className="h-4 w-4" />
                <span className="text-xs">Game</span>
              </div>
              <p className="font-semibold text-sm">{gameInfo?.name || match.game}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Format</span>
              </div>
              <p className="font-semibold text-sm">Best of {match.bestOf}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Trophy className="h-4 w-4" />
                <span className="text-xs">Mode</span>
              </div>
              <p className="font-semibold text-sm capitalize">{match.gameMode}</p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-md bg-primary/5 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">Wager Amount</p>
            <p className="text-3xl font-bold font-mono text-primary">
              {parseFloat(match.wagerAmount).toFixed(4)} BTC
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Winner takes all
            </p>
          </div>

          {match.message && (
            <div className="mt-4 p-3 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground">Message from challenger:</p>
              <p className="text-sm mt-1 italic">"{match.message}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {match.status === "pending" && (
        <>
          {!user ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Sign in to accept or decline this challenge
                </p>
                <Button asChild>
                  <a href="/api/login">Sign In to Respond</a>
                </Button>
              </CardContent>
            </Card>
          ) : canRespond ? (
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => declineMutation.mutate()}
                disabled={declineMutation.isPending || acceptMutation.isPending}
              >
                {declineMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Decline
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending || declineMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Accept Challenge
              </Button>
            </div>
          ) : isChallengerTeamMember ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  You created this challenge. Waiting for {match.challengedTeam.name} to respond.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  Only the captain of {match.challengedTeam.name} can respond to this challenge.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {match.status !== "pending" && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Badge className="mb-2" variant={match.status === "completed" ? "default" : "secondary"}>
              {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
            </Badge>
            <p className="text-muted-foreground mb-4">
              This battle is {match.status === "completed" ? "complete" : "already in progress"}.
            </p>
            <Link href={`/matches/${match.id}`}>
              <Button variant="outline" className="gap-2">
                View Battle Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
