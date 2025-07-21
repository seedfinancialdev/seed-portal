import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema, updateQuoteSchema } from "@shared/schema";
import { z } from "zod";
import { sendCleanupOverrideNotification } from "./slack";

// Helper function to generate 4-digit approval codes
function generateApprovalCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new quote
  app.post("/api/quotes", async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(quoteData);
      
      // Note: Slack notifications now only sent during approval request, not quote creation
      
      res.json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create quote" });
      }
    }
  });

  // Get all quotes with optional search and sort
  app.get("/api/quotes", async (req, res) => {
    try {
      const email = req.query.email as string;
      const search = req.query.search as string;
      const sortField = req.query.sortField as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      
      if (email) {
        // Get quotes by specific email
        const quotes = await storage.getQuotesByEmail(email);
        res.json(quotes);
      } else {
        // Get all quotes with search and sort
        const quotes = await storage.getAllQuotes(search, sortField, sortOrder);
        res.json(quotes);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Update a quote
  app.put("/api/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid quote ID" });
        return;
      }
      
      const quoteData = updateQuoteSchema.parse({ ...req.body, id });
      const quote = await storage.updateQuote(quoteData);
      res.json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update quote" });
      }
    }
  });

  // Archive a quote
  app.patch("/api/quotes/:id/archive", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid quote ID" });
        return;
      }
      
      const quote = await storage.archiveQuote(id);
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to archive quote" });
    }
  });

  // Get a specific quote
  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid quote ID" });
        return;
      }
      
      const quote = await storage.getQuote(id);
      if (!quote) {
        res.status(404).json({ message: "Quote not found" });
        return;
      }
      
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Request approval code for cleanup override
  app.post("/api/approval/request", async (req, res) => {
    try {
      const { contactEmail, quoteData } = req.body;
      
      if (!contactEmail || !quoteData) {
        res.status(400).json({ message: "Contact email and quote data are required" });
        return;
      }

      // Generate a 4-digit approval code
      const approvalCode = generateApprovalCode();
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Store the approval code
      await storage.createApprovalCode({
        code: approvalCode,
        contactEmail,
        used: false,
        expiresAt
      });

      // Send Slack notification with approval code
      try {
        await sendCleanupOverrideNotification({
          ...quoteData,
          approvalCode
        });
      } catch (slackError) {
        console.error('Failed to send Slack notification:', slackError);
      }

      res.json({ message: "Approval request sent. Check Slack for approval code." });
    } catch (error) {
      console.error('Error requesting approval:', error);
      res.status(500).json({ message: "Failed to request approval" });
    }
  });

  // Validate approval code
  app.post("/api/approval/validate", async (req, res) => {
    try {
      const { code, contactEmail } = req.body;
      
      if (!code || !contactEmail) {
        res.status(400).json({ message: "Code and contact email are required" });
        return;
      }

      const isValid = await storage.validateApprovalCode(code, contactEmail);
      
      if (isValid) {
        // Mark the code as used
        await storage.markApprovalCodeUsed(code, contactEmail);
        res.json({ valid: true });
      } else {
        res.json({ valid: false, message: "Invalid or expired approval code" });
      }
    } catch (error) {
      console.error('Error validating approval code:', error);
      res.status(500).json({ message: "Failed to validate approval code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
