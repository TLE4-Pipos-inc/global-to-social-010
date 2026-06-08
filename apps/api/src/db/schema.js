import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  school: text("school"),
  campus: text("campus"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const playerGroups = sqliteTable(
  "player_groups",
  {
    id: text("id").primaryKey(),
    groupName: text("group_name").notNull(),
    groupSize: integer("group_size").notNull(),
    selectedTimeSlot: text("selected_time_slot").notNull(),
    matchStatus: text("match_status").notNull().default("waiting"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check("player_groups_group_size_check", sql`${table.groupSize} BETWEEN 4 AND 8`),
    index("idx_player_groups_time_slot").on(table.selectedTimeSlot),
  ],
);

export const groupMembers = sqliteTable(
  "group_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => playerGroups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("group_members_group_id_user_id_unique").on(table.groupId, table.userId)],
);

export const interests = sqliteTable("interests", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const groupInterests = sqliteTable(
  "group_interests",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => playerGroups.id, { onDelete: "cascade" }),
    interestId: text("interest_id")
      .notNull()
      .references(() => interests.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.interestId] })],
);

export const userInterests = sqliteTable(
  "user_interests",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    interestId: text("interest_id")
      .notNull()
      .references(() => interests.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.interestId] })],
);

export const groupJoinMatches = sqliteTable(
  "group_join_matches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => playerGroups.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => gameSessions.id, {
      onDelete: "set null",
    }),
    matchScore: integer("match_score").notNull().default(0),
    status: text("status").notNull().default("pending"),
    matchedAt: text("matched_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check("group_join_matches_match_score_check", sql`${table.matchScore} BETWEEN 0 AND 100`),
    uniqueIndex("group_join_matches_user_id_group_id_unique").on(table.userId, table.groupId),
    index("idx_group_join_matches_user").on(table.userId),
    index("idx_group_join_matches_group").on(table.groupId),
    index("idx_group_join_matches_session").on(table.sessionId),
  ],
);

