import express from 'express';
import { z } from 'zod';
import { storage } from './storage.js';
import { requireAuth } from './auth.js';
import { calculateCommission, calculateMonthlyBonus } from '../shared/commission-calculator.js';

const router = express.Router();

// Apply authentication to all API routes
router.use(requireAuth);

// Dashboard stats endpoint
router.get('/dashboard/stats', async (req, res) => {
  try {
    const user = req.user as any;
    const stats = await storage.getRepDashboardStats(user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get deals for current user
router.get('/deals', async (req, res) => {
  try {
    const user = req.user as any;
    const deals = await storage.getDealsByRep(user.id);
    res.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get commissions for current user
router.get('/commissions', async (req, res) => {
  try {
    const user = req.user as any;
    const commissions = await storage.getCommissionsByRep(user.id);
    res.json(commissions);
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// Get monthly bonuses for current user
router.get('/bonuses/monthly', async (req, res) => {
  try {
    const user = req.user as any;
    const bonuses = await storage.getMonthlyBonusesByRep(user.id);
    res.json(bonuses);
  } catch (error) {
    console.error('Error fetching monthly bonuses:', error);
    res.status(500).json({ error: 'Failed to fetch monthly bonuses' });
  }
});

// Get milestone bonuses for current user
router.get('/bonuses/milestone', async (req, res) => {
  try {
    const user = req.user as any;
    const bonuses = await storage.getMilestoneBonusesByRep(user.id);
    res.json(bonuses);
  } catch (error) {
    console.error('Error fetching milestone bonuses:', error);
    res.status(500).json({ error: 'Failed to fetch milestone bonuses' });
  }
});

// Get commission adjustments for current user
router.get('/adjustments', async (req, res) => {
  try {
    const user = req.user as any;
    const adjustments = await storage.getCommissionAdjustmentsByRep(user.id);
    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching commission adjustments:', error);
    res.status(500).json({ error: 'Failed to fetch commission adjustments' });
  }
});

// Create a test deal (for development/testing)
router.post('/deals/test', async (req, res) => {
  try {
    const user = req.user as any;
    
    // Create a test deal
    const testDeal = await storage.createDeal({
      hubspotDealId: `test-deal-${Date.now()}`,
      dealName: `Test Deal - ${new Date().toLocaleDateString()}`,
      amount: '5000.00',
      monthlyValue: '500.00',
      setupFee: '1000.00',
      closeDate: new Date(),
      dealStage: 'closedwon',
      dealOwner: user.email,
      salesRepId: user.id,
      companyName: 'Test Company Inc.',
      serviceType: 'bookkeeping',
      isCollected: true,
    });

    // Calculate and create commissions
    const commissionCalc = calculateCommission(testDeal);
    
    // Create Month 1 commission
    await storage.createCommission({
      dealId: testDeal.id,
      salesRepId: user.id,
      commissionType: 'month_1',
      rate: '0.4000',
      baseAmount: testDeal.monthlyValue!,
      commissionAmount: commissionCalc.month1Commission.toString(),
      monthNumber: 1,
      isPaid: false,
    });

    // Create setup fee commission
    if (testDeal.setupFee && parseFloat(testDeal.setupFee) > 0) {
      await storage.createCommission({
        dealId: testDeal.id,
        salesRepId: user.id,
        commissionType: 'setup_fee',
        rate: '0.2000',
        baseAmount: testDeal.setupFee,
        commissionAmount: commissionCalc.setupFeeCommission.toString(),
        isPaid: false,
      });
    }

    // Create residual commissions for months 2-12
    for (let month = 2; month <= 12; month++) {
      await storage.createCommission({
        dealId: testDeal.id,
        salesRepId: user.id,
        commissionType: 'residual',
        rate: '0.1000',
        baseAmount: testDeal.monthlyValue!,
        commissionAmount: commissionCalc.residualCommission.toString(),
        monthNumber: month,
        isPaid: false,
      });
    }

    res.json({ 
      message: 'Test deal and commissions created successfully',
      deal: testDeal,
      commission: commissionCalc
    });
  } catch (error) {
    console.error('Error creating test deal:', error);
    res.status(500).json({ error: 'Failed to create test deal' });
  }
});

// Admin routes (future implementation)
router.get('/admin/reps', async (req, res) => {
  try {
    // TODO: Add admin role check
    const reps = await storage.getAllSalesReps();
    res.json(reps);
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    res.status(500).json({ error: 'Failed to fetch sales reps' });
  }
});

export { router as apiRouter };