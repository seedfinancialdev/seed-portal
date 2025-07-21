import { users, quotes, approvalCodes, type User, type InsertUser, type Quote, type InsertQuote, type ApprovalCode, type InsertApprovalCode, updateQuoteSchema } from "@shared/schema";
import { db } from "./db";
import { eq, like, desc, asc, sql, and } from "drizzle-orm";
import { z } from "zod";

type UpdateQuote = z.infer<typeof updateQuoteSchema>;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quote methods
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(quote: UpdateQuote): Promise<Quote>;
  archiveQuote(id: number): Promise<Quote>;
  getQuotesByEmail(email: string): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  getAllQuotes(search?: string, sortField?: string, sortOrder?: 'asc' | 'desc'): Promise<Quote[]>;
  
  // Approval code methods
  createApprovalCode(approvalCode: InsertApprovalCode): Promise<ApprovalCode>;
  validateApprovalCode(code: string, email: string): Promise<boolean>;
  markApprovalCodeUsed(code: string, email: string): Promise<void>;
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

  async archiveQuote(id: number): Promise<Quote> {
    const [quote] = await db
      .update(quotes)
      .set({ archived: true, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return quote;
  }

  async getQuotesByEmail(email: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(
      and(eq(quotes.contactEmail, email), eq(quotes.archived, false))
    );
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(
      and(eq(quotes.id, id), eq(quotes.archived, false))
    );
    return quote || undefined;
  }

  async getAllQuotes(search?: string, sortField?: string, sortOrder?: 'asc' | 'desc'): Promise<Quote[]> {
    const archivedFilter = eq(quotes.archived, false);
    
    if (search && sortField && sortOrder) {
      const orderColumn = sortField === 'contactEmail' ? quotes.contactEmail :
                         sortField === 'updatedAt' ? quotes.updatedAt :
                         sortField === 'monthlyFee' ? quotes.monthlyFee :
                         sortField === 'setupFee' ? quotes.setupFee :
                         quotes.updatedAt;
      
      return await db.select().from(quotes)
        .where(and(sql`${quotes.contactEmail} ILIKE ${`%${search}%`}`, archivedFilter))
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));
    } else if (search) {
      return await db.select().from(quotes)
        .where(and(sql`${quotes.contactEmail} ILIKE ${`%${search}%`}`, archivedFilter))
        .orderBy(desc(quotes.updatedAt));
    } else if (sortField && sortOrder) {
      const orderColumn = sortField === 'contactEmail' ? quotes.contactEmail :
                         sortField === 'updatedAt' ? quotes.updatedAt :
                         sortField === 'monthlyFee' ? quotes.monthlyFee :
                         sortField === 'setupFee' ? quotes.setupFee :
                         quotes.updatedAt;
      
      return await db.select().from(quotes)
        .where(archivedFilter)
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));
    } else {
      return await db.select().from(quotes)
        .where(archivedFilter)
        .orderBy(desc(quotes.updatedAt));
    }
  }

  async createApprovalCode(insertApprovalCode: InsertApprovalCode): Promise<ApprovalCode> {
    const [approvalCode] = await db
      .insert(approvalCodes)
      .values(insertApprovalCode)
      .returning();
    return approvalCode;
  }

  async validateApprovalCode(code: string, email: string): Promise<boolean> {
    const [approvalCode] = await db.select().from(approvalCodes).where(
      and(
        eq(approvalCodes.code, code),
        eq(approvalCodes.contactEmail, email),
        eq(approvalCodes.used, false),
        sql`${approvalCodes.expiresAt} > NOW()`
      )
    );
    return !!approvalCode;
  }

  async markApprovalCodeUsed(code: string, email: string): Promise<void> {
    await db
      .update(approvalCodes)
      .set({ used: true })
      .where(
        and(
          eq(approvalCodes.code, code),
          eq(approvalCodes.contactEmail, email)
        )
      );
  }
}

export const storage = new DatabaseStorage();
