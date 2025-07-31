import { 
  users, quotes, approvalCodes, kbCategories, kbArticles, kbBookmarks, kbSearchHistory,
  type User, type InsertUser, type Quote, type InsertQuote, type ApprovalCode, type InsertApprovalCode, 
  type KbCategory, type InsertKbCategory, type KbArticle, type InsertKbArticle, type KbBookmark, type InsertKbBookmark,
  type KbSearchHistory, type InsertKbSearchHistory, updateQuoteSchema, type UpdateProfile 
} from "@shared/schema";
import { db } from "./db";
import { safeDbQuery } from "./db-utils";
import { eq, like, desc, asc, sql, and } from "drizzle-orm";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import * as connectRedisModule from "connect-redis";
import { redis } from "./redis";

const connectRedis = (connectRedisModule as any).default || connectRedisModule;

type UpdateQuote = z.infer<typeof updateQuoteSchema>;

export interface IStorage {
  sessionStore: session.Store;
  
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserRole(userId: number, role: string, assignedBy: number): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: number, profile: UpdateProfile): Promise<User>;
  updateUserHubSpotData(userId: number, hubspotData: Partial<User>): Promise<User>;
  updateUserFirebaseUid(userId: number, firebaseUid: string, authProvider: string, profilePhoto: string | null): Promise<void>;
  updateUserGoogleId(userId: number, googleId: string, authProvider: string, profilePhoto: string | null): Promise<void>;
  
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

  // Knowledge Base methods
  // Categories
  getKbCategories(): Promise<KbCategory[]>;
  createKbCategory(category: InsertKbCategory): Promise<KbCategory>;
  updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory>;
  deleteKbCategory(id: number): Promise<void>;
  
  // Articles
  getKbArticles(categoryId?: number, status?: string, featured?: boolean): Promise<KbArticle[]>;
  getKbArticle(id: number): Promise<KbArticle | undefined>;
  getKbArticleBySlug(slug: string): Promise<KbArticle | undefined>;
  createKbArticle(article: InsertKbArticle): Promise<KbArticle>;
  updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle>;
  deleteKbArticle(id: number): Promise<void>;
  incrementArticleViews(id: number): Promise<void>;
  
  // Search
  searchKbArticles(query: string, userId?: number): Promise<KbArticle[]>;
  recordKbSearch(search: InsertKbSearchHistory): Promise<KbSearchHistory>;
  
  // Bookmarks
  getUserKbBookmarks(userId: number): Promise<KbBookmark[]>;
  createKbBookmark(bookmark: InsertKbBookmark): Promise<KbBookmark>;
  deleteKbBookmark(userId: number, articleId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Use Redis for sessions if available, otherwise fall back to memory store
    if (process.env.REDIS_URL && redis.sessionRedis) {
      try {
        const RedisStore = connectRedis(session);
        this.sessionStore = new RedisStore({
          client: redis.sessionRedis,
          prefix: 'sess:',
          ttl: 24 * 60 * 60, // 24 hours
          disableTouch: false,
        });
        console.log('Using Redis for session storage');
      } catch (error) {
        console.error('Failed to initialize Redis session store:', error);
        this.initMemoryStore();
      }
    } else {
      this.initMemoryStore();
    }
  }

  private initMemoryStore() {
    const MemStore = MemoryStore(session);
    this.sessionStore = new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    console.log('Using in-memory session storage (development only)');
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

  async updateUserRole(userId: number, role: string, assignedBy: number): Promise<User> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .update(users)
        .set({ 
          role,
          roleAssignedBy: assignedBy,
          roleAssignedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!user) {
        throw new Error(`User with ID ${userId} not found or could not be updated`);
      }
      
      return user;
    }, 'updateUserRole');
  }

  async getAllUsers(): Promise<User[]> {
    return await safeDbQuery(async () => {
      return await db.select().from(users).orderBy(asc(users.email));
    }, 'getAllUsers');
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
      return user || undefined;
    }, 'getUserByFirebaseUid');
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
      return user || undefined;
    }, 'getUserByGoogleId');
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

  async updateUserProfile(userId: number, profile: UpdateProfile): Promise<User> {
    return await safeDbQuery(async () => {
      // Properly type the update data
      const updateData: any = {
        updatedAt: new Date()
      };

      if (profile.firstName !== undefined) updateData.firstName = profile.firstName;
      if (profile.lastName !== undefined) updateData.lastName = profile.lastName;
      if (profile.phoneNumber !== undefined) updateData.phoneNumber = profile.phoneNumber;
      if (profile.profilePhoto !== undefined) updateData.profilePhoto = profile.profilePhoto;
      if (profile.address !== undefined) updateData.address = profile.address;
      if (profile.city !== undefined) updateData.city = profile.city;
      if (profile.state !== undefined) updateData.state = profile.state;
      if (profile.zipCode !== undefined) updateData.zipCode = profile.zipCode;
      if (profile.country !== undefined) updateData.country = profile.country;
      if (profile.lastHubspotSync !== undefined) updateData.lastHubspotSync = new Date(profile.lastHubspotSync);
      
      // Update weather timestamp if location changed
      if (profile.address || profile.city || profile.state) {
        updateData.lastWeatherUpdate = new Date();
      }

      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      if (!user) {
        throw new Error(`User with ID ${userId} not found or could not be updated`);
      }
      
      return user;
    }, 'updateUserProfile');
  }

  async updateUserHubSpotData(userId: number, hubspotData: Partial<User>): Promise<User> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .update(users)
        .set({ 
          ...hubspotData, 
          lastHubspotSync: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!user) {
        throw new Error(`User with ID ${userId} not found or could not be updated`);
      }
      
      return user;
    }, 'updateUserHubSpotData');
  }

  async updateUserFirebaseUid(userId: number, firebaseUid: string, authProvider: string, profilePhoto: string | null): Promise<void> {
    return await safeDbQuery(async () => {
      await db
        .update(users)
        .set({ 
          firebaseUid,
          authProvider,
          profilePhoto: profilePhoto || undefined,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }, 'updateUserFirebaseUid');
  }

  async updateUserGoogleId(userId: number, googleId: string, authProvider: string, profilePhoto: string | null): Promise<void> {
    return await safeDbQuery(async () => {
      await db
        .update(users)
        .set({ 
          googleId,
          authProvider,
          profilePhoto: profilePhoto || undefined,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }, 'updateUserGoogleId');
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

  // Knowledge Base Categories
  async getKbCategories(): Promise<KbCategory[]> {
    return await safeDbQuery(async () => {
      return await db.select().from(kbCategories)
        .where(eq(kbCategories.isActive, true))
        .orderBy(asc(kbCategories.sortOrder), asc(kbCategories.name));
    }, 'getKbCategories');
  }

  async createKbCategory(insertCategory: InsertKbCategory): Promise<KbCategory> {
    return await safeDbQuery(async () => {
      const [category] = await db
        .insert(kbCategories)
        .values(insertCategory)
        .returning();
      
      if (!category) {
        throw new Error('Failed to create category');
      }
      
      return category;
    }, 'createKbCategory');
  }

  async updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory> {
    return await safeDbQuery(async () => {
      const [updatedCategory] = await db
        .update(kbCategories)
        .set({ ...category, updatedAt: new Date() })
        .where(eq(kbCategories.id, id))
        .returning();
      
      if (!updatedCategory) {
        throw new Error(`Category with ID ${id} not found`);
      }
      
      return updatedCategory;
    }, 'updateKbCategory');
  }

  async deleteKbCategory(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db.update(kbCategories)
        .set({ isActive: false })
        .where(eq(kbCategories.id, id));
    }, 'deleteKbCategory');
  }

  // Knowledge Base Articles
  async getKbArticles(categoryId?: number, status?: string, featured?: boolean, title?: string): Promise<KbArticle[]> {
    return await safeDbQuery(async () => {
      const conditions = [];
      
      if (categoryId) conditions.push(eq(kbArticles.categoryId, categoryId));
      if (status) conditions.push(eq(kbArticles.status, status));
      if (featured !== undefined) conditions.push(eq(kbArticles.featured, featured));
      if (title) conditions.push(eq(kbArticles.title, title));
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      return await db.select().from(kbArticles)
        .where(whereClause)
        .orderBy(desc(kbArticles.featured), desc(kbArticles.updatedAt));
    }, 'getKbArticles');
  }

  async getKbArticle(id: number): Promise<KbArticle | undefined> {
    return await safeDbQuery(async () => {
      const [article] = await db.select().from(kbArticles)
        .where(eq(kbArticles.id, id));
      return article || undefined;
    }, 'getKbArticle');
  }

  async getKbArticleBySlug(slug: string): Promise<KbArticle | undefined> {
    return await safeDbQuery(async () => {
      const [article] = await db.select().from(kbArticles)
        .where(eq(kbArticles.slug, slug));
      return article || undefined;
    }, 'getKbArticleBySlug');
  }

  async createKbArticle(insertArticle: InsertKbArticle): Promise<KbArticle> {
    return await safeDbQuery(async () => {
      const [article] = await db
        .insert(kbArticles)
        .values(insertArticle)
        .returning();
      
      if (!article) {
        throw new Error('Failed to create article');
      }
      
      return article;
    }, 'createKbArticle');
  }

  async updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle> {
    return await safeDbQuery(async () => {
      const [updatedArticle] = await db
        .update(kbArticles)
        .set({ ...article, updatedAt: new Date() })
        .where(eq(kbArticles.id, id))
        .returning();
      
      if (!updatedArticle) {
        throw new Error(`Article with ID ${id} not found`);
      }
      
      return updatedArticle;
    }, 'updateKbArticle');
  }

  async deleteKbArticle(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db.delete(kbArticles)
        .where(eq(kbArticles.id, id));
    }, 'deleteKbArticle');
  }

  async archiveKbArticle(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db.update(kbArticles)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(kbArticles.id, id));
    }, 'archiveKbArticle');
  }

  async undeleteKbArticle(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db.update(kbArticles)
        .set({ status: 'draft', updatedAt: new Date() })
        .where(eq(kbArticles.id, id));
    }, 'undeleteKbArticle');
  }

  async incrementArticleViews(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db.update(kbArticles)
        .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
        .where(eq(kbArticles.id, id));
    }, 'incrementArticleViews');
  }

  // Search
  async searchKbArticles(query: string, userId?: number): Promise<KbArticle[]> {
    return await safeDbQuery(async () => {
      const searchResults = await db.select().from(kbArticles)
        .where(
          and(
            eq(kbArticles.status, 'published'),
            sql`(
              ${kbArticles.title} ILIKE ${`%${query}%`} OR 
              ${kbArticles.content} ILIKE ${`%${query}%`} OR 
              ${kbArticles.excerpt} ILIKE ${`%${query}%`}
            )`
          )
        )
        .orderBy(desc(kbArticles.featured), desc(kbArticles.viewCount));
      
      return searchResults;
    }, 'searchKbArticles');
  }

  async recordKbSearch(insertSearch: InsertKbSearchHistory): Promise<KbSearchHistory> {
    return await safeDbQuery(async () => {
      const [search] = await db
        .insert(kbSearchHistory)
        .values(insertSearch)
        .returning();
      
      if (!search) {
        throw new Error('Failed to record search');
      }
      
      return search;
    }, 'recordKbSearch');
  }

  // Bookmarks
  async getUserKbBookmarks(userId: number): Promise<KbBookmark[]> {
    return await safeDbQuery(async () => {
      return await db.select().from(kbBookmarks)
        .where(eq(kbBookmarks.userId, userId))
        .orderBy(desc(kbBookmarks.createdAt));
    }, 'getUserKbBookmarks');
  }

  async createKbBookmark(insertBookmark: InsertKbBookmark): Promise<KbBookmark> {
    return await safeDbQuery(async () => {
      const [bookmark] = await db
        .insert(kbBookmarks)
        .values(insertBookmark)
        .returning();
      
      if (!bookmark) {
        throw new Error('Failed to create bookmark');
      }
      
      return bookmark;
    }, 'createKbBookmark');
  }

  async deleteKbBookmark(userId: number, articleId: number): Promise<void> {
    await safeDbQuery(async () => {
      await db.delete(kbBookmarks)
        .where(
          and(
            eq(kbBookmarks.userId, userId),
            eq(kbBookmarks.articleId, articleId)
          )
        );
    }, 'deleteKbBookmark');
  }
}

export const storage = new DatabaseStorage();
