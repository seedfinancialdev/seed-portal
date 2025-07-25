import { Deal, Commission, MonthlyBonus, MilestoneBonus } from './schema';

export interface CommissionCalculation {
  month1Commission: number;
  setupFeeCommission: number;
  residualCommission: number;
  totalCommission: number;
}

export interface MonthlyBonusCalculation {
  clientsClosed: number;
  bonusLevel: string | null;
  bonusAmount: number;
  bonusDescription: string | null;
}

export interface MilestoneBonusCalculation {
  milestone: string;
  totalClients: number;
  bonusAmount: number;
  bonusDescription: string;
  achieved: boolean;
}

// Commission rates
export const COMMISSION_RATES = {
  MONTH_1: 0.40, // 40% of monthly value
  SETUP_FEE: 0.20, // 20% of setup fee
  RESIDUAL: 0.10, // 10% of monthly value for months 2-12
} as const;

// Monthly bonus structure
export const MONTHLY_BONUSES = {
  5: { amount: 500, description: '$500 cash or AirPods' },
  10: { amount: 1000, description: '$1,000 cash or Apple Watch' },
  15: { amount: 1500, description: '$1,500 cash or MacBook Air' },
} as const;

// Milestone bonus structure
export const MILESTONE_BONUSES = {
  25: { amount: 1000, description: '$1,000 milestone bonus' },
  40: { amount: 5000, description: '$5,000 milestone bonus' },
  60: { amount: 7500, description: '$7,500 milestone bonus' },
  100: { amount: 10000, description: '$10,000 milestone bonus + Equity Offer' },
} as const;

/**
 * Calculate commission for a closed deal
 */
export function calculateCommission(deal: Deal): CommissionCalculation {
  const monthlyValue = parseFloat(deal.monthlyValue?.toString() || '0');
  const setupFee = parseFloat(deal.setupFee?.toString() || '0');
  
  const month1Commission = monthlyValue * COMMISSION_RATES.MONTH_1;
  const setupFeeCommission = setupFee * COMMISSION_RATES.SETUP_FEE;
  const residualCommission = monthlyValue * COMMISSION_RATES.RESIDUAL; // Per month for months 2-12
  
  const totalCommission = month1Commission + setupFeeCommission + (residualCommission * 11);
  
  return {
    month1Commission,
    setupFeeCommission,
    residualCommission,
    totalCommission,
  };
}

/**
 * Calculate monthly bonus based on clients closed
 */
export function calculateMonthlyBonus(clientsClosed: number): MonthlyBonusCalculation {
  let bonusLevel: string | null = null;
  let bonusAmount = 0;
  let bonusDescription: string | null = null;
  
  if (clientsClosed >= 15) {
    bonusLevel = '15_plus_clients';
    bonusAmount = MONTHLY_BONUSES[15].amount;
    bonusDescription = MONTHLY_BONUSES[15].description;
  } else if (clientsClosed >= 10) {
    bonusLevel = '10_clients';
    bonusAmount = MONTHLY_BONUSES[10].amount;
    bonusDescription = MONTHLY_BONUSES[10].description;
  } else if (clientsClosed >= 5) {
    bonusLevel = '5_clients';
    bonusAmount = MONTHLY_BONUSES[5].amount;
    bonusDescription = MONTHLY_BONUSES[5].description;
  }
  
  return {
    clientsClosed,
    bonusLevel,
    bonusAmount,
    bonusDescription,
  };
}

/**
 * Calculate milestone bonuses
 */
export function calculateMilestoneBonuses(totalClients: number): MilestoneBonusCalculation[] {
  const milestones = Object.entries(MILESTONE_BONUSES).map(([threshold, bonus]) => ({
    milestone: `${threshold}_clients`,
    totalClients: parseInt(threshold),
    bonusAmount: bonus.amount,
    bonusDescription: bonus.description,
    achieved: totalClients >= parseInt(threshold),
  }));
  
  return milestones;
}

/**
 * Get next milestone progress
 */
export function getNextMilestone(totalClients: number): { 
  next: number; 
  current: number; 
  progress: number; 
  bonusAmount: number;
} {
  const thresholds = [25, 40, 60, 100];
  const nextThreshold = thresholds.find(threshold => totalClients < threshold) || 100;
  const currentThreshold = thresholds.filter(threshold => totalClients >= threshold).pop() || 0;
  
  const progress = nextThreshold === 100 && totalClients >= 100 
    ? 100 
    : (totalClients / nextThreshold) * 100;
  
  const bonusAmount = MILESTONE_BONUSES[nextThreshold as keyof typeof MILESTONE_BONUSES]?.amount || 0;
  
  return {
    next: nextThreshold,
    current: currentThreshold,
    progress: Math.min(progress, 100),
    bonusAmount,
  };
}