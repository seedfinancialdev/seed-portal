import { users, quotes, type User, type InsertUser, type Quote, type InsertQuote } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quote methods
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuotesByEmail(email: string): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private quotes: Map<number, Quote>;
  private userCurrentId: number;
  private quoteCurrentId: number;

  constructor() {
    this.users = new Map();
    this.quotes = new Map();
    this.userCurrentId = 1;
    this.quoteCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const id = this.quoteCurrentId++;
    const quote: Quote = { 
      ...insertQuote, 
      id,
      createdAt: new Date()
    };
    this.quotes.set(id, quote);
    return quote;
  }

  async getQuotesByEmail(email: string): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(
      (quote) => quote.contactEmail === email
    );
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }
}

export const storage = new MemStorage();
