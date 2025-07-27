import { users, quotes, approvalCodes, type User, type InsertUser, type Quote, type InsertQuote, type ApprovalCode, type InsertApprovalCode, updateQuoteSchema } from "@shared/schema";
import { db } from "./db";
import { safeDbQuery } from "./db-utils";
import { eq, like, desc, asc, sql, and } from "drizzle-orm";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

type UpdateQuote = z.infer<typeof updateQuoteSchema>;

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
    // Use memory store for sessions to avoid database connection complexity
    const MemStore = MemoryStore(session);
    this.sessionStore = new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    }, 'getUser');
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    }, 'getUserByEmail');
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      
      if (!user) {
        throw new Error('Failed to create user');
      }
      
      return user;
    }, 'createUser');
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    return await safeDbQuery(async () => {
      const [quote] = await db
        .insert(quotes)
        .values(insertQuote)
        .returning();
      return quote;
    }, 'createQuote');
  }

  async updateQuote(updateQuote: UpdateQuote): Promise<Quote> {
    return await safeDbQuery(async () => {
      const [quote] = await db
        .update(quotes)
        .set({ ...updateQuote, updatedAt: new Date() })
        .where(eq(quotes.id, updateQuote.id))
        .returning();
      
      if (!quote) {
        throw new Error(`Quote with ID ${updateQuote.id} not found or could not be updated`);
      }
      
      return quote;
    }, 'updateQuote');
  }

  async archiveQuote(id: number): Promise<Quote> {
    return await safeDbQuery(async () => {
      const [quote] = await db
        .update(quotes)
        .set({ archived: true, updatedAt: new Date() })
        .where(eq(quotes.id, id))
        .returning();
      
      if (!quote) {
        throw new Error(`Quote with ID ${id} not found or could not be archived`);
      }
      
      return quote;
    }, 'archiveQuote');
  }

  async getQuotesByEmail(email: string): Promise<Quote[]> {
    return await safeDbQuery(async () => {
      return await db.select().from(quotes).where(
        and(eq(quotes.contactEmail, email), eq(quotes.archived, false))
      );
    }, 'getQuotesByEmail');
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    return await safeDbQuery(async () => {
      const [quote] = await db.select().from(quotes).where(
        and(eq(quotes.id, id), eq(quotes.archived, false))
      );
      return quote || undefined;
    }, 'getQuote');
  }

  async getAllQuotes(ownerId: number, search?: string, sortField?: string, sortOrder?: 'asc' | 'desc'): Promise<Quote[]> {
    return await safeDbQuery(async () => {
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
    }, 'getAllQuotes');
  }

  async getQuotesByOwner(ownerId: number): Promise<Quote[]> {
    return await safeDbQuery(async () => {
      return await db.select().from(quotes).where(
        and(eq(quotes.ownerId, ownerId), eq(quotes.archived, false))
      );
    }, 'getQuotesByOwner');
  }

  async createApprovalCode(insertApprovalCode: InsertApprovalCode): Promise<ApprovalCode> {
    return await safeDbQuery(async () => {
      const [approvalCode] = await db
        .insert(approvalCodes)
        .values(insertApprovalCode)
        .returning();
      
      if (!approvalCode) {
        throw new Error('Failed to create approval code');
      }
      
      return approvalCode;
    }, 'createApprovalCode');
  }

  async validateApprovalCode(code: string, email: string): Promise<boolean> {
    return await safeDbQuery(async () => {
      const [approvalCode] = await db.select().from(approvalCodes).where(
        and(
          eq(approvalCodes.code, code),
          eq(approvalCodes.contactEmail, email),
          eq(approvalCodes.used, false),
          sql`${approvalCodes.expiresAt} > NOW()`
        )
      );
      return !!approvalCode;
    }, 'validateApprovalCode');
  }

  async markApprovalCodeUsed(code: string, email: string): Promise<void> {
    await safeDbQuery(async () => {
      const result = await db
        .update(approvalCodes)
        .set({ used: true })
        .where(
          and(
            eq(approvalCodes.code, code),
            eq(approvalCodes.contactEmail, email)
          )
        );
      
      // Note: Drizzle doesn't return affected rows count easily, so we trust the operation
      return result;
    }, 'markApprovalCodeUsed');
  }
}

export const storage = new DatabaseStorage();
