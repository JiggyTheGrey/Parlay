import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

const createTeamSchema = z.object({
  name: z.string()
    .min(3, "Team name must be at least 3 characters")
    .max(100, "Team name must be less than 100 characters"),
  tag: z.string()
    .min(2, "Tag must be at least 2 characters")
    .max(10, "Tag must be less than 10 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Tag can only contain letters and numbers"),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

export default function TeamCreate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      tag: "",
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamForm) => {
      const response = await apiRequest("POST", "/api/teams", data);
      return response;
    },
    onSuccess: (team: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
      toast({
        title: "Team created!",
        description: `${team.name} is ready for competition.`,
      });
      navigate(`/teams/${team.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTeamForm) => {
    createTeamMutation.mutate(data);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Team</h1>
          <p className="text-muted-foreground">
            Build your squad and start competing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Team Details</CardTitle>
              <CardDescription>
                Choose a unique name and tag for your team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter team name" 
                        {...field} 
                        data-testid="input-team-name"
                      />
                    </FormControl>
                    <FormDescription>
                      This is your team's display name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Tag</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., APEX" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        data-testid="input-team-tag"
                      />
                    </FormControl>
                    <FormDescription>
                      A short 2-10 character tag shown in brackets (letters and numbers only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Preview:</strong> {form.watch("name") || "Team Name"} [{form.watch("tag") || "TAG"}]
                </p>
              </div>

              <div className="flex gap-4">
                <Link href="/teams" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1 gap-2"
                  disabled={createTeamMutation.isPending}
                  data-testid="button-submit-team"
                >
                  {createTeamMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create Team
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
