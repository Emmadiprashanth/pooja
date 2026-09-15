import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const waitlist = sqliteTable("waitlist", {
 email: text("email").primaryKey(),
 createdAt: text("created_at").notNull(),
 consent: text("consent").notNull(),
});

