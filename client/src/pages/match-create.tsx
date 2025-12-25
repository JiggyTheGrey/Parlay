import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Swords, ArrowLeft, Loader2, Wallet, AlertCircle } from "lucide-react";
import type { Team } from "@shared/schema";
import { SUPPORTED_GAMES } from "@shared/schema";

const createMatchSchema = z.object({
  challengerTeamId: z.string().min(1, "Select your team"),
  challengedTeamId: z.string().min(1, "Select opponent team"),
  wagerCredits: z.string()
    .min(1, "Enter wager amount")
    .refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, "Must be a positive number")
    .refine(val => parseInt(val) >= 10, "Minimum wager is 10 credits"),
  game: z.string().min(1, "Select a game"),
  gameMode: z.string().default("standard"),
  bestOf: z.string().default("1"),
  message: z.string().optional(),
});

type CreateMatchForm = z.infer<typeof createMatchSchema>;

export default function MatchCreate() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const preselectedTeam = searchParams.get("team");
  const { toast } = useToast();

  const { data: myTeams, isLoading: myTeamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams/my"],
  });

  const { data: allTeams, isLoading: allTeamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const form = useForm<CreateMatchForm>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      challengerTeamId: preselectedTeam || "",
      challengedTeamId: "",
      wagerCredits: "",
      game: "bloodstrike",
      gameMode: "standard",
      bestOf: "1",
      message: "",
    },
  });

  const selectedChallengerTeam = myTeams?.find(t => t.id === form.watch("challengerTeamId"));
  const opponentTeams = allTeams?.filter(t => t.id !== form.watch("challengerTeamId"));
  const wagerCredits = parseInt(form.watch("wagerCredits") || "0");
  const hasInsufficientBalance = selectedChallengerTeam && wagerCredits > (selectedChallengerTeam.credits || 0);

  const createMatchMutation = useMutation({
    mutationFn: async (data: CreateMatchForm) => {
      return await apiRequest("POST", "/api/matches", {
        ...data,
        wagerCredits: parseInt(data.wagerCredits),
        bestOf: parseInt(data.bestOf),
      });
    },
    onSuccess: (match: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Challenge sent!",
        description: "Waiting for the opponent to accept.",
      });
      navigate(`/matches/${match.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create match",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateMatchForm) => {
    if (hasInsufficientBalance) {
      toast({
        title: "Insufficient balance",
        description: "Your team doesn't have enough funds for this wager.",
        variant: "destructive",
      });
      return;
    }
    createMatchMutation.mutate(data);
  };

  if (myTeamsLoading || allTeamsLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!myTeams || myTeams.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="py-16 text-center">
            <Swords className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
            <h2 className="mb-2 text-xl font-semibold">Join a team first</h2>
            <p className="mb-4 text-muted-foreground">
              You need to be a member of a team to create match challenges.
            </p>
            <Link href="/teams/create">
              <Button>Create a Team</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/matches">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Match</h1>
          <p className="text-muted-foreground">
            Challenge another team to a wager match
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Swords className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Match Details</CardTitle>
              <CardDescription>
                Set up your team vs team challenge
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="challengerTeamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Team</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-my-team">
                          <SelectValue placeholder="Select your team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {myTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <span>{team.name}</span>
                              <span className="text-muted-foreground">[{team.tag}]</span>
                              <span className="font-mono text-xs">
                                {(team.credits || 0).toLocaleString()} credits
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="challengedTeamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opponent Team</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-opponent-team">
                          <SelectValue placeholder="Select opponent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {opponentTeams && opponentTeams.length > 0 ? (
                          opponentTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                <span>{team.name}</span>
                                <span className="text-muted-foreground">[{team.tag}]</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="_no_teams" disabled>
                            No teams available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="game"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-game">
                          <SelectValue placeholder="Select game" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORTED_GAMES.map((game) => (
                          <SelectItem key={game.id} value={game.id}>
                            {game.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wagerCredits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wager Amount (Credits)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          type="number"
                          step="1"
                          min="10"
                          placeholder="100" 
                          className="pl-10 font-mono"
                          {...field}
                          data-testid="input-wager-amount"
                        />
                      </div>
                    </FormControl>
                    {selectedChallengerTeam && (
                      <FormDescription className="flex items-center gap-2">
                        Team credits: 
                        <span className="font-mono">
                          {(selectedChallengerTeam.credits || 0).toLocaleString()}
                        </span>
                      </FormDescription>
                    )}
                    {hasInsufficientBalance && (
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        Insufficient team credits
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="gameMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Mode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-game-mode">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="ranked">Ranked</SelectItem>
                          <SelectItem value="deathmatch">Deathmatch</SelectItem>
                          <SelectItem value="capture">Capture</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bestOf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Best Of</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-best-of">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Best of 1</SelectItem>
                          <SelectItem value="3">Best of 3</SelectItem>
                          <SelectItem value="5">Best of 5</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add a message to your challenge..."
                        className="resize-none"
                        {...field}
                        data-testid="input-message"
                      />
                    </FormControl>
                    <FormDescription>
                      Send a message to the opposing team
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Link href="/matches" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1 gap-2"
                  disabled={createMatchMutation.isPending || hasInsufficientBalance}
                  data-testid="button-submit-match"
                >
                  {createMatchMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Send Challenge
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
