import { Deal, Commission } from './schema';

export interface CommissionCalculation {
  dealId: number;
  salesRepId: number;
  totalCommissionYear1: number;
  initialMonthCommission: number;
  setupFeeCommission: number;
  residualCommissions: Array<{
    month: number;
    amount: number;
    paymentDate: Date;
  }>;
}

export interface BonusCalculation {
  monthly: {
    clientsClosed: number;
    eligibleBonus: string | null; // "5_clients", "10_clients", "15_clients"
    bonusAmount: number;
    rewardOptions: string[];
  };
  milestone: {
    totalClientsClosed: number;
    nextMilestone: string | null;
    clientsToNextMilestone: number;
    upcomingBonusAmount: number;
  };
}

/**
 * Calculate commission structure for a closed deal
 * Commission Plan:
 * - 40% of monthly deal value in Month 1
 * - 20% of initial setup fee in Month 1  
 * - 10% residual commission for Months 2–12 for collected recurring revenue
 */
export function calculateCommissions(deal: Deal, firstPaymentDate: Date): CommissionCalculation {
  const monthlyValue = parseFloat(deal.monthlyValue);
  const setupFee = parseFloat(deal.setupFee);
  
  // Month 1 commissions
  const initialMonthCommission = monthlyValue * 0.40;
  const setupFeeCommission = setupFee * 0.20;
  
  // Residual commissions (months 2-12)
  const residualCommissions: Array<{
    month: number;
    amount: number;
    paymentDate: Date;
  }> = [];
  const residualRate = 0.10;
  
  for (let month = 2; month <= 12; month++) {
    const paymentDate = new Date(firstPaymentDate);
    paymentDate.setMonth(paymentDate.getMonth() + (month - 1));
    
    residualCommissions.push({
      month,
      amount: monthlyValue * residualRate,
      paymentDate
    });
  }
  
  const totalResidualCommission = residualCommissions.reduce((sum, comm) => sum + comm.amount, 0);
  const totalCommissionYear1 = initialMonthCommission + setupFeeCommission + totalResidualCommission;
  
  return {
    dealId: deal.id,
    salesRepId: deal.salesRepId,
    totalCommissionYear1,
    initialMonthCommission,
    setupFeeCommission,
    residualCommissions
  };
}

/**
 * Calculate bonus eligibility based on clients closed in a month
 * Monthly Bonuses (Choose One per Month):
 * - 5 Clients Closed: $500 cash or AirPods
 * - 10 Clients Closed: $1,000 cash or Apple Watch  
 * - 15+ Clients Closed: $1,500 cash or MacBook Air
 */
export function calculateMonthlyBonus(clientsClosedThisMonth: number): {
  eligibleBonus: string | null;
  bonusAmount: number;
  rewardOptions: string[];
} {
  if (clientsClosedThisMonth >= 15) {
    return {
      eligibleBonus: "15_clients",
      bonusAmount: 1500,
      rewardOptions: ["cash", "macbook"]
    };
  } else if (clientsClosedThisMonth >= 10) {
    return {
      eligibleBonus: "10_clients", 
      bonusAmount: 1000,
      rewardOptions: ["cash", "apple_watch"]
    };
  } else if (clientsClosedThisMonth >= 5) {
    return {
      eligibleBonus: "5_clients",
      bonusAmount: 500,
      rewardOptions: ["cash", "airpods"]
    };
  }
  
  return {
    eligibleBonus: null,
    bonusAmount: 0,
    rewardOptions: []
  };
}

/**
 * Calculate milestone bonus eligibility
 * Milestone Bonuses:
 * - 25 Clients Closed: $1,000
 * - 40 Clients Closed: $5,000
 * - 60 Clients Closed: $7,500
 * - 100 Clients Closed: $10,000 + Equity Offer
 */
export function calculateMilestoneBonus(totalClientsClosed: number): {
  achievedMilestones: Array<{ milestone: string; amount: number; equityOffer?: boolean }>;
  nextMilestone: string | null;
  clientsToNextMilestone: number;
  upcomingBonusAmount: number;
} {
  const milestones = [
    { threshold: 25, milestone: "25_clients", amount: 1000 },
    { threshold: 40, milestone: "40_clients", amount: 5000 },
    { threshold: 60, milestone: "60_clients", amount: 7500 },
    { threshold: 100, milestone: "100_clients", amount: 10000, equityOffer: true }
  ];
  
  const achievedMilestones = milestones
    .filter(m => totalClientsClosed >= m.threshold)
    .map(m => ({
      milestone: m.milestone,
      amount: m.amount,
      ...(m.equityOffer && { equityOffer: true })
    }));
  
  const nextMilestone = milestones.find(m => totalClientsClosed < m.threshold);
  
  return {
    achievedMilestones,
    nextMilestone: nextMilestone?.milestone || null,
    clientsToNextMilestone: nextMilestone ? nextMilestone.threshold - totalClientsClosed : 0,
    upcomingBonusAmount: nextMilestone?.amount || 0
  };
}

/**
 * Generate commission records for database insertion
 */
export function generateCommissionRecords(calculation: CommissionCalculation, firstPaymentDate: Date): Omit<Commission, 'id' | 'createdAt' | 'isPaid' | 'paidDate'>[] {
  const records: Omit<Commission, 'id' | 'createdAt' | 'isPaid' | 'paidDate'>[] = [];
  
  // Initial monthly commission (Month 1)
  if (calculation.initialMonthCommission > 0) {
    records.push({
      dealId: calculation.dealId,
      salesRepId: calculation.salesRepId,
      commissionType: "initial_monthly",
      baseAmount: calculation.initialMonthCommission / 0.40, // Back-calculate monthly value
      commissionRate: "0.4000",
      commissionAmount: calculation.initialMonthCommission.toFixed(2),
      monthNumber: 1,
      paymentMonth: firstPaymentDate.toISOString().split('T')[0]
    });
  }
  
  // Setup fee commission (Month 1)
  if (calculation.setupFeeCommission > 0) {
    records.push({
      dealId: calculation.dealId,
      salesRepId: calculation.salesRepId,
      commissionType: "setup_fee",
      baseAmount: calculation.setupFeeCommission / 0.20, // Back-calculate setup fee
      commissionRate: "0.2000",
      commissionAmount: calculation.setupFeeCommission.toFixed(2),
      monthNumber: 1,
      paymentMonth: firstPaymentDate.toISOString().split('T')[0]
    });
  }
  
  // Residual commissions (Months 2-12)
  calculation.residualCommissions.forEach(residual => {
    records.push({
      dealId: calculation.dealId,
      salesRepId: calculation.salesRepId,
      commissionType: "residual",
      baseAmount: residual.amount / 0.10, // Back-calculate monthly value
      commissionRate: "0.1000",
      commissionAmount: residual.amount.toFixed(2),
      monthNumber: residual.month,
      paymentMonth: residual.paymentDate.toISOString().split('T')[0]
    });
  });
  
  return records;
}