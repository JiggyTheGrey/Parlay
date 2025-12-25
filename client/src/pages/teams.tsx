import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Users, 
  Trophy,
  Swords
} from "lucide-react";
import type { Team } from "@shared/schema";

export default function Teams() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: myTeams, isLoading: myTeamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams/my"],
  });

  const { data: allTeams, isLoading: allTeamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const filteredTeams = allTeams?.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TeamCard = ({ team, isMember = false }: { team: Team; isMember?: boolean }) => (
    <Link href={`/teams/${team.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xl">
              {team.tag.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg truncate">{team.name}</h3>
                <Badge variant="secondary" className="shrink-0">[{team.tag}]</Badge>
                {isMember && (
                  <Badge variant="default" className="shrink-0">Member</Badge>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>{team.wins}W - {team.losses}L</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-primary">
                  {parseFloat(team.balance).toFixed(4)} BTC
                </span>
                <Button size="sm" variant="outline" className="gap-1" data-testid={`button-challenge-${team.id}`}>
                  <Swords className="h-4 w-4" />
                  Challenge
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  const LoadingSkeleton = () => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users className="mb-4 h-16 w-16 text-muted-foreground/50" />
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 max-w-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Browse and manage teams
          </p>
        </div>
        <Link href="/teams/create">
          <Button className="gap-2" data-testid="button-create-team">
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="my-teams" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-teams" data-testid="tab-my-teams">My Teams</TabsTrigger>
          <TabsTrigger value="all-teams" data-testid="tab-all-teams">Browse Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="my-teams" className="space-y-4">
          {myTeamsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <LoadingSkeleton key={i} />)}
            </div>
          ) : myTeams && myTeams.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myTeams.map((team) => (
                <TeamCard key={team.id} team={team} isMember />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  title="No teams yet"
                  description="You're not a member of any teams. Create your own team or browse and join existing ones."
                  action={
                    <Link href="/teams/create">
                      <Button data-testid="button-create-first-team">
                        <Plus className="mr-1 h-4 w-4" />
                        Create Your First Team
                      </Button>
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all-teams" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search teams by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-teams"
            />
          </div>

          {allTeamsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <LoadingSkeleton key={i} />)}
            </div>
          ) : filteredTeams && filteredTeams.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((team) => {
                const isMember = myTeams?.some(t => t.id === team.id);
                return <TeamCard key={team.id} team={team} isMember={isMember} />;
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  title={searchQuery ? "No teams found" : "No teams yet"}
                  description={
                    searchQuery 
                      ? `No teams match "${searchQuery}". Try a different search term.`
                      : "Be the first to create a clan on Parlay-it!"
                  }
                  action={
                    !searchQuery && (
                      <Link href="/teams/create">
                        <Button>
                          <Plus className="mr-1 h-4 w-4" />
                          Create Team
                        </Button>
                      </Link>
                    )
                  }
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
