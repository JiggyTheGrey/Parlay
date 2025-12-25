import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTeamSchema, insertMatchSchema, type MatchStatus } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/stats/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await storage.getMyTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching my teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeamWithMembers(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get("/api/teams/:id/matches", async (req, res) => {
    try {
      const matches = await storage.getTeamMatches(req.params.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching team matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.post("/api/teams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTeamSchema.parse({ ...req.body, ownerId: userId });
      const team = await storage.createTeam(data, userId);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.post("/api/teams/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = req.params.id;

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const isMember = await storage.isTeamMember(teamId, userId);
      if (isMember) {
        return res.status(400).json({ message: "Already a member" });
      }

      const member = await storage.joinTeam(teamId, userId);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error joining team:", error);
      res.status(500).json({ message: "Failed to join team" });
    }
  });

  app.post("/api/teams/:id/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = req.params.id;
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      if (team.ownerId !== userId) {
        return res.status(403).json({ message: "Only team owner can invite members" });
      }

      const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await storage.createTeamInvitation({
        teamId,
        email: email.toLowerCase(),
        invitedBy: userId,
        token,
        expiresAt,
      });

      res.status(201).json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.get("/api/teams/:id/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = req.params.id;

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      if (team.ownerId !== userId) {
        return res.status(403).json({ message: "Only team owner can view invitations" });
      }

      const invitations = await storage.getTeamInvitationsByTeam(teamId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.get("/api/invitations/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.email) {
        return res.json([]);
      }

      const invitations = await storage.getTeamInvitationsByEmail(user.email);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getTeamInvitation(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      res.json(invitation);
    } catch (error) {
      console.error("Error fetching invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });

  app.post("/api/invitations/:token/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const invitation = await storage.getTeamInvitation(req.params.token);

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation already used or expired" });
      }

      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        await storage.updateInvitationStatus(invitation.id, "expired");
        return res.status(400).json({ message: "Invitation has expired" });
      }

      if (user?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({ message: "This invitation is for a different email address" });
      }

      const isMember = await storage.isTeamMember(invitation.teamId, userId);
      if (isMember) {
        await storage.updateInvitationStatus(invitation.id, "accepted");
        return res.status(400).json({ message: "Already a member of this team" });
      }

      await storage.joinTeam(invitation.teamId, userId);
      await storage.updateInvitationStatus(invitation.id, "accepted");

      res.json({ success: true, teamId: invitation.teamId });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.post("/api/invitations/:token/decline", isAuthenticated, async (req: any, res) => {
    try {
      const invitation = await storage.getTeamInvitation(req.params.token);

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation already used" });
      }

      await storage.updateInvitationStatus(invitation.id, "declined");
      res.json({ success: true });
    } catch (error) {
      console.error("Error declining invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });

  app.get("/api/matches", async (req, res) => {
    try {
      const status = req.query.status as MatchStatus | undefined;
      const matches = await storage.getMatches(status);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const myTeams = await storage.getMyTeams(userId);
      
      const allPending: any[] = [];
      for (const team of myTeams) {
        const pending = await storage.getPendingMatchesForTeam(team.id);
        allPending.push(...pending);
      }
      
      res.json(allPending);
    } catch (error) {
      console.error("Error fetching pending matches:", error);
      res.status(500).json({ message: "Failed to fetch pending matches" });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ message: "Failed to fetch match" });
    }
  });

  app.post("/api/matches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertMatchSchema.parse(req.body);

      const isMember = await storage.isTeamMember(data.challengerTeamId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of challenger team" });
      }

      const challengerTeam = await storage.getTeam(data.challengerTeamId);
      if (!challengerTeam) {
        return res.status(404).json({ message: "Challenger team not found" });
      }
      if (parseFloat(challengerTeam.balance) < parseFloat(data.wagerAmount)) {
        return res.status(400).json({ message: "Insufficient team balance" });
      }

      await storage.updateTeamBalance(data.challengerTeamId, `-${data.wagerAmount}`);

      const match = await storage.createMatch(data);

      await storage.createTransaction({
        teamId: data.challengerTeamId,
        matchId: match.id,
        type: "wager_lock",
        amount: `-${data.wagerAmount}`,
        description: "Wager locked for match challenge",
      });

      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating match:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  app.post("/api/matches/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.id;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      if (match.status !== "pending") {
        return res.status(400).json({ message: "Match is not pending" });
      }

      const isMember = await storage.isTeamMember(match.challengedTeamId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of challenged team" });
      }

      const challengedTeam = await storage.getTeam(match.challengedTeamId);
      if (parseFloat(challengedTeam!.balance) < parseFloat(match.wagerAmount)) {
        return res.status(400).json({ message: "Insufficient team balance" });
      }

      await storage.updateTeamBalance(match.challengedTeamId, `-${match.wagerAmount}`);

      await storage.createTransaction({
        teamId: match.challengedTeamId,
        matchId: match.id,
        type: "wager_lock",
        amount: `-${match.wagerAmount}`,
        description: "Wager locked for accepting match",
      });

      const updated = await storage.updateMatchStatus(matchId, "accepted");
      res.json(updated);
    } catch (error) {
      console.error("Error accepting match:", error);
      res.status(500).json({ message: "Failed to accept match" });
    }
  });

  app.post("/api/matches/:id/decline", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.id;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      if (match.status !== "pending") {
        return res.status(400).json({ message: "Match is not pending" });
      }

      const isMember = await storage.isTeamMember(match.challengedTeamId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of challenged team" });
      }

      await storage.updateTeamBalance(match.challengerTeamId, match.wagerAmount);

      await storage.createTransaction({
        teamId: match.challengerTeamId,
        matchId: match.id,
        type: "wager_refund",
        amount: match.wagerAmount,
        description: "Wager refunded - match declined",
      });

      const updated = await storage.updateMatchStatus(matchId, "cancelled");
      res.json(updated);
    } catch (error) {
      console.error("Error declining match:", error);
      res.status(500).json({ message: "Failed to decline match" });
    }
  });

  app.post("/api/matches/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.id;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      if (match.status !== "accepted") {
        return res.status(400).json({ message: "Match is not accepted" });
      }

      const isChallengerMember = await storage.isTeamMember(match.challengerTeamId, userId);
      const isChallengedMember = await storage.isTeamMember(match.challengedTeamId, userId);
      if (!isChallengerMember && !isChallengedMember) {
        return res.status(403).json({ message: "Not a member of either team" });
      }

      const updated = await storage.updateMatchStatus(matchId, "active");
      res.json(updated);
    } catch (error) {
      console.error("Error starting match:", error);
      res.status(500).json({ message: "Failed to start match" });
    }
  });

  app.post("/api/matches/:id/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.id;
      const { winnerId } = req.body;

      if (!winnerId) {
        return res.status(400).json({ message: "Winner ID required" });
      }

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      if (match.status !== "active" && match.status !== "confirming") {
        return res.status(400).json({ message: "Match is not active" });
      }

      const isChallengerMember = await storage.isTeamMember(match.challengerTeamId, userId);
      const isChallengedMember = await storage.isTeamMember(match.challengedTeamId, userId);

      if (!isChallengerMember && !isChallengedMember) {
        return res.status(403).json({ message: "Not a member of either team" });
      }

      const confirmingTeamId = isChallengerMember ? match.challengerTeamId : match.challengedTeamId;
      const updated = await storage.confirmMatchWinner(matchId, confirmingTeamId, winnerId);

      if (updated.status !== "confirming") {
        await storage.updateMatchStatus(matchId, "confirming");
      }

      const refreshed = await storage.getMatch(matchId);

      if (
        refreshed!.challengerConfirmedWinner &&
        refreshed!.challengedConfirmedWinner
      ) {
        if (refreshed!.challengerConfirmedWinner === refreshed!.challengedConfirmedWinner) {
          const finalWinnerId = refreshed!.challengerConfirmedWinner;
          const loserId = finalWinnerId === match.challengerTeamId
            ? match.challengedTeamId
            : match.challengerTeamId;

          const totalPot = (parseFloat(match.wagerAmount) * 2).toString();
          await storage.updateTeamBalance(finalWinnerId, totalPot);
          await storage.updateTeamStats(finalWinnerId, true);
          await storage.updateTeamStats(loserId, false);

          await storage.createTransaction({
            teamId: finalWinnerId,
            matchId: match.id,
            type: "wager_win",
            amount: totalPot,
            description: "Match won - prize collected",
          });

          await storage.setMatchWinner(matchId, finalWinnerId);
        } else {
          await storage.updateMatchStatus(matchId, "disputed");
        }
      }

      const finalMatch = await storage.getMatch(matchId);
      res.json(finalMatch);
    } catch (error) {
      console.error("Error confirming match:", error);
      res.status(500).json({ message: "Failed to confirm match" });
    }
  });

  app.post("/api/wallet/deposit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount } = req.body;

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const user = await storage.updateUserBalance(userId, amount);

      await storage.createTransaction({
        userId,
        type: "deposit",
        amount,
        balanceAfter: user.balance,
        description: "Deposit to wallet",
      });

      res.json(user);
    } catch (error) {
      console.error("Error depositing:", error);
      res.status(500).json({ message: "Failed to deposit" });
    }
  });

  app.post("/api/wallet/withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount } = req.body;

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const currentUser = await storage.getUser(userId);
      if (parseFloat(currentUser!.balance) < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const user = await storage.updateUserBalance(userId, `-${amount}`);

      await storage.createTransaction({
        userId,
        type: "withdrawal",
        amount: `-${amount}`,
        balanceAfter: user.balance,
        description: "Withdrawal from wallet",
      });

      res.json(user);
    } catch (error) {
      console.error("Error withdrawing:", error);
      res.status(500).json({ message: "Failed to withdraw" });
    }
  });

  app.post("/api/wallet/contribute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, amount } = req.body;

      if (!teamId || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Invalid data" });
      }

      const isMember = await storage.isTeamMember(teamId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a team member" });
      }

      const currentUser = await storage.getUser(userId);
      if (parseFloat(currentUser!.balance) < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      await storage.updateUserBalance(userId, `-${amount}`);
      await storage.updateTeamBalance(teamId, amount);

      await storage.createTransaction({
        userId,
        teamId,
        type: "team_contribution",
        amount: `-${amount}`,
        description: "Contributed to team balance",
      });

      const team = await storage.getTeam(teamId);
      res.json(team);
    } catch (error) {
      console.error("Error contributing:", error);
      res.status(500).json({ message: "Failed to contribute" });
    }
  });

  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/admin/matches/disputed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const matches = await storage.getMatches("disputed");
      res.json(matches);
    } catch (error) {
      console.error("Error fetching disputed matches:", error);
      res.status(500).json({ message: "Failed to fetch disputed matches" });
    }
  });

  app.post("/api/admin/matches/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const matchId = req.params.id;
      const { winnerId } = req.body;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      if (match.status !== "disputed") {
        return res.status(400).json({ message: "Match is not disputed" });
      }

      const loserId = winnerId === match.challengerTeamId
        ? match.challengedTeamId
        : match.challengerTeamId;

      const totalPot = (parseFloat(match.wagerAmount) * 2).toString();
      await storage.updateTeamBalance(winnerId, totalPot);
      await storage.updateTeamStats(winnerId, true);
      await storage.updateTeamStats(loserId, false);

      await storage.createTransaction({
        teamId: winnerId,
        matchId: match.id,
        type: "wager_win",
        amount: totalPot,
        description: "Match won - dispute resolved by admin",
      });

      const updated = await storage.setMatchWinner(matchId, winnerId);
      res.json(updated);
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