export const routeThemes = sqliteTable("route_themes", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  mood: text("mood"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const routes = sqliteTable(
  "routes",
  {
    id: text("id").primaryKey(),
    themeId: text("theme_id").references(() => routeThemes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    area: text("area").notNull(),
    city: text("city").notNull().default("Rotterdam"),
    routeType: text("route_type").notNull().default("social"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [index("idx_routes_theme").on(table.themeId)],
);

export const venues = sqliteTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  venueType: text("venue_type").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  suggestedOrder: text("suggested_order"),
  vibe: text("vibe"),
});

export const partners = sqliteTable("partners", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  password: text("password").notNull(),
  organizationName: text("organization_name").notNull(),
  contactEmail: text("contact_email"),
  partnershipType: text("partnership_type").notNull(),
  status: text("status").notNull().default("prospect"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("partners_user_id_unique").on(table.userId),
]);

export const venuePartnerships = sqliteTable(
  "venue_partnerships",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    dealTitle: text("deal_title").notNull(),
    dealDescription: text("deal_description"),
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [index("idx_venue_partnerships_venue").on(table.venueId)],
);

export const routeStops = sqliteTable(
  "route_stops",
  {
    id: text("id").primaryKey(),
    routeId: text("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    routeOrder: integer("route_order").notNull(),
    plannedDurationMinutes: integer("planned_duration_minutes").notNull().default(45),
    walkLabel: text("walk_label"),
  },
  (table) => [
    check("route_stops_route_order_check", sql`${table.routeOrder} > 0`),
    check("route_stops_planned_duration_minutes_check", sql`${table.plannedDurationMinutes} > 0 AND ${table.plannedDurationMinutes} <= 45`),
    uniqueIndex("route_stops_route_id_route_order_unique").on(table.routeId, table.routeOrder),
    uniqueIndex("route_stops_route_id_venue_id_unique").on(table.routeId, table.venueId),
    index("idx_route_stops_route").on(table.routeId),
  ],
);

export const gameSessions = sqliteTable(
  "game_sessions",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => playerGroups.id, { onDelete: "cascade" }),
    routeId: text("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "restrict" }),
    themeId: text("theme_id").references(() => routeThemes.id, { onDelete: "set null" }),
    selectedTimeSlot: text("selected_time_slot").notNull(),
    status: text("status").notNull().default("setup"),
    currentStopIndex: integer("current_stop_index").notNull().default(0),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    check("game_sessions_current_stop_index_check", sql`${table.currentStopIndex} >= 0`),
    index("idx_game_sessions_group").on(table.groupId),
    index("idx_game_sessions_route").on(table.routeId),
  ],
);

export const sessionStops = sqliteTable(
  "session_stops",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    routeStopId: text("route_stop_id")
      .notNull()
      .references(() => routeStops.id, { onDelete: "restrict" }),
    timerState: text("timer_state").notNull().default("not_started"),
    arrivedAt: text("arrived_at"),
    timerStartedAt: text("timer_started_at"),
    timerFinishedAt: text("timer_finished_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("session_stops_session_id_route_stop_id_unique").on(table.sessionId, table.routeStopId),
    index("idx_session_stops_session").on(table.sessionId),
  ],
);

export const conversationStarters = sqliteTable(
  "conversation_starters",
  {
    id: text("id").primaryKey(),
    interestsId: text("interests_id").references(() => interests.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    prompt: text("prompt").notNull(),
    triggerMinute: integer("trigger_minute").notNull(),
  },
  (table) => [
    check("conversation_starters_trigger_minute_check", sql`${table.triggerMinute} IN (0, 5, 10, 15, 20, 25, 30, 35, 40, 45)`),
  ],
);

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    sessionStopId: text("session_stop_id")
      .notNull()
      .references(() => sessionStops.id, { onDelete: "cascade" }),
    uploadedByGroupId: text("uploaded_by_group_id").references(() => playerGroups.id, { onDelete: "set null" }),
    photoUrl: text("photo_url"),
    localUri: text("local_uri"),
    proofType: text("proof_type").notNull().default("venue_proof"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check("photos_photo_url_or_local_uri_check", sql`${table.photoUrl} IS NOT NULL OR ${table.localUri} IS NOT NULL`),
    index("idx_photos_session_stop").on(table.sessionStopId),
  ],
);

export const collages = sqliteTable("collages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .unique()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  collageUrl: text("collage_url"),
  layoutType: text("layout_type").notNull().default("five_stop_grid"),
  shareToken: text("share_token").unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const collagePhotos = sqliteTable(
  "collage_photos",
  {
    id: text("id").primaryKey(),
    collageId: text("collage_id")
      .notNull()
      .references(() => collages.id, { onDelete: "cascade" }),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").notNull(),
    caption: text("caption"),
  },
  (table) => [
    check("collage_photos_display_order_check", sql`${table.displayOrder} > 0`),
    uniqueIndex("collage_photos_collage_id_display_order_unique").on(table.collageId, table.displayOrder),
    uniqueIndex("collage_photos_collage_id_photo_id_unique").on(table.collageId, table.photoId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  groupMembers: many(groupMembers),
  interests: many(userInterests),
  groupJoinMatches: many(groupJoinMatches),
  partnerProfiles: many(partners),
}));

export const playerGroupsRelations = relations(playerGroups, ({ many }) => ({
  members: many(groupMembers),
  interests: many(groupInterests),
  joinMatches: many(groupJoinMatches),
  gameSessions: many(gameSessions),
  uploadedPhotos: many(photos),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(playerGroups, {
    fields: [groupMembers.groupId],
    references: [playerGroups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const interestsRelations = relations(interests, ({ many }) => ({
  groupInterests: many(groupInterests),
  userInterests: many(userInterests),
  conversationStarters: many(conversationStarters),
}));

export const groupInterestsRelations = relations(groupInterests, ({ one }) => ({
  group: one(playerGroups, {
    fields: [groupInterests.groupId],
    references: [playerGroups.id],
  }),
  interest: one(interests, {
    fields: [groupInterests.interestId],
    references: [interests.id],
  }),
}));

export const userInterestsRelations = relations(userInterests, ({ one }) => ({
  user: one(users, {
    fields: [userInterests.userId],
    references: [users.id],
  }),
  interest: one(interests, {
    fields: [userInterests.interestId],
    references: [interests.id],
  }),
}));

export const groupJoinMatchesRelations = relations(groupJoinMatches, ({ one }) => ({
  user: one(users, {
    fields: [groupJoinMatches.userId],
    references: [users.id],
  }),
  group: one(playerGroups, {
    fields: [groupJoinMatches.groupId],
    references: [playerGroups.id],
  }),
  session: one(gameSessions, {
    fields: [groupJoinMatches.sessionId],
    references: [gameSessions.id],
  }),
}));

export const routeThemesRelations = relations(routeThemes, ({ many }) => ({
  routes: many(routes),
  gameSessions: many(gameSessions),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  theme: one(routeThemes, {
    fields: [routes.themeId],
    references: [routeThemes.id],
  }),
  stops: many(routeStops),
  gameSessions: many(gameSessions),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  routeStops: many(routeStops),
  partnerships: many(venuePartnerships),
}));

export const partnersRelations = relations(partners, ({ one, many }) => ({
  user: one(users, {
    fields: [partners.userId],
    references: [users.id],
  }),
  venuePartnerships: many(venuePartnerships),
}));

export const venuePartnershipsRelations = relations(venuePartnerships, ({ one }) => ({
  venue: one(venues, {
    fields: [venuePartnerships.venueId],
    references: [venues.id],
  }),
  partner: one(partners, {
    fields: [venuePartnerships.partnerId],
    references: [partners.id],
  }),
}));

export const routeStopsRelations = relations(routeStops, ({ one, many }) => ({
  route: one(routes, {
    fields: [routeStops.routeId],
    references: [routes.id],
  }),
  venue: one(venues, {
    fields: [routeStops.venueId],
    references: [venues.id],
  }),
  sessionStops: many(sessionStops),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  group: one(playerGroups, {
    fields: [gameSessions.groupId],
    references: [playerGroups.id],
  }),
  route: one(routes, {
    fields: [gameSessions.routeId],
    references: [routes.id],
  }),
  theme: one(routeThemes, {
    fields: [gameSessions.themeId],
    references: [routeThemes.id],
  }),
  sessionStops: many(sessionStops),
  collage: one(collages),
  joinMatches: many(groupJoinMatches),
}));

export const sessionStopsRelations = relations(sessionStops, ({ one, many }) => ({
  session: one(gameSessions, {
    fields: [sessionStops.sessionId],
    references: [gameSessions.id],
  }),
  routeStop: one(routeStops, {
    fields: [sessionStops.routeStopId],
    references: [routeStops.id],
  }),
  photos: many(photos),
}));

export const conversationStartersRelations = relations(conversationStarters, ({ one }) => ({
  interest: one(interests, {
    fields: [conversationStarters.interestsId],
    references: [interests.id],
  }),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  sessionStop: one(sessionStops, {
    fields: [photos.sessionStopId],
    references: [sessionStops.id],
  }),
  uploadedByGroup: one(playerGroups, {
    fields: [photos.uploadedByGroupId],
    references: [playerGroups.id],
  }),
  collagePhotos: many(collagePhotos),
}));

export const collagesRelations = relations(collages, ({ one, many }) => ({
  session: one(gameSessions, {
    fields: [collages.sessionId],
    references: [gameSessions.id],
  }),
  photos: many(collagePhotos),
}));

export const collagePhotosRelations = relations(collagePhotos, ({ one }) => ({
  collage: one(collages, {
    fields: [collagePhotos.collageId],
    references: [collages.id],
  }),
  photo: one(photos, {
    fields: [collagePhotos.photoId],
    references: [photos.id],
  }),
}));
