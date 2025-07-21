import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema, updateQuoteSchema } from "@shared/schema";
import { z } from "zod";
import { sendCleanupOverrideNotification } from "./slack";
import { hubSpotService } from "./hubspot";
import { setupAuth, requireAuth } from "./auth";

// Pricing calculation constants (copied from frontend)
const baseMonthlyFee = 150;

const revenueMultipliers = {
  '<$10K': 1.0,
  '10K-25K': 1.0,
  '25K-75K': 2.2,
  '75K-250K': 3.5,
  '250K-1M': 5.0,
  '1M+': 7.0
};

const txSurcharge = {
  '<100': 0,
  '100-300': 100,
  '300-600': 500,
  '600-1000': 800,
  '1000-2000': 1200,
  '2000+': 1600
};

const industryMultipliers = {
  'Software/SaaS': { monthly: 1.0, cleanup: 1.0 },
  'Professional Services': { monthly: 1.0, cleanup: 1.1 },
  'Consulting': { monthly: 1.0, cleanup: 1.05 },
  'Healthcare/Medical': { monthly: 1.4, cleanup: 1.3 },
  'Real Estate': { monthly: 1.25, cleanup: 1.05 },
  'Property Management': { monthly: 1.3, cleanup: 1.2 },
  'E-commerce/Retail': { monthly: 1.35, cleanup: 1.15 },
  'Restaurant/Food Service': { monthly: 1.6, cleanup: 1.4 },
  'Construction/Trades': { monthly: 1.5, cleanup: 1.08 },
  'Manufacturing': { monthly: 1.45, cleanup: 1.25 },
  'Transportation/Logistics': { monthly: 1.4, cleanup: 1.2 },
  'Nonprofit': { monthly: 1.2, cleanup: 1.15 },
  'Law Firm': { monthly: 1.3, cleanup: 1.35 },
  'Accounting/Finance': { monthly: 1.1, cleanup: 1.1 },
  'Marketing/Advertising': { monthly: 1.15, cleanup: 1.1 },
  'Insurance': { monthly: 1.35, cleanup: 1.25 },
  'Automotive': { monthly: 1.4, cleanup: 1.2 },
  'Education': { monthly: 1.25, cleanup: 1.2 },
  'Fitness/Wellness': { monthly: 1.3, cleanup: 1.15 },
  'Entertainment/Events': { monthly: 1.5, cleanup: 1.3 },
  'Agriculture': { monthly: 1.45, cleanup: 1.2 },
  'Technology/IT Services': { monthly: 1.1, cleanup: 1.05 },
  'Multi-entity/Holding Companies': { monthly: 1.35, cleanup: 1.25 },
  'Other': { monthly: 1.2, cleanup: 1.15 }
};

function roundToNearest25(num: number): number {
  return Math.ceil(num / 25) * 25;
}

function calculateQuoteFees(data: any) {
  if (!data.revenueBand || !data.monthlyTransactions || !data.industry || data.cleanupMonths === undefined) {
    return { monthlyFee: 0, setupFee: 0 };
  }
  
  // If cleanup months is 0, cleanup complexity is not required
  if (data.cleanupMonths > 0 && !data.cleanupComplexity) {
    return { monthlyFee: 0, setupFee: 0 };
  }

  const revenueMultiplier = revenueMultipliers[data.revenueBand as keyof typeof revenueMultipliers] || 1.0;
  const txFee = txSurcharge[data.monthlyTransactions as keyof typeof txSurcharge] || 0;
  const industryData = industryMultipliers[data.industry as keyof typeof industryMultipliers] || { monthly: 1, cleanup: 1 };
  
  // Dynamic calculation: base fee * revenue multiplier + transaction surcharge, then apply industry multiplier
  const monthlyFee = Math.round((baseMonthlyFee * revenueMultiplier + txFee) * industryData.monthly);
  
  // Use the actual cleanup months value (override just allows values below normal minimum)
  const effectiveCleanupMonths = data.cleanupMonths;
  
  // If no cleanup months, setup fee is $0, but monthly fee remains normal
  let setupFee = 0;
  if (effectiveCleanupMonths > 0) {
    const cleanupMultiplier = parseFloat(data.cleanupComplexity || "0.75") * industryData.cleanup;
    setupFee = roundToNearest25(Math.max(monthlyFee, monthlyFee * cleanupMultiplier * effectiveCleanupMonths));
  }
  
  return { monthlyFee, setupFee };
}

