import express from 'express';
import { z } from 'zod';
import { insertQuoteSchema } from '../shared/schema.js';
import { DatabaseStorage } from './storage.js';

const router = express.Router();
const storage = new DatabaseStorage();

// Middleware to ensure user is authenticated
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Create a new quote
router.post('/quotes', requireAuth, async (req, res) => {
  try {
    const quoteData = insertQuoteSchema.parse({
      ...req.body,
      userId: (req.user as any).id
    });
    
    const quote = await storage.createQuote(quoteData);
    res.status(201).json(quote);
  } catch (error) {
    console.error('Error creating quote:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid quote data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// Get quotes by email
router.get('/quotes', requireAuth, async (req, res) => {
  try {
    const { email } = req.query;
    const userId = (req.user as any).id;
    
    if (email && typeof email === 'string') {
      const quotes = await storage.getQuotesByEmail(email, userId);
      res.json(quotes);
    } else {
      const quotes = await storage.getQuotesByUser(userId);
      res.json(quotes);
    }
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Get a specific quote by ID
router.get('/quotes/:id', requireAuth, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const userId = (req.user as any).id;
    
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: 'Invalid quote ID' });
    }
    
    const quote = await storage.getQuoteById(quoteId, userId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Update a quote
router.put('/quotes/:id', requireAuth, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const userId = (req.user as any).id;
    
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: 'Invalid quote ID' });
    }
    
    const updateData = insertQuoteSchema.partial().parse({
      ...req.body,
      userId
    });
    
    const quote = await storage.updateQuote(quoteId, updateData, userId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json(quote);
  } catch (error) {
    console.error('Error updating quote:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid quote data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// Archive a quote
router.patch('/quotes/:id/archive', requireAuth, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const userId = (req.user as any).id;
    
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: 'Invalid quote ID' });
    }
    
    const quote = await storage.archiveQuote(quoteId, userId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json({ message: 'Quote archived successfully', quote });
  } catch (error) {
    console.error('Error archiving quote:', error);
    res.status(500).json({ error: 'Failed to archive quote' });
  }
});

export { router as quotesRouter };