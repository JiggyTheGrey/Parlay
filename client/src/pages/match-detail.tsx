import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Trophy, 
  Swords, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Check,
  X,
  Copy,
  Share2
} from "lucide-react";
import { useState } from "react";
import type { MatchWithTeams, Team, Match } from "@shared/schema";
import { SUPPORTED_GAMES } from "@shared/schema";

function getGameName(gameId: string): string {
  const game = SUPPORTED_GAMES.find(g => g.id === gameId);
  return game?.name || gameId;
}

const statusConfig = {
  pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pending Acceptance" },
  accepted: { icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "Accepted - Ready to Play" },
  active: { icon: Swords, color: "text-primary", bg: "bg-primary/10", label: "Match in Progress" },
  confirming: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Awaiting Confirmation" },
  disputed: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Disputed - Admin Review" },
  completed: { icon: Trophy, color: "text-green-500", bg: "bg-green-500/10", label: "Completed" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted", label: "Cancelled" },
};

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWinner, setSelectedWinner] = useState<string>("");

  const [copied, setCopied] = useState(false);

  const { data: match, isLoading } = useQuery<MatchWithTeams>({
    queryKey: ["/api/matches", id],
  });

  const { data: myTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams/my"],
  });

  const copyShareLink = () => {
    const matchData = match as (Match & { shareToken?: string });
    if (matchData?.shareToken) {
      navigator.clipboard.writeText(`${window.location.origin}/battle/${matchData.shareToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Share link copied!",
        description: "Send this link to the opponent captain to accept the challenge.",
      });
    }
  };

  const acceptMatchMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", id] });
      toast({ title: "Match accepted!", description: "The match is now active." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const declineMatchMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${id}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", id] });
      toast({ title: "Match declined", description: "The challenge has been declined." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const startMatchMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", id] });
      toast({ title: "Match started!", description: "Play the game and report results." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const confirmWinnerMutation = useMutation({
    mutationFn: async (winnerId: string) => {
      return await apiRequest("POST", `/api/matches/${id}/confirm`, { winnerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", id] });
      toast({ title: "Confirmation submitted", description: "Waiting for opponent confirmation." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Swords className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h2 className="mb-2 text-xl font-semibold">Match not found</h2>
        <p className="mb-4 text-muted-foreground">This match doesn't exist.</p>
        <Link href="/matches">
          <Button>Browse Matches</Button>
        </Link>
      </div>
    );
  }

  const config = statusConfig[match.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  const isChallengerTeamMember = myTeams?.some(t => t.id === match.challengerTeamId);
  const isChallengedTeamMember = myTeams?.some(t => t.id === match.challengedTeamId);
  const isParticipant = isChallengerTeamMember || isChallengedTeamMember;
  const userTeamId = isChallengerTeamMember ? match.challengerTeamId : match.challengedTeamId;
  
  const hasConfirmed = isChallengerTeamMember 
    ? !!match.challengerConfirmedWinner 
    : !!match.challengedConfirmedWinner;

  const bothConfirmed = match.challengerConfirmedWinner && match.challengedConfirmedWinner;
  const confirmationsMatch = match.challengerConfirmedWinner === match.challengedConfirmedWinner;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/matches">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Match Details</h1>
          <p className="text-muted-foreground">
            {match.challengerTeam.name} vs {match.challengedTeam.name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {match.status === "pending" && (match as Match & { shareToken?: string }).shareToken && (
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={copyShareLink}
              data-testid="button-copy-share-link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              Share Link
            </Button>
          )}
          <Badge variant="secondary" className={`gap-1 text-sm ${config.color}`}>
            <StatusIcon className="h-4 w-4" />
            {config.label}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-between gap-8">
            <div className="flex-1 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-md bg-primary/10 text-primary text-3xl font-bold">
                {match.challengerTeam.tag.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="mt-4 text-xl font-bold">{match.challengerTeam.name}</h3>
              <p className="text-muted-foreground">[{match.challengerTeam.tag}]</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {match.challengerTeam.wins}W - {match.challengerTeam.losses}L
              </p>
              {match.status === "completed" && match.winnerId === match.challengerTeamId && (
                <Badge className="mt-2 bg-green-500">Winner</Badge>
              )}
              {(match.status === "confirming" || match.status === "disputed") && (
                <div className="mt-2">
                  {match.challengerConfirmedWinner ? (
                    <Badge variant="outline" className="gap-1">
                      <Check className="h-3 w-3" />
                      Confirmed: {match.challengerConfirmedWinner === match.challengerTeamId ? "Self" : "Opponent"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Awaiting confirmation</Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold">
                VS
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-primary">
                  {(match.wagerCredits || 0).toLocaleString()} credits
                </p>
                <p className="text-sm text-muted-foreground">Total Pot: {((match.wagerCredits || 0) * 2).toLocaleString()} credits</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground justify-center">
                <Badge variant="secondary">{getGameName((match as any).game || "bloodstrike")}</Badge>
                <Badge variant="secondary">{match.gameMode}</Badge>
                <Badge variant="secondary">BO{match.bestOf}</Badge>
              </div>
            </div>

            <div className="flex-1 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-md bg-primary/10 text-primary text-3xl font-bold">
                {match.challengedTeam.tag.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="mt-4 text-xl font-bold">{match.challengedTeam.name}</h3>
              <p className="text-muted-foreground">[{match.challengedTeam.tag}]</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {match.challengedTeam.wins}W - {match.challengedTeam.losses}L
              </p>
              {match.status === "completed" && match.winnerId === match.challengedTeamId && (
                <Badge className="mt-2 bg-green-500">Winner</Badge>
              )}
              {(match.status === "confirming" || match.status === "disputed") && (
                <div className="mt-2">
                  {match.challengedConfirmedWinner ? (
                    <Badge variant="outline" className="gap-1">
                      <Check className="h-3 w-3" />
                      Confirmed: {match.challengedConfirmedWinner === match.challengedTeamId ? "Self" : "Opponent"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Awaiting confirmation</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isParticipant && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              {match.status === "pending" && isChallengedTeamMember && "Accept or decline this challenge"}
              {match.status === "accepted" && "Ready to start the match?"}
              {match.status === "active" && "Report match results"}
              {match.status === "confirming" && !hasConfirmed && "Confirm the winner"}
              {match.status === "confirming" && hasConfirmed && "Waiting for opponent confirmation"}
              {match.status === "disputed" && "Match is under admin review"}
              {match.status === "completed" && "Match completed!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {match.status === "pending" && isChallengedTeamMember && (
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => declineMatchMutation.mutate()}
                  disabled={declineMatchMutation.isPending}
                  data-testid="button-decline"
                >
                  {declineMatchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Decline
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={() => acceptMatchMutation.mutate()}
                  disabled={acceptMatchMutation.isPending}
                  data-testid="button-accept"
                >
                  {acceptMatchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Accept Challenge
                </Button>
              </div>
            )}

            {match.status === "pending" && isChallengerTeamMember && (
              <div className="rounded-md bg-muted p-4 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Waiting for opponent</p>
                <p className="text-sm text-muted-foreground">
                  {match.challengedTeam.name} needs to accept your challenge
                </p>
              </div>
            )}

            {match.status === "accepted" && (
              <Button 
                className="w-full gap-2"
                onClick={() => startMatchMutation.mutate()}
                disabled={startMatchMutation.isPending}
                data-testid="button-start"
              >
                {startMatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Swords className="h-4 w-4" />
                )}
                Start Match
              </Button>
            )}

            {match.status === "active" && (
              <Button 
                className="w-full gap-2"
                onClick={() => confirmWinnerMutation.mutate(userTeamId!)}
                disabled={confirmWinnerMutation.isPending}
                data-testid="button-end-match"
              >
                {confirmWinnerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                Report Match Results
              </Button>
            )}

            {match.status === "confirming" && !hasConfirmed && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select the winning team:</p>
                <RadioGroup value={selectedWinner} onValueChange={setSelectedWinner}>
                  <div className="flex items-center space-x-2 rounded-md border p-4">
                    <RadioGroupItem value={match.challengerTeamId} id="team1" />
                    <Label htmlFor="team1" className="flex-1 cursor-pointer">
                      {match.challengerTeam.name} [{match.challengerTeam.tag}]
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border p-4">
                    <RadioGroupItem value={match.challengedTeamId} id="team2" />
                    <Label htmlFor="team2" className="flex-1 cursor-pointer">
                      {match.challengedTeam.name} [{match.challengedTeam.tag}]
                    </Label>
                  </div>
                </RadioGroup>
                <Button 
                  className="w-full gap-2"
                  onClick={() => confirmWinnerMutation.mutate(selectedWinner)}
                  disabled={!selectedWinner || confirmWinnerMutation.isPending}
                  data-testid="button-confirm-winner"
                >
                  {confirmWinnerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirm Winner
                </Button>
              </div>
            )}

            {match.status === "confirming" && hasConfirmed && (
              <div className="rounded-md bg-muted p-4 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Confirmation submitted</p>
                <p className="text-sm text-muted-foreground">
                  Waiting for the other team to confirm the result
                </p>
              </div>
            )}

            {match.status === "disputed" && (
              <div className="rounded-md bg-destructive/10 p-4 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
                <p className="font-medium text-destructive">Match Disputed</p>
                <p className="text-sm text-muted-foreground">
                  Teams reported different winners. An admin will review and resolve.
                </p>
              </div>
            )}

            {match.status === "completed" && (
              <div className="rounded-md bg-green-500/10 p-4 text-center">
                <Trophy className="mx-auto mb-2 h-8 w-8 text-green-500" />
                <p className="font-medium text-green-500">Match Complete!</p>
                <p className="text-sm text-muted-foreground">
                  Winner: {match.winner?.name} | Payout: {((match.wagerCredits || 0) * 2).toLocaleString()} credits
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {match.message && (
        <Card>
          <CardHeader>
            <CardTitle>Challenge Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{match.message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
