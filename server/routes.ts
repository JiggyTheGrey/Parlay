import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTeamSchema, insertMatchSchema, insertCampaignSchema, type MatchStatus, type CampaignStatus, CREDIT_PACKAGES } from "@shared/schema";
import { z } from "zod";
import { getPaystackPublicKey, initializePaystackTransaction, verifyPaystackTransaction } from "./paystackClient";
import { convertUsdToNgnKobo } from "./exchangeRate";

const MAX_TEAM_MEMBERS = 5;

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

      const memberCount = await storage.getTeamMemberCount(teamId);
      if (memberCount >= MAX_TEAM_MEMBERS) {
        return res.status(400).json({ message: `Team is full (max ${MAX_TEAM_MEMBERS} members)` });
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

      const memberCount = await storage.getTeamMemberCount(invitation.teamId);
      if (memberCount >= MAX_TEAM_MEMBERS) {
        return res.status(400).json({ message: `Team is full (max ${MAX_TEAM_MEMBERS} members)` });
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

  app.get("/api/battles/:token", async (req, res) => {
    try {
      const match = await storage.getMatchByShareToken(req.params.token);
      if (!match) {
        return res.status(404).json({ message: "Battle not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error fetching battle:", error);
      res.status(500).json({ message: "Failed to fetch battle" });
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
      if (challengerTeam.credits < data.wagerCredits) {
        return res.status(400).json({ message: "Insufficient team credits" });
      }

      await storage.updateTeamCredits(data.challengerTeamId, -data.wagerCredits);

      const match = await storage.createMatch(data);

      await storage.createTransaction({
        teamId: data.challengerTeamId,
        matchId: match.id,
        type: "wager_lock",
        credits: -data.wagerCredits,
        description: "Credits locked for match challenge",
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
      if (challengedTeam!.credits < match.wagerCredits) {
        return res.status(400).json({ message: "Insufficient team credits" });
      }

      await storage.updateTeamCredits(match.challengedTeamId, -match.wagerCredits);

      await storage.createTransaction({
        teamId: match.challengedTeamId,
        matchId: match.id,
        type: "wager_lock",
        credits: -match.wagerCredits,
        description: "Credits locked for accepting match",
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

      await storage.updateTeamCredits(match.challengerTeamId, match.wagerCredits);

      await storage.createTransaction({
        teamId: match.challengerTeamId,
        matchId: match.id,
        type: "wager_refund",
        credits: match.wagerCredits,
        description: "Credits refunded - match declined",
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

          // Check if this is a campaign match
          const campaignMatch = match.campaignId 
            ? await storage.getCampaignMatchByMatchId(match.id)
            : null;

          if (campaignMatch && match.campaignId) {
            // Campaign match - award reward from pool
            const campaign = await storage.getCampaign(match.campaignId);
            if (campaign && campaign.remainingPoolCredits >= campaign.rewardPerWin) {
              const reward = campaign.rewardPerWin;
              
              await storage.updateTeamCredits(finalWinnerId, reward);
              await storage.updateCampaignRemainingPool(match.campaignId, -reward);
              await storage.completeCampaignMatch(match.id, finalWinnerId, reward);
              
              // Update participant stats
              const winnerParticipant = await storage.getCampaignParticipant(match.campaignId, finalWinnerId);
              const loserParticipant = await storage.getCampaignParticipant(match.campaignId, loserId);
              
              if (winnerParticipant) {
                await storage.updateCampaignParticipantStats(winnerParticipant.id, true, reward);
              }
              if (loserParticipant) {
                await storage.updateCampaignParticipantStats(loserParticipant.id, false, 0);
              }

              await storage.createTransaction({
                teamId: finalWinnerId,
                matchId: match.id,
                type: "campaign_reward",
                credits: reward,
                description: `Campaign reward - ${campaign.name}`,
              });
            }
          } else if (match.wagerCredits > 0) {
            // Regular wager match - apply 10% platform fee
            const totalPot = match.wagerCredits * 2;
            const platformFee = Math.floor(totalPot * 0.10);
            const winnerPayout = totalPot - platformFee;
            
            await storage.updateTeamCredits(finalWinnerId, winnerPayout);

            await storage.createTransaction({
              teamId: finalWinnerId,
              matchId: match.id,
              type: "wager_win",
              credits: winnerPayout,
              description: `Match won - prize collected (${platformFee} platform fee deducted)`,
            });

            // Record platform fee transaction for tracking
            await storage.createTransaction({
              matchId: match.id,
              type: "platform_fee",
              credits: platformFee,
              description: `Platform fee (10%) from match ${match.id}`,
            });
          }

          await storage.updateTeamStats(finalWinnerId, true);
          await storage.updateTeamStats(loserId, false);
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

  app.post("/api/wallet/contribute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, credits } = req.body;

      if (!teamId || !credits || credits <= 0) {
        return res.status(400).json({ message: "Invalid data" });
      }

      const isMember = await storage.isTeamMember(teamId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a team member" });
      }

      const currentUser = await storage.getUser(userId);
      if (currentUser!.credits < credits) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      await storage.updateUserCredits(userId, -credits);
      await storage.updateTeamCredits(teamId, credits);

      await storage.createTransaction({
        userId,
        teamId,
        type: "team_contribution",
        credits: -credits,
        creditsAfter: currentUser!.credits - credits,
        description: "Contributed credits to team",
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

      // Check if this is a campaign match (no fee for campaign matches)
      const isCampaignMatch = !!match.campaignId;
      const totalPot = match.wagerCredits * 2;
      
      let winnerPayout = totalPot;
      let platformFee = 0;
      
      // Apply 10% platform fee only for regular wager matches (not campaign matches)
      if (!isCampaignMatch && totalPot > 0) {
        platformFee = Math.floor(totalPot * 0.10);
        winnerPayout = totalPot - platformFee;
      }
      
      await storage.updateTeamCredits(winnerId, winnerPayout);
      await storage.updateTeamStats(winnerId, true);
      await storage.updateTeamStats(loserId, false);

      await storage.createTransaction({
        teamId: winnerId,
        matchId: match.id,
        type: "wager_win",
        credits: winnerPayout,
        description: platformFee > 0 
          ? `Match won - dispute resolved by admin (${platformFee} platform fee deducted)`
          : "Match won - dispute resolved by admin",
      });
      
      // Record platform fee transaction if applicable
      if (platformFee > 0) {
        await storage.createTransaction({
          matchId: match.id,
          type: "platform_fee",
          credits: platformFee,
          description: `Platform fee (10%) from match ${match.id}`,
        });
      }

      const updated = await storage.setMatchWinner(matchId, winnerId);
      res.json(updated);
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });

  app.get("/api/credit-packages", async (req, res) => {
    res.json(CREDIT_PACKAGES);
  });

  app.get("/api/paystack/public-key", async (req, res) => {
    try {
      const publicKey = getPaystackPublicKey();
      res.json({ publicKey });
    } catch (error) {
      console.error("Error getting Paystack key:", error);
      res.status(500).json({ message: "Failed to get Paystack configuration" });
    }
  });

  app.post("/api/credits/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId } = req.body;

      const creditPackage = CREDIT_PACKAGES.find(p => p.id === packageId);
      if (!creditPackage) {
        return res.status(400).json({ message: "Invalid package" });
      }

      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email required for payment" });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const totalCredits = creditPackage.credits + (('bonus' in creditPackage) ? (creditPackage as any).bonus : 0);

      // Generate unique reference
      const reference = `parlay_${userId}_${packageId}_${Date.now()}`;

      // Convert USD cents to NGN kobo using real-time exchange rate
      const amountKobo = await convertUsdToNgnKobo(creditPackage.priceUsd);

      const paystackResponse = await initializePaystackTransaction(
        user.email,
        amountKobo,
        reference,
        {
          userId,
          packageId,
          creditsToAward: totalCredits.toString(),
        },
        `${baseUrl}/wallet?reference=${reference}`
      );

      res.json({ 
        url: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
        accessCode: paystackResponse.data.access_code
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.get("/api/credits/verify/:reference", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reference } = req.params;

      const paystackResponse = await verifyPaystackTransaction(reference);

      if (paystackResponse.data.metadata?.userId !== userId) {
        return res.status(403).json({ message: "Transaction does not belong to user" });
      }

      if (paystackResponse.data.status === 'success') {
        const creditsToAward = parseInt(paystackResponse.data.metadata?.creditsToAward || '0');
        
        const existingPurchase = await storage.getCreditPurchaseBySessionId(reference);
        if (existingPurchase) {
          return res.json({ 
            success: true, 
            credits: creditsToAward,
            alreadyProcessed: true 
          });
        }

        await storage.createCreditPurchase({
          userId,
          packageId: paystackResponse.data.metadata?.packageId || '',
          creditsAwarded: creditsToAward,
          amountPaidCents: paystackResponse.data.amount / 100,
          stripeSessionId: reference, // Reusing field for Paystack reference
        });

        const user = await storage.updateUserCredits(userId, creditsToAward);

        await storage.createTransaction({
          userId,
          type: "credit_purchase",
          credits: creditsToAward,
          creditsAfter: user.credits,
          description: `Purchased ${creditsToAward} credits`,
        });

        return res.json({ success: true, credits: creditsToAward, user });
      }

      res.json({ success: false, status: paystackResponse.data.status });
    } catch (error) {
      console.error("Error verifying purchase:", error);
      res.status(500).json({ message: "Failed to verify purchase" });
    }
  });

  // Campaign routes (public)
  app.get("/api/campaigns", async (req, res) => {
    try {
      const status = req.query.status as CampaignStatus | undefined;
      const campaigns = await storage.getCampaigns(status);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/active", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns("active");
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching active campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaignWithDetails(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.get("/api/campaigns/:id/participants", async (req, res) => {
    try {
      const participants = await storage.getCampaignParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching campaign participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  app.post("/api/campaigns/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = req.params.id;
      const { teamId } = req.body;

      if (!teamId) {
        return res.status(400).json({ message: "Team ID is required" });
      }

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      if (campaign.status !== "active") {
        return res.status(400).json({ message: "Campaign is not active" });
      }

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      if (team.ownerId !== userId) {
        return res.status(403).json({ message: "Only team captains can join campaigns" });
      }

      const existingParticipant = await storage.getCampaignParticipant(campaignId, teamId);
      if (existingParticipant) {
        return res.status(400).json({ message: "Team already in this campaign" });
      }

      const participant = await storage.joinCampaign(campaignId, teamId);
      res.status(201).json(participant);
    } catch (error) {
      console.error("Error joining campaign:", error);
      res.status(500).json({ message: "Failed to join campaign" });
    }
  });

  app.get("/api/campaigns/:id/can-battle", isAuthenticated, async (req: any, res) => {
    try {
      const campaignId = req.params.id;
      const { team1Id, team2Id } = req.query;

      if (!team1Id || !team2Id) {
        return res.status(400).json({ message: "Both team IDs required" });
      }

      const existingMatches = await storage.getCampaignMatchesBetweenTeams(
        campaignId,
        team1Id as string,
        team2Id as string
      );

      res.json({ canBattle: existingMatches.length < 2, matchCount: existingMatches.length });
    } catch (error) {
      console.error("Error checking battle eligibility:", error);
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  app.post("/api/campaigns/:id/challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = req.params.id;
      const { challengerTeamId, challengedTeamId, game, gameMode, bestOf, message } = req.body;

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      if (campaign.status !== "active") {
        return res.status(400).json({ message: "Campaign is not active" });
      }
      if (campaign.remainingPoolCredits < campaign.rewardPerWin) {
        return res.status(400).json({ message: "Campaign prize pool is depleted" });
      }

      const isMember = await storage.isTeamMember(challengerTeamId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of challenger team" });
      }

      const challengerParticipant = await storage.getCampaignParticipant(campaignId, challengerTeamId);
      const challengedParticipant = await storage.getCampaignParticipant(campaignId, challengedTeamId);
      
      if (!challengerParticipant || !challengedParticipant) {
        return res.status(400).json({ message: "Both teams must be in the campaign" });
      }

      const existingMatches = await storage.getCampaignMatchesBetweenTeams(
        campaignId,
        challengerTeamId,
        challengedTeamId
      );
      if (existingMatches.length >= 2) {
        return res.status(400).json({ message: "Teams have already battled twice in this campaign" });
      }

      const match = await storage.createMatch({
        challengerTeamId,
        challengedTeamId,
        wagerCredits: 0,
        campaignId,
        game: game || "bloodstrike",
        gameMode: gameMode || "standard",
        bestOf: bestOf || 1,
        message,
      });

      await storage.createCampaignMatch(
        campaignId,
        match.id,
        challengerTeamId,
        challengedTeamId
      );

      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating campaign challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  // Admin campaign routes
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const data = insertCampaignSchema.parse({
        ...req.body,
        createdBy: userId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });

      const campaign = await storage.createCampaign(data);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.post("/api/admin/campaigns/:id/end", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const campaign = await storage.updateCampaignStatus(req.params.id, "completed");
      res.json(campaign);
    } catch (error) {
      console.error("Error ending campaign:", error);
      res.status(500).json({ message: "Failed to end campaign" });
    }
  });

  // Team payout to user (captain distributes team credits to member's withdrawable balance)
  app.post("/api/wallet/payout-from-team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, amount, recipientId } = req.body;

      if (!teamId || !amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid data" });
      }

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Only team owner can distribute payouts
      if (team.ownerId !== userId) {
        return res.status(403).json({ message: "Only team captain can distribute payouts" });
      }

      // Check team has sufficient credits
      if (team.credits < amount) {
        return res.status(400).json({ message: "Insufficient team credits" });
      }

      // Use the provided recipientId, or default to self
      const targetUserId = recipientId || userId;
      
      // Verify recipient is a team member
      const isMember = await storage.isTeamMember(teamId, targetUserId);
      if (!isMember) {
        return res.status(400).json({ message: "Recipient is not a team member" });
      }

      // Deduct from team and add to user's withdrawable credits
      await storage.updateTeamCredits(teamId, -amount);
      await storage.updateUserWithdrawableCredits(targetUserId, amount);

      const recipient = await storage.getUser(targetUserId);
      await storage.createTransaction({
        userId: targetUserId,
        teamId,
        type: "team_payout",
        credits: amount,
        creditsAfter: recipient!.withdrawableCredits,
        description: `Payout from team ${team.name}`,
      });

      res.json({ message: "Payout successful", amount });
    } catch (error) {
      console.error("Error processing payout:", error);
      res.status(500).json({ message: "Failed to process payout" });
    }
  });

  // User requests withdrawal from their withdrawable credits
  app.post("/api/withdrawal/request", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { credits, bankName, accountNumber, accountName } = req.body;

      const WITHDRAWAL_FEE = 5;
      const CREDITS_PER_2_USD = 100;

      if (!credits || credits < CREDITS_PER_2_USD) {
        return res.status(400).json({ message: `Minimum withdrawal is ${CREDITS_PER_2_USD} credits ($2)` });
      }

      if (!bankName || !accountNumber || !accountName) {
        return res.status(400).json({ message: "Bank details are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const totalRequired = credits + WITHDRAWAL_FEE;
      if (user.withdrawableCredits < totalRequired) {
        return res.status(400).json({ 
          message: `Insufficient withdrawable credits. You need ${totalRequired} credits (including ${WITHDRAWAL_FEE} fee).` 
        });
      }

      // Calculate USD amount in cents (100 credits = $2 = 200 cents)
      const usdCents = Math.floor((credits / CREDITS_PER_2_USD) * 200);
      const netCredits = credits;

      // Deduct credits including fee from withdrawable balance
      await storage.updateUserWithdrawableCredits(userId, -totalRequired);

      // Store bank details as JSON string
      const bankDetails = JSON.stringify({ bankName, accountNumber, accountName });

      const withdrawal = await storage.createWithdrawalRequest({
        userId,
        creditsRequested: credits,
        feeCredits: WITHDRAWAL_FEE,
        netCredits,
        amountUsdCents: usdCents,
        bankDetails,
      });

      await storage.createTransaction({
        userId,
        type: "withdrawal_request",
        credits: -totalRequired,
        creditsAfter: user.withdrawableCredits - totalRequired,
        description: `Withdrawal request: ${credits} credits ($${(usdCents / 100).toFixed(2)}) + ${WITHDRAWAL_FEE} fee`,
      });

      res.status(201).json(withdrawal);
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      res.status(500).json({ message: "Failed to create withdrawal request" });
    }
  });

  // Get user's withdrawal requests
  app.get("/api/withdrawal/requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getWithdrawalRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      res.status(500).json({ message: "Failed to fetch withdrawal requests" });
    }
  });

  // Admin: Get all withdrawal requests
  app.get("/api/admin/withdrawals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const requests = await storage.getAllWithdrawalRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      res.status(500).json({ message: "Failed to fetch withdrawal requests" });
    }
  });

  // Admin: Approve withdrawal
  app.post("/api/admin/withdrawals/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { adminNotes } = req.body;
      const withdrawal = await storage.updateWithdrawalStatus(
        req.params.id, 
        "approved", 
        userId, 
        adminNotes
      );

      res.json(withdrawal);
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      res.status(500).json({ message: "Failed to approve withdrawal" });
    }
  });

  // Admin: Reject withdrawal (refund credits)
  app.post("/api/admin/withdrawals/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { adminNotes } = req.body;
      
      // Get the withdrawal request to refund credits
      const requests = await storage.getAllWithdrawalRequests();
      const request = requests.find(r => r.id === req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Withdrawal request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Can only reject pending requests" });
      }

      // Refund credits (including fee) to user's withdrawable balance
      const refundAmount = request.creditsRequested + request.feeCredits;
      await storage.updateUserWithdrawableCredits(request.userId, refundAmount);

      const withdrawal = await storage.updateWithdrawalStatus(
        req.params.id, 
        "rejected", 
        userId, 
        adminNotes
      );

      await storage.createTransaction({
        userId: request.userId,
        type: "withdrawal_refund",
        credits: refundAmount,
        description: `Withdrawal request rejected - credits refunded`,
      });

      res.json(withdrawal);
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      res.status(500).json({ message: "Failed to reject withdrawal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
