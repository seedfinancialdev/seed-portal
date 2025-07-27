import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema, updateQuoteSchema } from "@shared/schema";
import { z } from "zod";
import { sendCleanupOverrideNotification } from "./slack";
import { hubSpotService } from "./hubspot";
import { setupAuth, requireAuth } from "./auth";
import { calculateCombinedFees } from "@shared/pricing";
import { clientIntelEngine } from "./client-intel";

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
      
      // Extract service flags with defaults
      const includesBookkeeping = req.body.includesBookkeeping !== false; // Default to true
      const includesTaas = req.body.includesTaas === true;
      
      // Trust the frontend calculations - the frontend has the authoritative calculation logic
      // The frontend already calculated and sent the correct fees, so we should use them
      const requestDataWithFees = {
        ...req.body,
        ownerId: req.user.id,
        // Use the frontend-calculated values directly
        monthlyFee: req.body.monthlyFee || "0",
        setupFee: req.body.setupFee || "0", 
        taasMonthlyFee: req.body.taasMonthlyFee || "0",
        taasPriorYearsFee: req.body.taasPriorYearsFee || "0",
        // For TaaS-only quotes, provide defaults for bookkeeping-required fields
        monthlyTransactions: req.body.monthlyTransactions || "N/A",
        cleanupComplexity: req.body.cleanupComplexity || "0",
        cleanupMonths: req.body.cleanupMonths || 0,
      };
      
      const quoteData = insertQuoteSchema.parse(requestDataWithFees);
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
        ownerId || undefined,
        quote.includesBookkeeping,
        quote.includesTaas
      );

      if (!deal) {
        res.status(500).json({ message: "Failed to create deal in HubSpot" });
        return;
      }

      // For combined quotes, calculate individual service fees for separate line items
      // For single service quotes, use the saved quote values to preserve custom overrides
      let bookkeepingMonthlyFee = parseFloat(quote.monthlyFee);
      let bookkeepingSetupFee = parseFloat(quote.setupFee);
      
      if (quote.includesBookkeeping && quote.includesTaas) {
        // Combined quote - need to separate fees
        const pricingData = {
          ...quote,
          numEntities: quote.numEntities || 1,
          statesFiled: quote.statesFiled || 1,
          numBusinessOwners: quote.numBusinessOwners || 1,
          priorYearsUnfiled: quote.priorYearsUnfiled || 0,
          cleanupComplexity: quote.cleanupComplexity || "0",
          internationalFiling: quote.internationalFiling ?? false,
          include1040s: quote.include1040s ?? false,
          alreadyOnSeedBookkeeping: quote.alreadyOnSeedBookkeeping ?? false,
          cleanupOverride: quote.cleanupOverride ?? false,
          entityType: quote.entityType || "LLC",
          bookkeepingQuality: quote.bookkeepingQuality || "Clean (Seed)"
        };
        const fees = calculateCombinedFees(pricingData);
        bookkeepingMonthlyFee = fees.bookkeeping.monthlyFee;
        bookkeepingSetupFee = fees.bookkeeping.setupFee;
      }
      // For single service quotes, keep the saved values to preserve custom setup fees
      
      // Create quote/note in HubSpot
      const hubspotQuote = await hubSpotService.createQuote(
        deal.id,
        companyName,
        parseFloat(quote.monthlyFee),
        parseFloat(quote.setupFee),
        req.user!.email,
        req.user!.firstName || '',
        req.user!.lastName || '',
        quote.includesBookkeeping,
        quote.includesTaas,
        quote.taasMonthlyFee ? parseFloat(quote.taasMonthlyFee) : undefined,
        quote.taasPriorYearsFee ? parseFloat(quote.taasPriorYearsFee) : undefined,
        bookkeepingMonthlyFee,
        bookkeepingSetupFee
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
      
      // If current form data is provided, update database with form data (preserve custom fees)
      let monthlyFee = parseFloat(quote.monthlyFee);
      let setupFee = parseFloat(quote.setupFee);
      let taasMonthlyFee = parseFloat(quote.taasMonthlyFee || "0");
      let taasPriorYearsFee = parseFloat(quote.taasPriorYearsFee || "0");
      
      if (currentFormData) {
        // Use form data values directly to preserve custom overrides
        monthlyFee = parseFloat(currentFormData.monthlyFee || quote.monthlyFee);
        setupFee = parseFloat(currentFormData.setupFee || quote.setupFee);
        taasMonthlyFee = parseFloat(currentFormData.taasMonthlyFee || "0");
        taasPriorYearsFee = parseFloat(currentFormData.taasPriorYearsFee || "0");
        
        console.log(`Using form data fees - Monthly: $${monthlyFee}, Setup: $${setupFee}, TaaS Monthly: $${taasMonthlyFee}, TaaS Setup: $${taasPriorYearsFee}`);
        console.log(`Current form data includes TaaS: ${currentFormData.includesTaas}, TaaS monthly: ${currentFormData.taasMonthlyFee}, TaaS setup: ${currentFormData.taasPriorYearsFee}`);
        
        // Update the quote in our database with current form data (preserve calculated fees)
        const updateData = {
          id: quoteId,
          ...currentFormData,
          monthlyFee: monthlyFee.toString(),
          setupFee: setupFee.toString(),
          taasMonthlyFee: taasMonthlyFee.toString(),
          taasPriorYearsFee: taasPriorYearsFee.toString()
        };
        
        await storage.updateQuote(updateData);
        console.log(`Updated quote ${quoteId} in database with form data`);
      }

      // Use the form data fees directly instead of recalculating
      const updateTaasMonthlyFee = taasMonthlyFee;
      const updateTaasPriorYearsFee = taasPriorYearsFee;
      
      const updateBookkeepingMonthlyFee = monthlyFee - updateTaasMonthlyFee;
      const updateBookkeepingSetupFee = setupFee - updateTaasPriorYearsFee;
      
      console.log(`Calculated individual service fees - Bookkeeping Monthly: $${updateBookkeepingMonthlyFee}, Bookkeeping Setup: $${updateBookkeepingSetupFee}, TaaS Monthly: $${updateTaasMonthlyFee}, TaaS Setup: $${updateTaasPriorYearsFee}`);

      // Update quote in HubSpot with current service configuration
      const currentIncludesBookkeeping = currentFormData?.includesBookkeeping !== false;
      const currentIncludesTaas = currentFormData?.includesTaas === true;
      
      const success = await hubSpotService.updateQuote(
        quote.hubspotQuoteId,
        companyName,
        monthlyFee,
        setupFee,
        currentIncludesBookkeeping,
        currentIncludesTaas,
        updateTaasMonthlyFee,
        updateTaasPriorYearsFee,
        updateBookkeepingMonthlyFee,
        updateBookkeepingSetupFee,
        quote.hubspotDealId || undefined // Pass deal ID for updating deal name and value
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

  // Client Intel API endpoints
  
  // Search for clients/prospects using HubSpot with owner filtering
  app.get("/api/client-intel/search", requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 3) {
        return res.json([]);
      }

      // Get the logged-in user's email for owner filtering
      const userEmail = (req as any).user?.email;
      
      // Search HubSpot contacts with AI enrichment, filtered by owner
      const results = await clientIntelEngine.searchHubSpotContacts(query, userEmail);
      res.json(results);
    } catch (error) {
      console.error('Client search error:', error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Generate AI insights for a client using real data
  app.post("/api/client-intel/generate-insights", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ message: "Client ID is required" });
      }

      // Get client data from HubSpot first
      let clientData: any = {};
      
      try {
        if (hubSpotService) {
          const contact = await hubSpotService.getContactById(clientId);
          if (contact) {
            clientData = {
              companyName: contact.properties.company || 'Unknown Company',
              industry: contact.properties.industry || null,
              revenue: contact.properties.annualrevenue,
              employees: parseInt(contact.properties.numemployees) || undefined,
              lifecycleStage: contact.properties.lifecyclestage || 'lead',
              services: await clientIntelEngine.getContactServices(clientId),
              hubspotProperties: contact.properties,
              lastActivity: contact.properties.lastmodifieddate,
              recentActivities: [] // Would fetch from activities API
            };
          }
        }
      } catch (hubspotError) {
        console.error('HubSpot data fetch failed:', hubspotError);
        // Continue with limited data for analysis
      }

      // Generate AI insights using the intelligence engine
      const [painPoints, serviceGaps, riskScore] = await Promise.all([
        clientIntelEngine.extractPainPoints(clientData),
        clientIntelEngine.detectServiceGaps(clientData),
        clientIntelEngine.calculateRiskScore(clientData)
      ]);

      const insights = {
        painPoints,
        upsellOpportunities: serviceGaps.map(signal => 
          `${signal.title} - ${signal.estimatedValue || 'Pricing TBD'}`
        ),
        riskScore,
        lastAnalyzed: new Date().toISOString(),
        signals: serviceGaps
      };

      res.json(insights);
    } catch (error) {
      console.error('Insight generation error:', error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
