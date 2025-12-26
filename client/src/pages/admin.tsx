import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { 
  Shield, 
  AlertCircle, 
  Swords,
  Users,
  Trophy,
  Loader2,
  ArrowLeft,
  Megaphone,
  Plus,
  Calendar,
  Coins
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import type { MatchWithTeams, Team, User, Campaign } from "@shared/schema";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: disputedMatches, isLoading: disputedLoading } = useQuery<MatchWithTeams[]>({
    queryKey: ["/api/admin/matches/disputed"],
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: allTeams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/admin/teams"],
  });

  const { data: allCampaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const [resolvingMatch, setResolvingMatch] = useState<string | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    bannerImage: "",
    prizePoolCredits: 10000,
    rewardPerWin: 100,
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ matchId, winnerId }: { matchId: string; winnerId: string }) => {
      return await apiRequest("POST", `/api/admin/matches/${matchId}/resolve`, { winnerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matches/disputed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({ title: "Dispute resolved", description: "The match has been settled." });
      setResolvingMatch(null);
      setSelectedWinner("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/campaigns", campaignForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign created", description: "The campaign is now active." });
      setCreateDialogOpen(false);
      setCampaignForm({
        name: "",
        description: "",
        bannerImage: "",
        prizePoolCredits: 10000,
        rewardPerWin: 100,
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const endCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return await apiRequest("POST", `/api/admin/campaigns/${campaignId}/end`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign ended", description: "The campaign has been completed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Shield className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h2 className="mb-2 text-xl font-semibold">Access Denied</h2>
        <p className="mb-4 text-muted-foreground">You don't have admin privileges.</p>
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage disputes and platform data
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disputed Matches
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {disputedMatches?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requiring review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allUsers?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Teams
            </CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allTeams?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Campaigns
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allCampaigns?.filter(c => c.status === "active").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Running competitions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="disputes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="disputes" data-testid="tab-disputes">
            <AlertCircle className="mr-2 h-4 w-4" />
            Disputes
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <Megaphone className="mr-2 h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="teams" data-testid="tab-teams">
            <Swords className="mr-2 h-4 w-4" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disputed Matches</CardTitle>
              <CardDescription>
                Matches where teams reported different winners
              </CardDescription>
            </CardHeader>
            <CardContent>
              {disputedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : disputedMatches && disputedMatches.length > 0 ? (
                <div className="space-y-4">
                  {disputedMatches.map((match) => (
                    <div key={match.id} className="rounded-md border p-4">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-semibold">
                            {match.challengerTeam.name} vs {match.challengedTeam.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Wager: {(match.wagerCredits || 0).toLocaleString()} credits
                          </p>
                        </div>
                        <Badge variant="destructive">Disputed</Badge>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 mb-4">
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-sm font-medium mb-1">{match.challengerTeam.name} says:</p>
                          <Badge variant="outline">
                            Winner: {match.challengerConfirmedWinner === match.challengerTeamId 
                              ? match.challengerTeam.name 
                              : match.challengedTeam.name}
                          </Badge>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-sm font-medium mb-1">{match.challengedTeam.name} says:</p>
                          <Badge variant="outline">
                            Winner: {match.challengedConfirmedWinner === match.challengerTeamId 
                              ? match.challengerTeam.name 
                              : match.challengedTeam.name}
                          </Badge>
                        </div>
                      </div>

                      {resolvingMatch === match.id ? (
                        <div className="flex gap-2">
                          <Select value={selectedWinner} onValueChange={setSelectedWinner}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select winner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={match.challengerTeamId}>
                                {match.challengerTeam.name}
                              </SelectItem>
                              <SelectItem value={match.challengedTeamId}>
                                {match.challengedTeam.name}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => resolveDisputeMutation.mutate({ 
                              matchId: match.id, 
                              winnerId: selectedWinner 
                            })}
                            disabled={!selectedWinner || resolveDisputeMutation.isPending}
                          >
                            {resolveDisputeMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Confirm
                          </Button>
                          <Button variant="outline" onClick={() => setResolvingMatch(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => setResolvingMatch(match.id)}
                          data-testid={`button-resolve-${match.id}`}
                        >
                          <Trophy className="mr-2 h-4 w-4" />
                          Resolve Dispute
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="font-medium">No disputed matches</p>
                  <p className="text-sm text-muted-foreground">All matches are resolved</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Campaigns</CardTitle>
                <CardDescription>Manage platform competitions and prize pools</CardDescription>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-campaign">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>
                      Set up a new competition with a prize pool
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Campaign Name</Label>
                      <Input 
                        id="name" 
                        value={campaignForm.name}
                        onChange={(e) => setCampaignForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Winter Championship 2024"
                        data-testid="input-campaign-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        value={campaignForm.description}
                        onChange={(e) => setCampaignForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Compete for glory and credits..."
                        data-testid="input-campaign-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bannerImage">Banner Image URL (optional)</Label>
                      <Input 
                        id="bannerImage" 
                        value={campaignForm.bannerImage}
                        onChange={(e) => setCampaignForm(p => ({ ...p, bannerImage: e.target.value }))}
                        placeholder="/attached_assets/banner.png"
                        data-testid="input-campaign-banner"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prizePool">Prize Pool (credits)</Label>
                        <Input 
                          id="prizePool" 
                          type="number"
                          value={campaignForm.prizePoolCredits}
                          onChange={(e) => setCampaignForm(p => ({ ...p, prizePoolCredits: parseInt(e.target.value) || 0 }))}
                          data-testid="input-prize-pool"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rewardPerWin">Reward Per Win</Label>
                        <Input 
                          id="rewardPerWin" 
                          type="number"
                          value={campaignForm.rewardPerWin}
                          onChange={(e) => setCampaignForm(p => ({ ...p, rewardPerWin: parseInt(e.target.value) || 0 }))}
                          data-testid="input-reward-per-win"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input 
                          id="startDate" 
                          type="date"
                          value={campaignForm.startDate}
                          onChange={(e) => setCampaignForm(p => ({ ...p, startDate: e.target.value }))}
                          data-testid="input-start-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input 
                          id="endDate" 
                          type="date"
                          value={campaignForm.endDate}
                          onChange={(e) => setCampaignForm(p => ({ ...p, endDate: e.target.value }))}
                          data-testid="input-end-date"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => createCampaignMutation.mutate()}
                      disabled={!campaignForm.name || createCampaignMutation.isPending}
                      data-testid="button-submit-campaign"
                    >
                      {createCampaignMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Campaign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : allCampaigns && allCampaigns.length > 0 ? (
                <div className="space-y-4">
                  {allCampaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-md border p-4" data-testid={`row-campaign-${campaign.id}`}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="font-semibold">{campaign.name}</h3>
                          {campaign.description && (
                            <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                          )}
                        </div>
                        <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-muted-foreground">Prize Pool</p>
                          <p className="font-medium">{campaign.prizePoolCredits.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining</p>
                          <p className="font-medium">{campaign.remainingPoolCredits.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Per Win</p>
                          <p className="font-medium">{campaign.rewardPerWin}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ends</p>
                          <p className="font-medium">{format(new Date(campaign.endDate), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                      {campaign.status === "active" && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => endCampaignMutation.mutate(campaign.id)}
                          disabled={endCampaignMutation.isPending}
                          data-testid={`button-end-campaign-${campaign.id}`}
                        >
                          {endCampaignMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          End Campaign
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="font-medium">No campaigns yet</p>
                  <p className="text-sm text-muted-foreground">Create your first campaign to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Registered platform users</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : allUsers && allUsers.length > 0 ? (
                <div className="space-y-2">
                  {allUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          {u.firstName?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.isAdmin && <Badge>Admin</Badge>}
                        <span className="font-mono text-sm">
                          {(u.credits || 0).toLocaleString()} credits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Teams</CardTitle>
              <CardDescription>Registered teams on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : allTeams && allTeams.length > 0 ? (
                <div className="space-y-2">
                  {allTeams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-bold">
                          {team.tag.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-sm text-muted-foreground">[{team.tag}]</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {team.wins}W - {team.losses}L
                        </span>
                        <span className="font-mono text-sm">
                          {(team.credits || 0).toLocaleString()} credits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No teams found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
