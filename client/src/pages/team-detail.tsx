import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Trophy, 
  Wallet, 
  Swords, 
  Users,
  Crown,
  Plus,
  UserPlus,
  Copy,
  Check,
  Loader2,
  Mail,
  Send
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TeamWithMembers, MatchWithTeams, TeamInvitation } from "@shared/schema";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { data: team, isLoading } = useQuery<TeamWithMembers>({
    queryKey: ["/api/teams", id],
  });

  const { data: teamMatches, isLoading: matchesLoading } = useQuery<MatchWithTeams[]>({
    queryKey: ["/api/teams", id, "matches"],
  });

  const { data: teamInvitations } = useQuery<TeamInvitation[]>({
    queryKey: ["/api/teams", id, "invitations"],
    enabled: !!team && team.ownerId === user?.id,
  });

  const joinTeamMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/teams/${id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
      toast({
        title: "Joined team!",
        description: `You are now a member of ${team?.name}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", `/api/teams/${id}/invite`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "invitations"] });
      setInviteEmail("");
      setInviteDialogOpen(false);
      toast({
        title: "Invitation sent!",
        description: "The invitation has been sent to the email address.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/teams/${id}/join`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied!",
      description: "Share this link to invite teammates.",
    });
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
      inviteMutation.mutate(inviteEmail.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Users className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h2 className="mb-2 text-xl font-semibold">Team not found</h2>
        <p className="mb-4 text-muted-foreground">This team doesn't exist or has been deleted.</p>
        <Link href="/teams">
          <Button>Browse Teams</Button>
        </Link>
      </div>
    );
  }

  const isMember = team.members.some(m => m.userId === user?.id);
  const isOwner = team.ownerId === user?.id;
  const winRate = team.wins + team.losses > 0 
    ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            <Badge variant="secondary" className="text-base">[{team.tag}]</Badge>
            {isOwner && <Badge>Owner</Badge>}
            {isMember && !isOwner && <Badge variant="outline">Member</Badge>}
          </div>
          <p className="text-muted-foreground">
            Team profile and statistics
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isMember ? (
            <>
              {isOwner ? (
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Mail className="h-4 w-4" />
                      Invite by Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join {team?.name}. They'll receive a link to accept.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Input
                          type="email"
                          placeholder="teammate@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          data-testid="input-invite-email"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setInviteDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={!inviteEmail.trim() || inviteMutation.isPending}
                          className="flex-1 gap-2"
                          data-testid="button-send-invite"
                        >
                          {inviteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send Invite
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button variant="outline" className="gap-2" onClick={copyInviteLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Invite Link
                </Button>
              )}
              <Link href={`/matches/create?team=${id}`}>
                <Button className="gap-2" data-testid="button-challenge">
                  <Swords className="h-4 w-4" />
                  Challenge
                </Button>
              </Link>
            </>
          ) : (
            <Button 
              className="gap-2" 
              onClick={() => joinTeamMutation.mutate()}
              disabled={joinTeamMutation.isPending}
              data-testid="button-join-team"
            >
              {joinTeamMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Join Team
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Credits
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {(team.credits || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground">
              {team.wins}W - {team.losses}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.members.length}</div>
            <p className="text-xs text-muted-foreground">Active roster</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Matches Played
            </CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.wins + team.losses}</div>
            <p className="text-xs text-muted-foreground">Total games</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Roster
            </CardTitle>
            <CardDescription>
              {team.members.length} members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {team.members.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center gap-3 rounded-md p-3 border"
                >
                  <Avatar>
                    <AvatarImage 
                      src={member.user.profileImageUrl || undefined} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {member.user.firstName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {member.user.firstName} {member.user.lastName}
                      </span>
                      {member.userId === team.ownerId && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground capitalize">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {isMember && (
              <>
                <Separator className="my-4" />
                {isOwner ? (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    <Mail className="h-4 w-4" />
                    Invite by Email
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full gap-2" onClick={copyInviteLink}>
                    <Copy className="h-4 w-4" />
                    Copy Invite Link
                  </Button>
                )}
              </>
            )}
            
            {isOwner && teamInvitations && teamInvitations.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Pending Invitations</h4>
                  <div className="space-y-2">
                    {teamInvitations.filter(inv => inv.status === "pending").map((inv) => (
                      <div key={inv.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{inv.email}</span>
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Recent Matches
            </CardTitle>
            <CardDescription>
              Match history and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : teamMatches && teamMatches.length > 0 ? (
              <div className="space-y-3">
                {teamMatches.slice(0, 5).map((match) => {
                  const isChallenger = match.challengerTeamId === team.id;
                  const opponent = isChallenger ? match.challengedTeam : match.challengerTeam;
                  const won = match.winnerId === team.id;
                  const isComplete = match.status === "completed";

                  return (
                    <Link key={match.id} href={`/matches/${match.id}`}>
                      <div className="flex items-center gap-3 rounded-md p-3 border hover-elevate active-elevate-2 cursor-pointer">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isComplete 
                            ? won 
                              ? "bg-green-500/10 text-green-500" 
                              : "bg-red-500/10 text-red-500"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {isComplete ? (
                            won ? <Trophy className="h-5 w-5" /> : <Swords className="h-5 w-5" />
                          ) : (
                            <Swords className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">vs {opponent.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {match.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-medium">
                            {(match.wagerCredits || 0).toLocaleString()} credits
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Swords className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="mb-2 font-medium">No matches yet</p>
                <p className="text-sm text-muted-foreground">
                  This team hasn't competed in any matches
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
