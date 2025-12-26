import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (Replit Auth compatible)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  credits: integer("credits").default(0).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  tag: varchar("tag", { length: 10 }).notNull(),
  avatarUrl: varchar("avatar_url"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  credits: integer("credits").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team members junction table
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 50 }).default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Team invitations for email invites
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  email: varchar("email").notNull(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).default("pending").notNull().$type<InvitationStatus>(),
  token: varchar("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Match status enum values
export type MatchStatus = "pending" | "accepted" | "active" | "confirming" | "disputed" | "completed" | "cancelled";

// Supported games
export const SUPPORTED_GAMES = [
  { id: "bloodstrike", name: "Bloodstrike" },
  { id: "cod_warzone", name: "Call of Duty: Warzone" },
  { id: "cod_mw3", name: "Call of Duty: MW3" },
  { id: "apex", name: "Apex Legends" },
  { id: "fortnite", name: "Fortnite" },
  { id: "valorant", name: "Valorant" },
  { id: "csgo", name: "CS2" },
  { id: "other", name: "Other" },
] as const;

export type GameId = typeof SUPPORTED_GAMES[number]["id"];

// Matches table
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengerTeamId: varchar("challenger_team_id").notNull().references(() => teams.id),
  challengedTeamId: varchar("challenged_team_id").notNull().references(() => teams.id),
  wagerCredits: integer("wager_credits").notNull(),
  campaignId: varchar("campaign_id"),
  status: varchar("status", { length: 20 }).default("pending").notNull().$type<MatchStatus>(),
  game: varchar("game", { length: 50 }).default("bloodstrike").notNull(),
  gameMode: varchar("game_mode", { length: 50 }).default("standard").notNull(),
  bestOf: integer("best_of").default(1).notNull(),
  message: text("message"),
  shareToken: varchar("share_token", { length: 50 }).unique(),
  challengerConfirmedWinner: varchar("challenger_confirmed_winner"),
  challengedConfirmedWinner: varchar("challenged_confirmed_winner"),
  winnerId: varchar("winner_id").references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Credit packages for purchase
export const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter Pack", credits: 100, priceUsd: 200 }, // $2.00
  { id: "popular", name: "Popular Pack", credits: 500, priceUsd: 1999, bonus: 50, popular: true }, // $19.99 + 50 bonus
  { id: "pro", name: "Pro Pack", credits: 1000, priceUsd: 3499, bonus: 150 }, // $34.99 + 150 bonus
  { id: "elite", name: "Elite Pack", credits: 2500, priceUsd: 7999, bonus: 500 }, // $79.99 + 500 bonus
] as const;

export type CreditPackageId = typeof CREDIT_PACKAGES[number]["id"];

// Credit purchase status
export type CreditPurchaseStatus = "pending" | "completed" | "failed" | "refunded";

