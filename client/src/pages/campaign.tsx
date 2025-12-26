import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Calendar, Coins, Users, Swords, ArrowLeft, Crown, Target } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Campaign, Team, CampaignParticipant, User } from "@shared/schema";

interface CampaignWithDetails extends Campaign {
  participants: (CampaignParticipant & { team: Team })[];
}

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [challengeOpponent, setChallengeOpponent] = useState<string>("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: campaign, isLoading } = useQuery<CampaignWithDetails>({
    queryKey: ["/api/campaigns", id],
  });

  const { data: myTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user,
  });

  const myOwnedTeams = myTeams?.filter(t => t.ownerId === user?.id) || [];

  const joinCampaignMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return apiRequest("POST", `/api/campaigns/${id}/join`, { teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", id] });
      toast({
        title: "Joined Campaign",
        description: "Your team has joined the campaign successfully!",
      });
      setJoinDialogOpen(false);
      setSelectedTeam("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Join",
        description: error.message || "Could not join the campaign",
        variant: "destructive",
      });
    },
  });

  const challengeMutation = useMutation({
    mutationFn: async ({ challengerTeamId, challengedTeamId }: { challengerTeamId: string; challengedTeamId: string }) => {
      return apiRequest("POST", `/api/campaigns/${id}/challenge`, {
        challengerTeamId,
        challengedTeamId,
        game: "bloodstrike",
        gameMode: "standard",
        bestOf: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Challenge Sent",
        description: "Your challenge has been sent to the opponent!",
      });
      setChallengeDialogOpen(false);
      setSelectedTeam("");
      setChallengeOpponent("");
    },
    onError: (error: any) => {
      toast({
        title: "Challenge Failed",
        description: error.message || "Could not create challenge",
        variant: "destructive",
      });
    },
  });

  const myParticipatingTeams = campaign?.participants
    .filter(p => myOwnedTeams.some(t => t.id === p.teamId))
    .map(p => p.team) || [];

  const canJoin = myOwnedTeams.some(team => 
    !campaign?.participants.some(p => p.teamId === team.id)
  );

  const teamsNotInCampaign = myOwnedTeams.filter(team =>
    !campaign?.participants.some(p => p.teamId === team.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Campaign not found</p>
        <Button variant="outline" onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/dashboard")} 
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"} className="mb-2">
                      {campaign.status === "active" ? "Active" : campaign.status}
                    </Badge>
                    <CardTitle className="text-2xl">{campaign.name}</CardTitle>
                    {campaign.description && (
                      <CardDescription className="mt-2">{campaign.description}</CardDescription>
                    )}
                  </div>
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Total Prize Pool</span>
                    <span className="text-xl font-bold">{campaign.prizePoolCredits.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Remaining Pool</span>
                    <span className="text-xl font-bold">{campaign.remainingPoolCredits.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Per Win Reward</span>
                    <span className="text-xl font-bold">{campaign.rewardPerWin}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Participants</span>
                    <span className="text-xl font-bold">{campaign.participants?.length || 0}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Started: {format(new Date(campaign.startDate), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Ends: {format(new Date(campaign.endDate), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Leaderboard
                </CardTitle>
                <CardDescription>
                  Teams can battle each other a maximum of twice per campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.participants && campaign.participants.length > 0 ? (
                  <div className="space-y-3">
                    {campaign.participants
                      .sort((a, b) => b.creditsWon - a.creditsWon || b.matchesWon - a.matchesWon)
                      .map((participant, index) => (
                        <div 
                          key={participant.id} 
                          className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                          data-testid={`row-participant-${participant.teamId}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                              {index === 0 ? <Crown className="h-4 w-4" /> : index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{participant.team.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {participant.matchesWon}W - {participant.matchesPlayed - participant.matchesWon}L
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{participant.creditsWon}</p>
                            <p className="text-sm text-muted-foreground">credits won</p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No teams have joined yet. Be the first!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!user ? (
                  <a href="/api/login">
                    <Button className="w-full gap-2" data-testid="button-login-to-join">
                      <Swords className="h-4 w-4" />
                      Login to Participate
                    </Button>
                  </a>
                ) : campaign.status !== "active" ? (
                  <p className="text-center text-muted-foreground">Campaign is not active</p>
                ) : (
                  <>
                    {canJoin && (
                      <Button 
                        className="w-full gap-2" 
                        onClick={() => setJoinDialogOpen(true)}
                        data-testid="button-join-campaign"
                      >
                        <Users className="h-4 w-4" />
                        Join Campaign
                      </Button>
                    )}
                    {myParticipatingTeams.length > 0 && (
                      <Button 
                        variant="outline"
                        className="w-full gap-2" 
                        onClick={() => setChallengeDialogOpen(true)}
                        data-testid="button-challenge"
                      >
                        <Target className="h-4 w-4" />
                        Challenge a Team
                      </Button>
                    )}
                    {myParticipatingTeams.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Your participating teams:</p>
                        {myParticipatingTeams.map(team => (
                          <Badge key={team.id} variant="secondary" className="mr-2 mb-2">
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Prize Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win a match</span>
                  <span className="font-semibold">+{campaign.rewardPerWin} credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max battles per pair</span>
                  <span className="font-semibold">2 matches</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pool remaining</span>
                  <span className="font-semibold">{Math.round((campaign.remainingPoolCredits / campaign.prizePoolCredits) * 100)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Campaign</DialogTitle>
            <DialogDescription>
              Select one of your teams to join this campaign
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger data-testid="select-team-join">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teamsNotInCampaign.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => joinCampaignMutation.mutate(selectedTeam)}
              disabled={!selectedTeam || joinCampaignMutation.isPending}
              data-testid="button-confirm-join"
            >
              {joinCampaignMutation.isPending ? "Joining..." : "Join Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Challenge a Team</DialogTitle>
            <DialogDescription>
              Select your team and an opponent to challenge
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger data-testid="select-challenger-team">
                  <SelectValue placeholder="Select your team" />
                </SelectTrigger>
                <SelectContent>
                  {myParticipatingTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Opponent Team</label>
              <Select value={challengeOpponent} onValueChange={setChallengeOpponent}>
                <SelectTrigger data-testid="select-opponent-team">
                  <SelectValue placeholder="Select opponent" />
                </SelectTrigger>
                <SelectContent>
                  {campaign.participants
                    ?.filter(p => !myParticipatingTeams.some(t => t.id === p.teamId))
                    .map(p => (
                      <SelectItem key={p.teamId} value={p.teamId}>
                        {p.team.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChallengeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => challengeMutation.mutate({ 
                challengerTeamId: selectedTeam, 
                challengedTeamId: challengeOpponent 
              })}
              disabled={!selectedTeam || !challengeOpponent || challengeMutation.isPending}
              data-testid="button-send-challenge"
            >
              {challengeMutation.isPending ? "Sending..." : "Send Challenge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
