import {
  users,
  teams,
  teamMembers,
  teamInvitations,
  matches,
  transactions,
  type User,
  type UpsertUser,
  type Team,
  type InsertTeam,
  type TeamMember,
  type TeamInvitation,
  type InsertTeamInvitation,
  type TeamInvitationWithDetails,
  type Match,
  type InsertMatch,
  type Transaction,
  type InsertTransaction,
  type TeamWithMembers,
  type MatchWithTeams,
  type MatchStatus,
  type InvitationStatus,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserBalance(userId: string, amount: string): Promise<User>;
  
  getTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeamWithMembers(id: string): Promise<TeamWithMembers | undefined>;
  getMyTeams(userId: string): Promise<Team[]>;
  createTeam(team: InsertTeam, userId: string): Promise<Team>;
  joinTeam(teamId: string, userId: string): Promise<TeamMember>;
  isTeamMember(teamId: string, userId: string): Promise<boolean>;
  updateTeamBalance(teamId: string, amount: string): Promise<Team>;
  updateTeamStats(teamId: string, won: boolean): Promise<Team>;
  
  getMatches(status?: MatchStatus): Promise<MatchWithTeams[]>;
  getMatch(id: string): Promise<MatchWithTeams | undefined>;
  getTeamMatches(teamId: string): Promise<MatchWithTeams[]>;
  getPendingMatchesForTeam(teamId: string): Promise<MatchWithTeams[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatchStatus(id: string, status: MatchStatus): Promise<Match>;
  confirmMatchWinner(id: string, teamId: string, winnerId: string): Promise<Match>;
  setMatchWinner(id: string, winnerId: string): Promise<Match>;
  
  getTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  getUserStats(userId: string): Promise<{
    totalWins: number;
    totalLosses: number;
    totalEarnings: string;
    activeMatches: number;
  }>;
  
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  getTeamInvitation(token: string): Promise<TeamInvitationWithDetails | undefined>;
  getTeamInvitationsByEmail(email: string): Promise<TeamInvitationWithDetails[]>;
  getTeamInvitationsByTeam(teamId: string): Promise<TeamInvitation[]>;
  updateInvitationStatus(id: string, status: InvitationStatus): Promise<TeamInvitation>;
  getUserByEmail(email: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserBalance(userId: string, amount: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        balance: sql`${users.balance} + ${amount}::decimal`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getTeams(): Promise<Team[]> {
    return db.select().from(teams).orderBy(desc(teams.createdAt));
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamWithMembers(id: string): Promise<TeamWithMembers | undefined> {
    const team = await this.getTeam(id);
    if (!team) return undefined;

    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, id));

    const memberUsers = await Promise.all(
      members.map(async (member) => {
        const user = await this.getUser(member.userId);
        return { ...member, user: user! };
      })
    );

    const owner = await this.getUser(team.ownerId);

    return {
      ...team,
      members: memberUsers,
      owner: owner!,
    };
  }

  async getMyTeams(userId: string): Promise<Team[]> {
    const memberTeamIds = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const teamIds = memberTeamIds.map((m) => m.teamId);

    if (teamIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(teams)
      .where(or(...teamIds.map((id) => eq(teams.id, id))))
      .orderBy(desc(teams.createdAt));
  }

  async createTeam(teamData: InsertTeam, userId: string): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values({ ...teamData, ownerId: userId })
      .returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: userId,
      role: "owner",
    });

    return team;
  }

  async joinTeam(teamId: string, userId: string): Promise<TeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values({ teamId, userId, role: "member" })
      .returning();
    return member;
  }

  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return !!member;
  }

  async updateTeamBalance(teamId: string, amount: string): Promise<Team> {
    const [team] = await db
      .update(teams)
      .set({
        balance: sql`${teams.balance} + ${amount}::decimal`,
      })
      .where(eq(teams.id, teamId))
      .returning();
    return team;
  }

  async updateTeamStats(teamId: string, won: boolean): Promise<Team> {
    const [team] = await db
      .update(teams)
      .set(
        won
          ? { wins: sql`${teams.wins} + 1` }
          : { losses: sql`${teams.losses} + 1` }
      )
      .where(eq(teams.id, teamId))
      .returning();
    return team;
  }

  async getMatches(status?: MatchStatus): Promise<MatchWithTeams[]> {
    const allMatches = status
      ? await db
          .select()
          .from(matches)
          .where(eq(matches.status, status))
          .orderBy(desc(matches.createdAt))
      : await db.select().from(matches).orderBy(desc(matches.createdAt));

    return Promise.all(
      allMatches.map(async (match) => {
        const challengerTeam = await this.getTeam(match.challengerTeamId);
        const challengedTeam = await this.getTeam(match.challengedTeamId);
        const winner = match.winnerId ? await this.getTeam(match.winnerId) : undefined;
        return {
          ...match,
          challengerTeam: challengerTeam!,
          challengedTeam: challengedTeam!,
          winner,
        };
      })
    );
  }

  async getMatch(id: string): Promise<MatchWithTeams | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    if (!match) return undefined;

    const challengerTeam = await this.getTeam(match.challengerTeamId);
    const challengedTeam = await this.getTeam(match.challengedTeamId);
    const winner = match.winnerId ? await this.getTeam(match.winnerId) : undefined;

    return {
      ...match,
      challengerTeam: challengerTeam!,
      challengedTeam: challengedTeam!,
      winner,
    };
  }

  async getTeamMatches(teamId: string): Promise<MatchWithTeams[]> {
    const allMatches = await db
      .select()
      .from(matches)
      .where(
        or(
          eq(matches.challengerTeamId, teamId),
          eq(matches.challengedTeamId, teamId)
        )
      )
      .orderBy(desc(matches.createdAt));

    return Promise.all(
      allMatches.map(async (match) => {
        const challengerTeam = await this.getTeam(match.challengerTeamId);
        const challengedTeam = await this.getTeam(match.challengedTeamId);
        const winner = match.winnerId ? await this.getTeam(match.winnerId) : undefined;
        return {
          ...match,
          challengerTeam: challengerTeam!,
          challengedTeam: challengedTeam!,
          winner,
        };
      })
    );
  }

  async getPendingMatchesForTeam(teamId: string): Promise<MatchWithTeams[]> {
    const allMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.challengedTeamId, teamId),
          eq(matches.status, "pending")
        )
      )
      .orderBy(desc(matches.createdAt));

    return Promise.all(
      allMatches.map(async (match) => {
        const challengerTeam = await this.getTeam(match.challengerTeamId);
        const challengedTeam = await this.getTeam(match.challengedTeamId);
        return {
          ...match,
          challengerTeam: challengerTeam!,
          challengedTeam: challengedTeam!,
        };
      })
    );
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    const [match] = await db.insert(matches).values(matchData).returning();
    return match;
  }

  async updateMatchStatus(id: string, status: MatchStatus): Promise<Match> {
    const updateData: any = { status };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }
    const [match] = await db
      .update(matches)
      .set(updateData)
      .where(eq(matches.id, id))
      .returning();
    return match;
  }

  async confirmMatchWinner(
    id: string,
    teamId: string,
    winnerId: string
  ): Promise<Match> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));

    const updateData: any = {};
    if (match.challengerTeamId === teamId) {
      updateData.challengerConfirmedWinner = winnerId;
    } else {
      updateData.challengedConfirmedWinner = winnerId;
    }

    const [updatedMatch] = await db
      .update(matches)
      .set(updateData)
      .where(eq(matches.id, id))
      .returning();

    return updatedMatch;
  }

  async setMatchWinner(id: string, winnerId: string): Promise<Match> {
    const [match] = await db
      .update(matches)
      .set({
        winnerId,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(matches.id, id))
      .returning();
    return match;
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  async getUserStats(userId: string): Promise<{
    totalWins: number;
    totalLosses: number;
    totalEarnings: string;
    activeMatches: number;
  }> {
    const userTeams = await this.getMyTeams(userId);
    const teamIds = userTeams.map((t) => t.id);

    let totalWins = 0;
    let totalLosses = 0;

    for (const team of userTeams) {
      totalWins += team.wins;
      totalLosses += team.losses;
    }

    const earningsResult = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), '0')` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "wager_win")
        )
      );

    const totalEarnings = earningsResult[0]?.total || "0";

    let activeMatches = 0;
    if (teamIds.length > 0) {
      const activeMatchesResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(matches)
        .where(
          and(
            or(...teamIds.map((id) => eq(matches.challengerTeamId, id)), ...teamIds.map((id) => eq(matches.challengedTeamId, id))),
            or(
              eq(matches.status, "pending"),
              eq(matches.status, "accepted"),
              eq(matches.status, "active"),
              eq(matches.status, "confirming")
            )
          )
        );
      activeMatches = Number(activeMatchesResult[0]?.count || 0);
    }

    return {
      totalWins,
      totalLosses,
      totalEarnings,
      activeMatches,
    };
  }

  async createTeamInvitation(invitationData: InsertTeamInvitation): Promise<TeamInvitation> {
    const [invitation] = await db
      .insert(teamInvitations)
      .values(invitationData)
      .returning();
    return invitation;
  }

  async getTeamInvitation(token: string): Promise<TeamInvitationWithDetails | undefined> {
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.token, token));
    
    if (!invitation) return undefined;
    
    const team = await this.getTeam(invitation.teamId);
    const inviter = await this.getUser(invitation.invitedBy);
    
    return {
      ...invitation,
      team: team!,
      inviter: inviter!,
    };
  }

  async getTeamInvitationsByEmail(email: string): Promise<TeamInvitationWithDetails[]> {
    const invitations = await db
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.email, email.toLowerCase()),
        eq(teamInvitations.status, "pending")
      ))
      .orderBy(desc(teamInvitations.createdAt));
    
    return Promise.all(
      invitations.map(async (invitation) => {
        const team = await this.getTeam(invitation.teamId);
        const inviter = await this.getUser(invitation.invitedBy);
        return {
          ...invitation,
          team: team!,
          inviter: inviter!,
        };
      })
    );
  }

  async getTeamInvitationsByTeam(teamId: string): Promise<TeamInvitation[]> {
    return db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.teamId, teamId))
      .orderBy(desc(teamInvitations.createdAt));
  }

  async updateInvitationStatus(id: string, status: InvitationStatus): Promise<TeamInvitation> {
    const [invitation] = await db
      .update(teamInvitations)
      .set({ status })
      .where(eq(teamInvitations.id, id))
      .returning();
    return invitation;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }
}

export const storage = new DatabaseStorage();