// Credit purchases table (for Stripe purchases)
export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  packageId: varchar("package_id", { length: 50 }).notNull(),
  creditsAwarded: integer("credits_awarded").notNull(),
  amountPaidCents: integer("amount_paid_cents").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeSessionId: varchar("stripe_session_id"),
  status: varchar("status", { length: 20 }).default("pending").notNull().$type<CreditPurchaseStatus>(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Campaign status
export type CampaignStatus = "draft" | "active" | "completed" | "cancelled";

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  prizePoolCredits: integer("prize_pool_credits").notNull(),
  remainingPoolCredits: integer("remaining_pool_credits").notNull(),
  rewardPerWin: integer("reward_per_win").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull().$type<CampaignStatus>(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaign participants (teams that joined a campaign)
export const campaignParticipants = pgTable("campaign_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  creditsWon: integer("credits_won").default(0).notNull(),
  matchesPlayed: integer("matches_played").default(0).notNull(),
  matchesWon: integer("matches_won").default(0).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Campaign matches (tracks battles within a campaign to enforce the 2-battle limit)
export const campaignMatches = pgTable("campaign_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  team1Id: varchar("team1_id").notNull().references(() => teams.id),
  team2Id: varchar("team2_id").notNull().references(() => teams.id),
  winnerId: varchar("winner_id").references(() => teams.id),
  rewardAwarded: integer("reward_awarded"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transaction types
export type TransactionType = "credit_purchase" | "wager_lock" | "wager_win" | "wager_loss" | "wager_refund" | "team_contribution" | "team_payout" | "campaign_reward";

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  teamId: varchar("team_id").references(() => teams.id),
  matchId: varchar("match_id").references(() => matches.id),
  purchaseId: varchar("purchase_id").references(() => creditPurchases.id),
  type: varchar("type", { length: 30 }).notNull().$type<TransactionType>(),
  credits: integer("credits").notNull(),
  creditsAfter: integer("credits_after"),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedTeams: many(teams),
  teamMemberships: many(teamMembers),
  transactions: many(transactions),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  challengerMatches: many(matches, { relationName: "challengerMatches" }),
  challengedMatches: many(matches, { relationName: "challengedMatches" }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  team: one(teams, {
    fields: [teamInvitations.teamId],
    references: [teams.id],
  }),
  inviter: one(users, {
    fields: [teamInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  challengerTeam: one(teams, {
    fields: [matches.challengerTeamId],
    references: [teams.id],
    relationName: "challengerMatches",
  }),
  challengedTeam: one(teams, {
    fields: [matches.challengedTeamId],
    references: [teams.id],
    relationName: "challengedMatches",
  }),
  winner: one(teams, {
    fields: [matches.winnerId],
    references: [teams.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [transactions.teamId],
    references: [teams.id],
  }),
  match: one(matches, {
    fields: [transactions.matchId],
    references: [matches.id],
  }),
  purchase: one(creditPurchases, {
    fields: [transactions.purchaseId],
    references: [creditPurchases.id],
  }),
}));

export const creditPurchasesRelations = relations(creditPurchases, ({ one }) => ({
  user: one(users, {
    fields: [creditPurchases.userId],
    references: [users.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  participants: many(campaignParticipants),
  campaignMatches: many(campaignMatches),
}));

export const campaignParticipantsRelations = relations(campaignParticipants, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignParticipants.campaignId],
    references: [campaigns.id],
  }),
  team: one(teams, {
    fields: [campaignParticipants.teamId],
    references: [teams.id],
  }),
}));

export const campaignMatchesRelations = relations(campaignMatches, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignMatches.campaignId],
    references: [campaigns.id],
  }),
  match: one(matches, {
    fields: [campaignMatches.matchId],
    references: [matches.id],
  }),
  team1: one(teams, {
    fields: [campaignMatches.team1Id],
    references: [teams.id],
    relationName: "campaignTeam1",
  }),
  team2: one(teams, {
    fields: [campaignMatches.team2Id],
    references: [teams.id],
    relationName: "campaignTeam2",
  }),
  winner: one(teams, {
    fields: [campaignMatches.winnerId],
    references: [teams.id],
    relationName: "campaignWinner",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  wins: true,
  losses: true,
  credits: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  status: true,
  challengerConfirmedWinner: true,
  challengedConfirmedWinner: true,
  winnerId: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertCreditPurchaseSchema = createInsertSchema(creditPurchases).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  status: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  status: true,
  remainingPoolCredits: true,
});

export const insertCampaignParticipantSchema = createInsertSchema(campaignParticipants).omit({
  id: true,
  joinedAt: true,
  creditsWon: true,
  matchesPlayed: true,
  matchesWon: true,
});

export const insertCampaignMatchSchema = createInsertSchema(campaignMatches).omit({
  id: true,
  createdAt: true,
  winnerId: true,
  rewardAwarded: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;

export type TeamInvitationWithDetails = TeamInvitation & {
  team: Team;
  inviter: User;
};

export type CreditPurchase = typeof creditPurchases.$inferSelect;
export type InsertCreditPurchase = z.infer<typeof insertCreditPurchaseSchema>;

// Extended types with relations
export type TeamWithMembers = Team & {
  members: (TeamMember & { user: User })[];
  owner: User;
};

export type MatchWithTeams = Match & {
  challengerTeam: Team;
  challengedTeam: Team;
  winner?: Team;
};

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type CampaignParticipant = typeof campaignParticipants.$inferSelect;
export type InsertCampaignParticipant = z.infer<typeof insertCampaignParticipantSchema>;

export type CampaignMatch = typeof campaignMatches.$inferSelect;
export type InsertCampaignMatch = z.infer<typeof insertCampaignMatchSchema>;

export type CampaignWithDetails = Campaign & {
  creator: User;
  participants: (CampaignParticipant & { team: Team })[];
};

export type CampaignParticipantWithTeam = CampaignParticipant & {
  team: Team;
};
