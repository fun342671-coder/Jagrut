/**
 * Client-Side Math Engine for Robin Hood Architecture.
 * Ports the logic from the legacy Python CalculationsService to pure JS.
 * Updated to use monthly and daily wages (no hourly calculations).
 */

const CRORE_TO_RUPEES = 10000000;

export const calculateBasketCost = (items) => {
  let currentCost = 0;
  let historicalCost = 0;
  let marketplaceCost = 0;

  items.forEach(item => {
    // Join commodity details with quantity
    currentCost += item.price_current * item.quantity;
    historicalCost += item.price_5yr_ago * item.quantity;
    marketplaceCost += (item.price_marketplace || item.price_current) * item.quantity;
  });

  return {
    currentCost: parseFloat(currentCost.toFixed(2)),
    historicalCost: parseFloat(historicalCost.toFixed(2)),
    marketplaceCost: parseFloat(marketplaceCost.toFixed(2)),
  };
};

export const calculateTimePriceDeficit = (basketResult, profession) => {
  if (!profession || profession.median_wage_current <= 0 || profession.median_wage_5yr_ago <= 0) {
    return null;
  }

  // Daily Wage based on a 30-day work month
  const dailyWageCurrent = profession.median_wage_current / 30;
  const dailyWage5yrAgo = profession.median_wage_5yr_ago / 30;

  const currentLaborDays = basketResult.currentCost / dailyWageCurrent;
  const historicalLaborDays = basketResult.historicalCost / dailyWage5yrAgo;
  const marketplaceLaborDays = basketResult.marketplaceCost / dailyWageCurrent;

  let deficitPct = 0;
  let mktDeficitPct = 0;

  if (historicalLaborDays > 0) {
    deficitPct = ((currentLaborDays - historicalLaborDays) / historicalLaborDays) * 100;
    mktDeficitPct = ((marketplaceLaborDays - historicalLaborDays) / historicalLaborDays) * 100;
  }

  return {
    current_labor_days: parseFloat(currentLaborDays.toFixed(2)),
    historical_labor_days: parseFloat(historicalLaborDays.toFixed(2)),
    marketplace_labor_days: parseFloat(marketplaceLaborDays.toFixed(2)),
    purchasing_power_deficit_pct: parseFloat(deficitPct.toFixed(2)),
    marketplace_adjusted_deficit_pct: parseFloat(mktDeficitPct.toFixed(2)),
  };
};

export const calculateCorruptionTax = (constituency) => {
  if (!constituency) return null;

  let personalLossTotal = 0;
  let personalLossMplads = 0;
  let personalLossState = 0;
  let personalLossCentral = 0;
  let personalLossAudit = 0;

  if (constituency.voting_population > 0) {
    const mpladsUnspent = constituency.mplads_unutilized_crores !== undefined 
      ? constituency.mplads_unutilized_crores 
      : (constituency.mplads_allocated_crores - constituency.mplads_utilized_crores);

    const stateUnspent = constituency.state_unutilized_crores !== undefined 
      ? constituency.state_unutilized_crores 
      : (constituency.state_allocated_crores - constituency.state_utilized_crores);

    const centralUnspent = constituency.central_unutilized_crores !== undefined 
      ? constituency.central_unutilized_crores 
      : (constituency.central_allocated_crores - constituency.central_utilized_crores);

    const auditDiscrepancy = constituency.audit_discrepancy_crores || 0;

    personalLossMplads = (mpladsUnspent * CRORE_TO_RUPEES) / constituency.voting_population;
    personalLossState = (stateUnspent * CRORE_TO_RUPEES) / constituency.voting_population;
    personalLossCentral = (centralUnspent * CRORE_TO_RUPEES) / constituency.voting_population;
    personalLossAudit = (auditDiscrepancy * CRORE_TO_RUPEES) / constituency.voting_population;

    personalLossTotal = personalLossMplads + personalLossState + personalLossCentral + personalLossAudit;
  }

  let repGrowth = 0;
  const rep = constituency.representative;
  if (rep && rep.declared_assets_previous_cr > 0) {
    repGrowth = ((rep.declared_assets_current_cr - rep.declared_assets_previous_cr) / rep.declared_assets_previous_cr) * 100;
  }

  return {
    personal_loss_total_rupees: parseFloat(personalLossTotal.toFixed(2)),
    personal_loss_mplads_rupees: parseFloat(personalLossMplads.toFixed(2)),
    personal_loss_state_rupees: parseFloat(personalLossState.toFixed(2)),
    personal_loss_central_rupees: parseFloat(personalLossCentral.toFixed(2)),
    personal_loss_audit_rupees: parseFloat(personalLossAudit.toFixed(2)),
    rep_wealth_growth_pct: parseFloat(repGrowth.toFixed(2)),
  };
};

export const calculateDashboard = (profession, constituency, basketItems) => {
  const basket = calculateBasketCost(basketItems);
  const deficit = calculateTimePriceDeficit(basket, profession);
  const corruption = calculateCorruptionTax(constituency);

  return {
    citizen: {
      profession: profession?.title || 'Unknown',
      basket_cost_govt_pms: basket.currentCost,
      basket_cost_marketplace: basket.marketplaceCost,
      basket_cost_historical: basket.historicalCost,
      labor_days_current: deficit?.current_labor_days || 0,
      labor_days_marketplace: deficit?.marketplace_labor_days || 0,
      labor_days_historical: deficit?.historical_labor_days || 0,
      purchasing_power_deficit_pct: deficit?.purchasing_power_deficit_pct || 0,
      marketplace_adjusted_deficit_pct: deficit?.marketplace_adjusted_deficit_pct || 0,
    },
    politician: {
      constituency: constituency?.name || 'Unknown',
      personal_loss_total_rupees: corruption?.personal_loss_total_rupees || 0,
      personal_loss_mplads_rupees: corruption?.personal_loss_mplads_rupees || 0,
      personal_loss_state_rupees: corruption?.personal_loss_state_rupees || 0,
      personal_loss_central_rupees: corruption?.personal_loss_central_rupees || 0,
      personal_loss_audit_rupees: corruption?.personal_loss_audit_rupees || 0,
      rep_wealth_growth_percentage: corruption?.rep_wealth_growth_pct || 0,
      representative: constituency?.representative || null,
    },
    budget: {
      total_allocated_crores: constituency?.total_budget_allocated_crores || 0,
      total_utilized_crores: constituency?.total_budget_utilized_crores || 0,
      utilization_pct: constituency?.budget_utilization_pct || 0,
      mplads_allocated_crores: constituency?.mplads_allocated_crores || 0,
      mplads_utilized_crores: constituency?.mplads_utilized_crores || 0,
      mplads_unutilized_crores: constituency?.mplads_unutilized_crores || 0,
      state_allocated_crores: constituency?.state_allocated_crores || 0,
      state_utilized_crores: constituency?.state_utilized_crores || 0,
      state_unutilized_crores: constituency?.state_unutilized_crores || 0,
      central_allocated_crores: constituency?.central_allocated_crores || 0,
      central_utilized_crores: constituency?.central_utilized_crores || 0,
      central_unutilized_crores: constituency?.central_unutilized_crores || 0,
      audit_discrepancy_crores: constituency?.audit_discrepancy_crores || 0,
      audit_notes: constituency?.audit_notes || null,
    }
  };
};