// Helper function to generate 4-digit approval codes
function generateApprovalCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  setupAuth(app);

  // Create a new quote (protected)
  app.post("/api/quotes", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const quoteData = insertQuoteSchema.parse({ ...req.body, ownerId: req.user.id });
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

  // Get all quotes with optional search and sort (protected)
  app.get("/api/quotes", requireAuth, async (req, res) => {
    try {
      const email = req.query.email as string;
      const search = req.query.search as string;
      const sortField = req.query.sortField as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (email) {
        // Get quotes by specific email (filtered by owner)
        const quotes = await storage.getQuotesByEmail(email);
        // Filter by owner
        const userQuotes = quotes.filter(quote => quote.ownerId === req.user!.id);
        res.json(userQuotes);
      } else {
        // Get all quotes for the authenticated user
        const quotes = await storage.getAllQuotes(req.user.id, search, sortField, sortOrder);
        res.json(quotes);
      }
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ message: "Failed to fetch quotes", error: error.message });
    }
  });

  // Update a quote (protected)
  app.put("/api/quotes/:id", requireAuth, async (req, res) => {
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

  // Archive a quote (protected)
  app.patch("/api/quotes/:id/archive", requireAuth, async (req, res) => {
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

  // Get a specific quote (protected)
  app.get("/api/quotes/:id", requireAuth, async (req, res) => {
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

      // Send Slack notification with approval code including custom override reason
      try {
        console.log('Sending Slack notification with data:', {
          overrideReason: quoteData.overrideReason,
          customOverrideReason: quoteData.customOverrideReason
        });
        
        await sendCleanupOverrideNotification({
          ...quoteData,
          approvalCode,
          customOverrideReason: quoteData.customOverrideReason
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

  // Check for existing quotes by email
  app.post("/api/quotes/check-existing", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }

      const existingQuotes = await storage.getQuotesByEmail(email);
      
      res.json({ 
        hasExistingQuotes: existingQuotes.length > 0,
        count: existingQuotes.length,
        quotes: existingQuotes
      });
    } catch (error) {
      console.error('Error checking existing quotes:', error);
      res.status(500).json({ message: "Failed to check existing quotes" });
    }
  });

  // HubSpot integration endpoints
  
  // Verify contact email in HubSpot
  app.post("/api/hubspot/verify-contact", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }

      if (!hubSpotService) {
        res.json({ verified: false, error: "HubSpot integration not configured" });
        return;
      }

      const result = await hubSpotService.verifyContactByEmail(email);
      res.json(result);
    } catch (error) {
      console.error('Error verifying contact:', error);
      res.status(500).json({ message: "Failed to verify contact" });
    }
  });

  // Push quote to HubSpot (create deal and quote)
  app.post("/api/hubspot/push-quote", async (req, res) => {
    try {
      const { quoteId } = req.body;
      
      if (!quoteId) {
        res.status(400).json({ message: "Quote ID is required" });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      if (!hubSpotService) {
        res.status(400).json({ message: "HubSpot integration not configured" });
        return;
      }

      // Get the quote from database
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        res.status(404).json({ message: "Quote not found" });
        return;
      }

      // First verify the contact exists
      const contactResult = await hubSpotService.verifyContactByEmail(quote.contactEmail);
      if (!contactResult.verified || !contactResult.contact) {
        res.status(400).json({ message: "Contact not found in HubSpot. Please ensure the contact exists before pushing to HubSpot." });
        return;
      }

      const contact = contactResult.contact;
      const companyName = contact.properties.company || quote.companyName || 'Unknown Company';

      // Get the HubSpot owner ID for the user
      const ownerId = await hubSpotService.getOwnerByEmail(req.user!.email);

      // Create deal in HubSpot
      const deal = await hubSpotService.createDeal(
        contact.id,
        companyName,
        parseFloat(quote.monthlyFee),
        parseFloat(quote.setupFee),
        ownerId || undefined
      );

      if (!deal) {
        res.status(500).json({ message: "Failed to create deal in HubSpot" });
        return;
      }

      // Create quote/note in HubSpot
      const hubspotQuote = await hubSpotService.createQuote(
        deal.id,
        companyName,
        parseFloat(quote.monthlyFee),
        parseFloat(quote.setupFee),
        req.user!.email,
        req.user!.firstName || '',
        req.user!.lastName || ''
      );

      if (!hubspotQuote) {
        res.status(500).json({ message: "Failed to create quote in HubSpot" });
        return;
      }

      // Update the quote in our database with HubSpot IDs
      const updatedQuote = await storage.updateQuote({
        id: quoteId,
        hubspotContactId: contact.id,
        hubspotDealId: deal.id,
        hubspotQuoteId: hubspotQuote.id,
        hubspotContactVerified: true,
        companyName: companyName
      });

      res.json({
        success: true,
        hubspotDealId: deal.id,
        hubspotQuoteId: hubspotQuote.id,
        dealName: deal.properties.dealname,
        message: "Successfully pushed to HubSpot"
      });
    } catch (error) {
      console.error('Error pushing to HubSpot:', error);
      res.status(500).json({ message: "Failed to push quote to HubSpot" });
    }
  });

  // Update existing HubSpot quote
  app.post("/api/hubspot/update-quote", async (req, res) => {
    try {
      const { quoteId, currentFormData } = req.body;
      
      if (!quoteId) {
        res.status(400).json({ message: "Quote ID is required" });
        return;
      }

      if (!hubSpotService) {
        res.status(400).json({ message: "HubSpot integration not configured" });
        return;
      }

      // Get the quote from database
      const quote = await storage.getQuote(quoteId);
      if (!quote || !quote.hubspotQuoteId) {
        res.status(404).json({ message: "Quote not found or not linked to HubSpot" });
        return;
      }

      const companyName = quote.companyName || 'Unknown Company';
      
      // If current form data is provided, recalculate fees and update database
      let monthlyFee = parseFloat(quote.monthlyFee);
      let setupFee = parseFloat(quote.setupFee);
      
      if (currentFormData) {
        // Recalculate fees using current form data (same logic as in pricing calculation)
        const fees = calculateQuoteFees(currentFormData);
        monthlyFee = fees.monthlyFee;
        setupFee = fees.setupFee;
        console.log(`Recalculated fees for update - Monthly: $${monthlyFee}, Setup: $${setupFee}`);
        
        // Update the quote in our database with current form data and recalculated fees
        const updateData = {
          id: quoteId,
          ...currentFormData,
          monthlyFee: monthlyFee.toString(),
          setupFee: setupFee.toString()
        };
        
        await storage.updateQuote(updateData);
        console.log(`Updated quote ${quoteId} in database with new form data and fees`);
      }

      // Update quote in HubSpot
      const success = await hubSpotService.updateQuote(
        quote.hubspotQuoteId,
        companyName,
        monthlyFee,
        setupFee
      );

      if (success) {
        res.json({
          success: true,
          message: "Successfully updated quote in HubSpot"
        });
      } else {
        // Quote is no longer active, create a new one
        res.json({
          success: false,
          needsNewQuote: true,
          message: "Quote is no longer active in HubSpot. A new quote will need to be created."
        });
      }
    } catch (error) {
      console.error('Error updating HubSpot quote:', error);
      res.status(500).json({ message: "Failed to update quote in HubSpot" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
