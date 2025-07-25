import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, desc } from 'drizzle-orm';
import { quotes, users, type InsertQuote, type SelectQuote, type InsertUser, type SelectUser } from '../shared/schema.js';

const connectionString = process.env.DATABASE_URL!;
const sql = neon(connectionString);
const db = drizzle(sql);

export class DatabaseStorage {
  // Quote operations
  async createQuote(quoteData: InsertQuote): Promise<SelectQuote> {
    const [quote] = await db.insert(quotes).values(quoteData).returning();
    return quote;
  }

  async getQuotesByEmail(email: string, userId: number): Promise<SelectQuote[]> {
    return db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.contactEmail, email),
          eq(quotes.userId, userId),
          eq(quotes.archived, false)
        )
      )
      .orderBy(desc(quotes.createdAt));
  }

  async getQuotesByUser(userId: number): Promise<SelectQuote[]> {
    return db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.userId, userId),
          eq(quotes.archived, false)
        )
      )
      .orderBy(desc(quotes.createdAt));
  }

  async getQuoteById(id: number, userId: number): Promise<SelectQuote | null> {
    const [quote] = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.id, id),
          eq(quotes.userId, userId)
        )
      );
    return quote || null;
  }

  async updateQuote(id: number, updateData: Partial<InsertQuote>, userId: number): Promise<SelectQuote | null> {
    const [quote] = await db
      .update(quotes)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(quotes.id, id),
          eq(quotes.userId, userId)
        )
      )
      .returning();
    return quote || null;
  }

  async archiveQuote(id: number, userId: number): Promise<SelectQuote | null> {
    const [quote] = await db
      .update(quotes)
      .set({
        archived: true,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(quotes.id, id),
          eq(quotes.userId, userId)
        )
      )
      .returning();
    return quote || null;
  }

  // User operations
  async createUser(userData: InsertUser): Promise<SelectUser> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<SelectUser | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || null;
  }

  async getUserById(id: number): Promise<SelectUser | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user || null;
  }
}