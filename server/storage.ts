import { users, quotes, approvalCodes, type User, type InsertUser, type Quote, type InsertQuote, type ApprovalCode, type InsertApprovalCode, updateQuoteSchema } from "@shared/schema";
import { db } from "./db";
import { eq, like, desc, asc, sql, and } from "drizzle-orm";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

type UpdateQuote = z.infer<typeof updateQuoteSchema>;

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quote methods - now filtered by owner
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(quote: UpdateQuote): Promise<Quote>;
  archiveQuote(id: number): Promise<Quote>;
  getQuotesByEmail(email: string): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  getAllQuotes(ownerId: number, search?: string, sortField?: string, sortOrder?: 'asc' | 'desc'): Promise<Quote[]>;
  getQuotesByOwner(ownerId: number): Promise<Quote[]>;
  
  // Approval code methods
  createApprovalCode(approvalCode: InsertApprovalCode): Promise<ApprovalCode>;
  validateApprovalCode(code: string, email: string): Promise<boolean>;
  markApprovalCodeUsed(code: string, email: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
    try {
      const [quote] = await db
        .update(quotes)
        .set({ ...updateQuote, updatedAt: new Date() })
        .where(eq(quotes.id, updateQuote.id))
        .returning();
      
      if (!quote) {
        throw new Error(`Quote with ID ${updateQuote.id} not found or could not be updated`);
      }
      
      return quote;
    } catch (error: any) {
      console.error('Error updating quote:', error);
      throw error;
    }
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

  async getAllQuotes(ownerId: number, search?: string, sortField?: string, sortOrder?: 'asc' | 'desc'): Promise<Quote[]> {
    const ownerFilter = eq(quotes.ownerId, ownerId);
    const archivedFilter = eq(quotes.archived, false);
    const baseFilter = and(ownerFilter, archivedFilter);
    
    if (search && sortField && sortOrder) {
      const orderColumn = sortField === 'contactEmail' ? quotes.contactEmail :
                         sortField === 'updatedAt' ? quotes.updatedAt :
                         sortField === 'monthlyFee' ? quotes.monthlyFee :
                         sortField === 'setupFee' ? quotes.setupFee :
                         quotes.updatedAt;
      
      return await db.select().from(quotes)
        .where(and(sql`${quotes.contactEmail} ILIKE ${`%${search}%`}`, baseFilter))
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));
    } else if (search) {
      return await db.select().from(quotes)
        .where(and(sql`${quotes.contactEmail} ILIKE ${`%${search}%`}`, baseFilter))
        .orderBy(desc(quotes.updatedAt));
    } else if (sortField && sortOrder) {
      const orderColumn = sortField === 'contactEmail' ? quotes.contactEmail :
                         sortField === 'updatedAt' ? quotes.updatedAt :
                         sortField === 'monthlyFee' ? quotes.monthlyFee :
                         sortField === 'setupFee' ? quotes.setupFee :
                         quotes.updatedAt;
      
      return await db.select().from(quotes)
        .where(baseFilter)
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));
    } else {
      return await db.select().from(quotes)
        .where(baseFilter)
        .orderBy(desc(quotes.updatedAt));
    }
  }

  async getQuotesByOwner(ownerId: number): Promise<Quote[]> {
    return await db.select().from(quotes).where(
      and(eq(quotes.ownerId, ownerId), eq(quotes.archived, false))
    );
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
