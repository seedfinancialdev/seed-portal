// Commission calculation logic for Seed Financial

export interface DealCommissionData {
  setupFee: number;
  monthlyFee: number;
  serviceType: 'bookkeeping' | 'taas' | 'combined';
  closedDate: Date;
}

export interface CommissionEntry {
  type: 'month_1' | 'residual';
  amount: number;
  monthNumber: number;
  dateEarned: Date;
}

/**
 * Calculate commission structure for a deal
 * - 40% of monthly deal value in Month 1
 * - 20% of initial setup fee in Month 1
 * - 10% residual commission for Months 2–12 for collected recurring revenue
 */
export function calculateCommissions(deal: DealCommissionData): CommissionEntry[] {
  const { setupFee, monthlyFee, closedDate } = deal;
  const commissions: CommissionEntry[] = [];

  // Month 1 Commission
  const month1SetupCommission = setupFee * 0.20;
  const month1MonthlyCommission = monthlyFee * 0.40;
  const totalMonth1Commission = month1SetupCommission + month1MonthlyCommission;

  commissions.push({
    type: 'month_1',
    amount: totalMonth1Commission,
    monthNumber: 1,
    dateEarned: new Date(closedDate)
  });

  // Residual Commissions (Months 2-12)
  const residualCommissionAmount = monthlyFee * 0.10;
  
  for (let month = 2; month <= 12; month++) {
    const commissionDate = new Date(closedDate);
    commissionDate.setMonth(commissionDate.getMonth() + (month - 1));
    
    commissions.push({
      type: 'residual',
      amount: residualCommissionAmount,
      monthNumber: month,
      dateEarned: commissionDate
    });
  }

  return commissions;
}

/**
 * Calculate monthly bonus based on clients closed
 */
export function calculateMonthlyBonus(clientsClosedCount: number): {
  amount: number;
  type: 'cash' | 'airpods' | 'apple_watch' | 'macbook_air';
  description: string;
} | null {
  if (clientsClosedCount >= 15) {
    return {
      amount: 1500,
      type: 'cash',
      description: '15+ Clients: $1,500 cash or MacBook Air'
    };
  } else if (clientsClosedCount >= 10) {
    return {
      amount: 1000,
      type: 'cash',
      description: '10 Clients: $1,000 cash or Apple Watch'
    };
  } else if (clientsClosedCount >= 5) {
    return {
      amount: 500,
      type: 'cash',
      description: '5 Clients: $500 cash or AirPods'
    };
  }
  
  return null;
}

/**
 * Calculate milestone bonus based on total clients closed
 */
export function calculateMilestoneBonus(totalClientsClosedAllTime: number): {
  amount: number;
  milestone: number;
  includesEquity: boolean;
  description: string;
} | null {
  if (totalClientsClosedAllTime >= 100) {
    return {
      amount: 10000,
      milestone: 100,
      includesEquity: true,
      description: '100 Clients: $10,000 + Equity Offer'
    };
  } else if (totalClientsClosedAllTime >= 60) {
    return {
      amount: 7500,
      milestone: 60,
      includesEquity: false,
      description: '60 Clients: $7,500'
    };
  } else if (totalClientsClosedAllTime >= 40) {
    return {
      amount: 5000,
      milestone: 40,
      includesEquity: false,
      description: '40 Clients: $5,000'
    };
  } else if (totalClientsClosedAllTime >= 25) {
    return {
      amount: 1000,
      milestone: 25,
      includesEquity: false,
      description: '25 Clients: $1,000'
    };
  }
  
  return null;
}

/**
 * Get next milestone and progress
 */
export function getNextMilestone(totalClientsClosedAllTime: number): {
  nextMilestone: number;
  progress: number;
  remaining: number;
} {
  const milestones = [25, 40, 60, 100];
  
  for (const milestone of milestones) {
    if (totalClientsClosedAllTime < milestone) {
      return {
        nextMilestone: milestone,
        progress: (totalClientsClosedAllTime / milestone) * 100,
        remaining: milestone - totalClientsClosedAllTime
      };
    }
  }
  
  // Already achieved all milestones
  return {
    nextMilestone: 100,
    progress: 100,
    remaining: 0
  };
}

/**
 * Calculate total earnings for a sales rep
 */
export function calculateTotalEarnings(
  commissions: { amount: number; status: string }[],
  monthlyBonuses: { bonusAmount: number; status: string }[],
  milestoneBonuses: { bonusAmount: number; status: string }[]
): {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalProcessing: number;
} {
  const allEarnings = [
    ...commissions.map(c => ({ amount: Number(c.amount), status: c.status })),
    ...monthlyBonuses.map(b => ({ amount: Number(b.bonusAmount), status: b.status })),
    ...milestoneBonuses.map(b => ({ amount: Number(b.bonusAmount), status: b.status }))
  ];

  const totalPaid = allEarnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + e.amount, 0);
    
  const totalPending = allEarnings
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0);
    
  const totalProcessing = allEarnings
    .filter(e => e.status === 'processing')
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalEarned: totalPaid + totalPending + totalProcessing,
    totalPaid,
    totalPending,
    totalProcessing
  };
}