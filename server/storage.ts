import { users, quotes, type User, type InsertUser, type Quote, type InsertQuote, updateQuoteSchema } from "@shared/schema";
import { db } from "./db";
import { eq, like, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";

type UpdateQuote = z.infer<typeof updateQuoteSchema>;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quote methods
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(quote: UpdateQuote): Promise<Quote>;
  getQuotesByEmail(email: string): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  getAllQuotes(search?: string, sortField?: string, sortOrder?: 'asc' | 'desc'): Promise<Quote[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const [quote] = await db
      .insert(quotes)
      .values(insertQuote)
      .returning();
    return quote;
  }

  async updateQuote(updateQuote: UpdateQuote): Promise<Quote> {
    const [quote] = await db
      .update(quotes)
      .set({ ...updateQuote, updatedAt: new Date() })
      .where(eq(quotes.id, updateQuote.id))
      .returning();
    return quote;
  }

  async getQuotesByEmail(email: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.contactEmail, email));
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getAllQuotes(search?: string, sortField?: string, sortOrder?: 'asc' | 'desc'): Promise<Quote[]> {
    if (search && sortField && sortOrder) {
      const orderColumn = sortField === 'contactEmail' ? quotes.contactEmail :
                         sortField === 'updatedAt' ? quotes.updatedAt :
                         sortField === 'monthlyFee' ? quotes.monthlyFee :
                         sortField === 'setupFee' ? quotes.setupFee :
                         quotes.updatedAt;
      
      return await db.select().from(quotes)
        .where(sql`${quotes.contactEmail} ILIKE ${`%${search}%`}`)
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));
    } else if (search) {
      return await db.select().from(quotes)
        .where(sql`${quotes.contactEmail} ILIKE ${`%${search}%`}`)
        .orderBy(desc(quotes.updatedAt));
    } else if (sortField && sortOrder) {
      const orderColumn = sortField === 'contactEmail' ? quotes.contactEmail :
                         sortField === 'updatedAt' ? quotes.updatedAt :
                         sortField === 'monthlyFee' ? quotes.monthlyFee :
                         sortField === 'setupFee' ? quotes.setupFee :
                         quotes.updatedAt;
      
      return await db.select().from(quotes)
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));
    } else {
      return await db.select().from(quotes).orderBy(desc(quotes.updatedAt));
    }
  }
}

export const storage = new DatabaseStorage();
