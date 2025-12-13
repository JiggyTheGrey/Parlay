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
  balance: decimal("balance", { precision: 18, scale: 8 }).default("0").notNull(),
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
  balance: decimal("balance", { precision: 18, scale: 8 }).default("0").notNull(),
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

// Match status enum values
export type MatchStatus = "pending" | "accepted" | "active" | "confirming" | "disputed" | "completed" | "cancelled";

// Matches table
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengerTeamId: varchar("challenger_team_id").notNull().references(() => teams.id),
  challengedTeamId: varchar("challenged_team_id").notNull().references(() => teams.id),
  wagerAmount: decimal("wager_amount", { precision: 18, scale: 8 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull().$type<MatchStatus>(),
  gameMode: varchar("game_mode", { length: 50 }).default("standard").notNull(),
  bestOf: integer("best_of").default(1).notNull(),
  message: text("message"),
  challengerConfirmedWinner: varchar("challenger_confirmed_winner"),
  challengedConfirmedWinner: varchar("challenged_confirmed_winner"),
  winnerId: varchar("winner_id").references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Transaction types
export type TransactionType = "deposit" | "withdrawal" | "wager_lock" | "wager_win" | "wager_loss" | "wager_refund" | "team_contribution" | "team_payout";

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  teamId: varchar("team_id").references(() => teams.id),
  matchId: varchar("match_id").references(() => matches.id),
  type: varchar("type", { length: 30 }).notNull().$type<TransactionType>(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 18, scale: 8 }),
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
  balance: true,
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
