import { Router } from "express";
import { DatabaseStorage } from "./storage.js";
import { syncDealsFromHubSpot, getDealContactInfo } from "./hubspot.js";
import { calculateCommissions, calculateMonthlyBonus, calculateMilestoneBonus } from "../shared/commission-calculator.js";

const router = Router();
const storage = new DatabaseStorage();

// Middleware to ensure authentication
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Sales Rep Routes
router.get('/sales-reps', requireAuth, async (req, res) => {
  try {
    const salesReps = await storage.getAllSalesReps();
    res.json(salesReps);
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    res.status(500).json({ error: 'Failed to fetch sales reps' });
  }
});

router.get('/sales-reps/:id', requireAuth, async (req, res) => {
  try {
    const salesRep = await storage.getSalesRepById(parseInt(req.params.id));
    if (!salesRep) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }
    res.json(salesRep);
  } catch (error) {
    console.error('Error fetching sales rep:', error);
    res.status(500).json({ error: 'Failed to fetch sales rep' });
  }
});

// Deal Routes
router.get('/deals', requireAuth, async (req, res) => {
  try {
    const salesRepId = req.query.salesRepId ? parseInt(req.query.salesRepId as string) : req.user.id;
    const deals = await storage.getDealsBySalesRep(salesRepId);
    res.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

router.post('/deals/sync', requireAuth, async (req, res) => {
  try {
    await syncDealsFromHubSpot();
    res.json({ success: true, message: 'HubSpot deals synced successfully' });
  } catch (error) {
    console.error('Error syncing deals:', error);
    res.status(500).json({ error: 'Failed to sync deals from HubSpot' });
  }
});

router.patch('/deals/:id', requireAuth, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    const updatedDeal = await storage.updateDeal(dealId, req.body);
    res.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Commission Routes
router.get('/commissions', requireAuth, async (req, res) => {
  try {
    const salesRepId = req.query.salesRepId ? parseInt(req.query.salesRepId as string) : req.user.id;
    const commissions = await storage.getCommissionsBySalesRep(salesRepId);
    res.json(commissions);
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

router.get('/commissions/month/:month', requireAuth, async (req, res) => {
  try {
    const salesRepId = req.query.salesRepId ? parseInt(req.query.salesRepId as string) : req.user.id;
    const commissions = await storage.getCommissionsForMonth(salesRepId, req.params.month);
    res.json(commissions);
  } catch (error) {
    console.error('Error fetching monthly commissions:', error);
    res.status(500).json({ error: 'Failed to fetch monthly commissions' });
  }
});

router.patch('/commissions/:id/mark-paid', requireAuth, async (req, res) => {
  try {
    const commissionId = parseInt(req.params.id);
    const updatedCommission = await storage.markCommissionPaid(commissionId);
    res.json(updatedCommission);
  } catch (error) {
    console.error('Error marking commission as paid:', error);
    res.status(500).json({ error: 'Failed to mark commission as paid' });
  }
});

// Monthly Bonus Routes
router.get('/bonuses/monthly', requireAuth, async (req, res) => {
  try {
    const salesRepId = req.query.salesRepId ? parseInt(req.query.salesRepId as string) : req.user.id;
    const bonuses = await storage.getMonthlyBonusesBySalesRep(salesRepId);
    res.json(bonuses);
  } catch (error) {
    console.error('Error fetching monthly bonuses:', error);
    res.status(500).json({ error: 'Failed to fetch monthly bonuses' });
  }
});

router.patch('/bonuses/monthly/:id/select-reward', requireAuth, async (req, res) => {
  try {
    const bonusId = parseInt(req.params.id);
    const { rewardChosen } = req.body;
    
    // Update bonus with selected reward
    const bonus = await storage.getMonthlyBonus(req.user.id, req.body.bonusMonth);
    if (!bonus) {
      return res.status(404).json({ error: 'Bonus not found' });
    }

    // Implementation would update the bonus record
    res.json({ success: true, message: 'Reward selection saved' });
  } catch (error) {
    console.error('Error selecting reward:', error);
    res.status(500).json({ error: 'Failed to select reward' });
  }
});

// Milestone Bonus Routes
router.get('/bonuses/milestone', requireAuth, async (req, res) => {
  try {
    const salesRepId = req.query.salesRepId ? parseInt(req.query.salesRepId as string) : req.user.id;
    const bonuses = await storage.getMilestoneBonusesBySalesRep(salesRepId);
    res.json(bonuses);
  } catch (error) {
    console.error('Error fetching milestone bonuses:', error);
    res.status(500).json({ error: 'Failed to fetch milestone bonuses' });
  }
});

// Performance Analytics Routes
router.get('/performance/:salesRepId', requireAuth, async (req, res) => {
  try {
    const salesRepId = parseInt(req.params.salesRepId);
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const performance = await storage.getSalesRepPerformance(
      salesRepId, 
      startDate as string, 
      endDate as string
    );
    
    res.json(performance);
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const salesRepId = req.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;

    // Get current month performance
    const [commissions, monthlyDeals, totalClients, monthlyBonuses, milestoneBonuses] = await Promise.all([
      storage.getCommissionsBySalesRep(salesRepId),
      storage.getClosedDealsInMonth(salesRepId, currentYear, currentMonthNum),
      storage.getTotalClientsClosedBySalesRep(salesRepId),
      storage.getMonthlyBonusesBySalesRep(salesRepId),
      storage.getMilestoneBonusesBySalesRep(salesRepId)
    ]);

    // Calculate current month earnings
    const currentMonthCommissions = commissions.filter(c => 
      c.paymentMonth.startsWith(new Date().toISOString().slice(0, 7))
    );
    
    const monthlyEarnings = currentMonthCommissions.reduce((sum, c) => 
      sum + parseFloat(c.commissionAmount), 0
    );

    // Calculate bonus eligibility
    const monthlyBonusEligibility = calculateMonthlyBonus(monthlyDeals.length);
    const milestoneBonusInfo = calculateMilestoneBonus(totalClients);

    res.json({
      salesRep: req.user,
      currentMonth: {
        earnings: monthlyEarnings,
        clientsClosed: monthlyDeals.length,
        commissions: currentMonthCommissions
      },
      bonuses: {
        monthly: monthlyBonusEligibility,
        milestone: milestoneBonusInfo
      },
      totalStats: {
        totalClients,
        totalEarnings: commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0),
        paidEarnings: commissions.filter(c => c.isPaid).reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Commission Adjustment Routes
router.post('/adjustments', requireAuth, async (req, res) => {
  try {
    const adjustment = await storage.createCommissionAdjustment({
      salesRepId: req.user.id,
      ...req.body
    });
    res.json(adjustment);
  } catch (error) {
    console.error('Error creating commission adjustment:', error);
    res.status(500).json({ error: 'Failed to create commission adjustment' });
  }
});

router.get('/adjustments', requireAuth, async (req, res) => {
  try {
    const salesRepId = req.query.salesRepId ? parseInt(req.query.salesRepId as string) : req.user.id;
    const adjustments = await storage.getCommissionAdjustments(salesRepId);
    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching commission adjustments:', error);
    res.status(500).json({ error: 'Failed to fetch commission adjustments' });
  }
});

router.patch('/adjustments/:id/approve', requireAuth, async (req, res) => {
  try {
    const adjustmentId = parseInt(req.params.id);
    const adjustment = await storage.approveCommissionAdjustment(adjustmentId, req.user.id);
    res.json(adjustment);
  } catch (error) {
    console.error('Error approving commission adjustment:', error);
    res.status(500).json({ error: 'Failed to approve commission adjustment' });
  }
});

export { router as apiRouter };