import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  firstMessage: text("first_message"),
  gender: text("gender").notNull(),
  aiModel: text("ai_model").notNull(),
  voiceProvider: text("voice_provider").notNull(),
  voiceSettings: jsonb("voice_settings"),
  systemPrompt: text("system_prompt"),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.70"),
  maxTokens: integer("max_tokens").default(150),
  country: text("country"),
  languages: text("languages").array().default([]),
  knowledgeBase: text("knowledge_base").array().default([]),
  ragResponse: text("rag_response"),
  profileImageUrl: text("profile_image_url"),
  cost: decimal("cost", { precision: 10, scale: 4 }).default("0.0000"),
  latency: decimal("latency", { precision: 5, scale: 3 }).default("0.000"),
  isActive: boolean("is_active").default(true),
  userTags: text("user_tags").array().default([]),
  systemTags: text("system_tags").array().default([]),
  // Call settings
  callRecording: boolean("call_recording").default(true),
  callRecordingFormat: text("call_recording_format").default("mp3"),
  backgroundAmbientSound: text("background_ambient_sound"),
  rememberLeadPreference: boolean("remember_lead_preference").default(true),
  voicemailDetection: boolean("voicemail_detection").default(true),
  voicemailMessage: text("voicemail_message"),
  // Call transfer settings
  enableCallTransfer: boolean("enable_call_transfer").default(false),
  transferPhoneNumber: text("transfer_phone_number"),
  // Keyboard sound settings
  keyboardSound: boolean("keyboard_sound").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  callType: text("call_type").notNull(), // 'inbound' | 'outbound'
  duration: integer("duration"), // in seconds
  status: text("status").notNull(), // 'completed' | 'in_progress' | 'missed' | 'failed'
  transcript: text("transcript"),
  cost: decimal("cost", { precision: 10, scale: 4 }),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  totalCalls: integer("total_calls").default(0),
  demosBooked: integer("demos_booked").default(0),
  interestedLeads: integer("interested_leads").default(0),
  followUps: integer("follow_ups").default(0),
  totalCallsChange: decimal("total_calls_change", { precision: 5, scale: 2 }).default("0.00"),
  demosBookedChange: decimal("demos_booked_change", { precision: 5, scale: 2 }).default("0.00"),
  interestedLeadsChange: decimal("interested_leads_change", { precision: 5, scale: 2 }).default("0.00"),
  followUpsChange: decimal("follow_ups_change", { precision: 5, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  tags: text("tags").array().default([]),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  websiteUrl: text("website_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Relations
export const agentsRelations = relations(agents, ({ many }) => ({
  calls: many(calls),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  agent: one(agents, {
    fields: [calls.agentId],
    references: [agents.id],
  }),
}));

// Insert schemas
export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export const insertMetricSchema = createInsertSchema(metrics).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Metric = typeof metrics.$inferSelect;
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;

// Call with agent relation
export type CallWithAgent = Call & {
  agent: Agent | null;
};
