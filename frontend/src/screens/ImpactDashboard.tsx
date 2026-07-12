import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  ActivityIndicator
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { calculateDashboard } from '../../utils/calculations';
import { Theme } from '../theme';

interface ImpactDashboardProps {
  navigation: any;
}

export default function ImpactDashboardScreen({ navigation }: ImpactDashboardProps) {
  const {
    professions,
    commodities,
    professionId,
    basketItems,
    activeConstituencyDetails,
    loadingConstituency
  } = useAppStore();

  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  const profession = professions.find(p => p.id === professionId);

  // Map user selections to full commodity objects with quantities
  const enrichedBasketItems = basketItems
    .map(item => {
      const comm = commodities.find(c => c.id === item.commodity_id);
      if (!comm) return null;
      return {
        ...comm,
        quantity: item.quantity
      };
    })
    .filter((item): item is any => item !== null);

  // Run the calculations locally
  const dashboardData = (profession && activeConstituencyDetails)
    ? calculateDashboard(profession, activeConstituencyDetails, enrichedBasketItems)
    : null;

  const handleOpenLink = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error("Failed to open URL:", err);
        alert("Unable to open the link.");
      });
    }
  };

  const toggleExplanation = (section: string) => {
    if (expandedExplanation === section) {
      setExpandedExplanation(null);
    } else {
      setExpandedExplanation(section);
    }
  };

  if (loadingConstituency) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.textPrimary} />
        <Text style={[Theme.typography.body2, { marginTop: Theme.spacing.m }]}>
          Loading constituency details...
        </Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>No selection data available.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={styles.primaryButtonText}>RETURN TO ONBOARDING</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { citizen, politician, budget } = dashboardData;
  const isLoss = citizen.purchasing_power_deficit_pct > 0;
  const hasRep = politician.representative !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Timeframe Notice */}
        <View style={styles.timeframeBox}>
          <Text style={styles.timeframeText}>
            <Text style={{ fontWeight: '700' }}>ANALYSIS TIMEFRAME: </Text>
            Household consumption prices compare July 2026 data against July 2021 (5-year inflation cycle). Representative wealth growth compares self-declared asset disclosures between the 2019 Lok Sabha General Election and the 2024 Lok Sabha General Election (5-year legislative term).
          </Text>
        </View>

        {/* Informative Findings Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeader}>INFORMATIVE EXECUTIVE SUMMARY</Text>
          <Text style={styles.summarySubheader}>
            Demographic profile: {citizen.profession} in {politician.constituency}
          </Text>
          
          <View style={styles.summaryBullet}>
            <Text style={styles.summaryBulletNumber}>1</Text>
            <Text style={styles.summaryBulletText}>
              <Text style={{ fontWeight: '700' }}>Purchasing Power:</Text> Your selected household basket requires <Text style={{ fontWeight: '700' }}>{citizen.labor_days_current.toFixed(1)} days</Text> of labor per month today, compared to <Text style={{ fontWeight: '700' }}>{citizen.labor_days_historical.toFixed(1)} days</Text> five years ago. This represents a change of {citizen.purchasing_power_deficit_pct.toFixed(1)}% in labor days required.
            </Text>
          </View>

          <View style={styles.summaryBullet}>
            <Text style={styles.summaryBulletNumber}>2</Text>
            <Text style={styles.summaryBulletText}>
              <Text style={{ fontWeight: '700' }}>Pro-Rated Development Loss:</Text> The unspent or CAG-flagged funds across the local, state, and central governments equate to a pro-rated development loss of <Text style={{ fontWeight: '700' }}>Rs.{politician.personal_loss_total_rupees.toFixed(2)}</Text> per voter.
            </Text>
          </View>

          {hasRep && (
            <View style={styles.summaryBullet}>
              <Text style={styles.summaryBulletNumber}>3</Text>
              <Text style={styles.summaryBulletText}>
                <Text style={{ fontWeight: '700' }}>Representative Assets:</Text> Declared assets of local MP <Text style={{ fontWeight: '700' }}>{politician.representative?.rep_name}</Text> grew by <Text style={{ fontWeight: '700' }}>{politician.rep_wealth_growth_percentage.toFixed(1)}%</Text> during their term.
              </Text>
            </View>
          )}
        </View>

        {/* Top Card: The Citizen */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>CITIZEN LABOR ANALYSIS</Text>
            <Text style={styles.cardTitle}>TIME-PRICE DEFICIT</Text>
          </View>
          
          <View style={styles.statContainer}>
            <Text
              style={[
                Theme.typography.statLarge,
                { color: isLoss ? Theme.colors.danger : Theme.colors.success }
              ]}
            >
              {isLoss ? '+' : ''}{citizen.purchasing_power_deficit_pct.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>PURCHASING POWER LOSS (5 YR)</Text>
          </View>

          <Text style={styles.statementText}>
            Your chosen lifestyle takes{' '}
            <Text style={{ fontWeight: 'bold' }}>
              {citizen.labor_days_current.toFixed(1)} days
            </Text>{' '}
            of labor per month to afford today, compared to{' '}
            <Text style={{ fontWeight: 'bold' }}>
              {citizen.labor_days_historical.toFixed(1)} days
            </Text>{' '}
            five years ago.
          </Text>

          <View style={styles.detailsTable}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellLabel}>Profession</Text>
              <Text style={styles.tableCellValue}>{citizen.profession}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellLabel}>Median Monthly Wage</Text>
              <TouchableOpacity onPress={() => handleOpenLink('https://mospi.gov.in/periodic-labour-force-survey-plfs')}>
                <Text style={[styles.tableCellValue, { color: Theme.colors.primary, textDecorationLine: 'underline' }]}>
                  Rs.{profession?.median_wage_current.toLocaleString()} ↗
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellLabel}>Historical Cost (5 Yr Ago)</Text>
              <TouchableOpacity onPress={() => handleOpenLink('https://fcainfoweb.nic.in/ereporting/Reports/Daily_Prices_Report.aspx')}>
                <Text style={[styles.tableCellValue, { color: Theme.colors.primary, textDecorationLine: 'underline' }]}>
                  Rs.{citizen.basket_cost_historical.toLocaleString(undefined, {minimumFractionDigits: 2})} ↗
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellLabel}>Current Cost (Govt PDS)</Text>
              <TouchableOpacity onPress={() => handleOpenLink('https://fcainfoweb.nic.in/ereporting/Reports/Daily_Prices_Report.aspx')}>
                <Text style={[styles.tableCellValue, { color: Theme.colors.primary, textDecorationLine: 'underline' }]}>
                  Rs.{citizen.basket_cost_govt_pms.toLocaleString(undefined, {minimumFractionDigits: 2})} ↗
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellLabel}>Marketplace Cost (Est)</Text>
              <Text style={styles.tableCellValue}>Rs.{citizen.basket_cost_marketplace.toLocaleString(undefined, {minimumFractionDigits: 2})}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.explainButton}
            onPress={() => toggleExplanation('timePrice')}
          >
            <Text style={styles.explainButtonText}>
              {expandedExplanation === 'timePrice' ? 'Hide Math Formula ▲' : 'Show Math Formula ▼'}
            </Text>
          </TouchableOpacity>

          {expandedExplanation === 'timePrice' && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationTitle}>TIME-PRICE MATHEMATICS</Text>
              <Text style={styles.explanationText}>
                We calculate daily income on a standard 30-day basis:
              </Text>
              <Text style={styles.formulaText}>
                Daily Income = Monthly Wage / 30 {'\n'}
                = Rs.{profession?.median_wage_current} / 30 = Rs.{(profession?.median_wage_current! / 30).toFixed(2)} / day
              </Text>
              <Text style={styles.explanationText}>
                Days of labor is the basket cost divided by daily income:
              </Text>
              <Text style={styles.formulaText}>
                Current Days = Rs.{citizen.basket_cost_govt_pms} / Rs.{(profession?.median_wage_current! / 30).toFixed(2)} = {citizen.labor_days_current.toFixed(1)} days{'\n'}
                Prev Days = Rs.{citizen.basket_cost_historical} / Rs.{(profession?.median_wage_5yr_ago! / 30).toFixed(2)} = {citizen.labor_days_historical.toFixed(1)} days
              </Text>
              <Text style={styles.explanationText}>
                Deficit percentage represents the growth in work time required:
              </Text>
              <Text style={styles.formulaText}>
                Deficit = ((Current Days - Prev Days) / Prev Days) * 100 = {citizen.purchasing_power_deficit_pct.toFixed(2)}%
              </Text>
            </View>
          )}
        </View>

        {/* New Card: Basket Breakdown and Price Verification */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>BASKET BREAKDOWN & PRICE VERIFICATION</Text>
            <Text style={styles.cardTitle}>COMMODITY SPECIFIC PRICE SOURCES</Text>
          </View>
          
          <Text style={styles.citationsDesc}>
            Verify the daily retail prices or index data for items in your basket. Click "Verify Price ↗" to view the specific official webpage tracking the commodity:
          </Text>

          <View style={{ marginBottom: Theme.spacing.s }}>
            {enrichedBasketItems.map((item: any) => (
              <View key={item.id} style={styles.commodityPriceRow}>
                <View style={styles.commodityPriceInfo}>
                  <Text style={styles.commodityPriceName}>{item.name}</Text>
                  <Text style={styles.commodityPriceDetail}>
                    Current: Rs.{item.price_current} / {item.unit} | 5 Yr Ago: Rs.{item.price_5yr_ago} | Qty: {item.quantity}
                  </Text>
                </View>
                {item.price_source_url ? (
                  <TouchableOpacity 
                    style={styles.commodityVerifyLinkContainer} 
                    onPress={() => handleOpenLink(item.price_source_url)}
                  >
                    <Text style={styles.commodityVerifyLink}>Verify Price ↗</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.inAppUploadLink}
            onPress={() => navigation.navigate('Crowdsource', { tab: 'price' })}
          >
            <Text style={styles.inAppUploadLinkText}>
              Grocery prices higher at your local market? Upload receipt/bill ↗
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Card: The Politician */}
        <View style={[styles.card, styles.cardDark]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: Theme.colors.warning }]}>REPRESENTATIVE WEALTH</Text>
            <Text style={[styles.cardTitle, { color: Theme.colors.textInverse }]}>
              {politician.constituency.toUpperCase()} REPRESENTATIVE
            </Text>
          </View>

          {hasRep ? (
            <View>
              <View style={styles.statContainer}>
                <Text style={[Theme.typography.statLarge, { color: Theme.colors.success }]}>
                  +{politician.rep_wealth_growth_percentage.toFixed(1)}%
                </Text>
                <Text style={[styles.statLabel, { color: Theme.colors.textSecondary }]}>
                  ASSET INCREASE (CURRENT TERM)
                </Text>
              </View>

              <Text style={[styles.statementText, { color: Theme.colors.textInverse }]}>
                Meanwhile, your local MP{' '}
                <Text style={{ fontWeight: 'bold', color: Theme.colors.warning }}>
                  {politician.representative?.rep_name}
                </Text>{' '}
                ({politician.representative?.party})'s declared assets grew by{' '}
                <Text style={{ fontWeight: 'bold', color: Theme.colors.success }}>
                  {politician.rep_wealth_growth_percentage.toFixed(1)}%
                </Text>{' '}
                over the course of their term.
              </Text>

              <View style={[styles.detailsTable, { borderTopColor: Theme.colors.borderDark }]}>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellLabel, { color: Theme.colors.textSecondary }]}>Representative</Text>
                  <Text style={[styles.tableCellValue, { color: Theme.colors.textInverse }]}>
                    {politician.representative?.rep_name} ({politician.representative?.party})
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellLabel, { color: Theme.colors.textSecondary }]}>Declared Current Assets</Text>
                  <Text style={[styles.tableCellValue, { color: Theme.colors.textInverse }]}>
                    {politician.representative?.declared_assets_current_cr.toFixed(2)} Cr
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellLabel, { color: Theme.colors.textSecondary }]}>Declared Previous Assets</Text>
                  <Text style={[styles.tableCellValue, { color: Theme.colors.textInverse }]}>
                    {politician.representative?.declared_assets_previous_cr.toFixed(2)} Cr
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellLabel, { color: Theme.colors.textSecondary }]}>Pending Criminal Cases</Text>
                  <Text
                    style={[
                      styles.tableCellValue,
                      {
                        fontWeight: '700',
                        color:
                          (politician.representative?.pending_criminal_cases ?? 0) > 0
                            ? Theme.colors.danger
                            : Theme.colors.success
                      }
                    ]}
                  >
                    {politician.representative?.pending_criminal_cases} Cases
                  </Text>
                </View>
              </View>

              {politician.representative?.affidavit_url ? (
                <TouchableOpacity
                  style={styles.affidavitButton}
                  onPress={() => handleOpenLink(politician.representative!.affidavit_url)}
                >
                  <Text style={styles.affidavitButtonText}>VERIFY SWORN ECI AFFIDAVIT ↗</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.inAppUploadLinkDark}
                onPress={() => navigation.navigate('Crowdsource', { tab: 'affidavit' })}
              >
                <Text style={styles.inAppUploadLinkTextDark}>
                  Have newer asset disclosures or missing affidavit details? Upload affidavit ↗
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.explainButton, { borderColor: Theme.colors.borderDark }]}
                onPress={() => toggleExplanation('wealthGrowth')}
              >
                <Text style={[styles.explainButtonText, { color: Theme.colors.textInverse }]}>
                  {expandedExplanation === 'wealthGrowth' ? 'Hide Math Formula ▲' : 'Show Math Formula ▼'}
                </Text>
              </TouchableOpacity>

              {expandedExplanation === 'wealthGrowth' && (
                <View style={[styles.explanationBox, { backgroundColor: '#1A1A1A', borderColor: Theme.colors.borderDark }]}>
                  <Text style={[styles.explanationTitle, { color: Theme.colors.warning }]}>ASSET GROWTH FORMULA</Text>
                  <Text style={[styles.explanationText, { color: Theme.colors.textInverse }]}>
                    Representative asset growth compares declared wealth across terms:
                  </Text>
                  <Text style={[styles.formulaText, { color: Theme.colors.textInverse, backgroundColor: '#262626' }]}>
                    Growth = ((Current Assets - Previous Assets) / Previous Assets) * 100 {'\n'}
                    = ((Rs.{politician.representative?.declared_assets_current_cr} Cr - Rs.{politician.representative?.declared_assets_previous_cr} Cr) / Rs.{politician.representative?.declared_assets_previous_cr} Cr) * 100 {'\n'}
                    = {politician.rep_wealth_growth_percentage.toFixed(2)}%
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.missingRepContainer}>
              <Text style={styles.missingRepTitle}>NO REPRESENTATIVE AFFIDAVIT DATA</Text>
              <Text style={styles.missingRepText}>
                No verified affidavit has been crowdsourced for {politician.constituency} yet. Help us unlock this ward by uploading their sworn affidavit.
              </Text>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => navigation.navigate('Crowdsource', { tab: 'affidavit' })}
              >
                <Text style={styles.outlineButtonText}>SUBMIT AFFIDAVIT VIA PORTAL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Third Card: Corruption Tax & Budget utilization */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>GOVERNMENT BUDGETARY DIVERSION</Text>
            <Text style={styles.cardTitle}>PRO-RATED DEVELOP LOSS & CORRUPTION TAX</Text>
          </View>

          <View style={styles.statContainer}>
            <Text style={[Theme.typography.statLarge, { color: Theme.colors.danger }]}>
              Rs.{politician.personal_loss_total_rupees.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>COMBINED UNSPENT & CAG-FLAGGED TAX (PER VOTER)</Text>
          </View>

          <Text style={styles.statementText}>
            Rather than blaming a single representative, we audit the entire government's performance. A total of{' '}
            <Text style={{ fontWeight: 'bold', color: Theme.colors.danger }}>
              Rs.{politician.personal_loss_total_rupees.toFixed(2)}
            </Text>{' '}
            per voter represents capital allocated by the central, state, and local governments for your constituency that went unspent or has audit discrepancies.
          </Text>

          <View style={styles.detailsTable}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderCellLabel}>GOVERNMENT SECTOR</Text>
              <Text style={styles.tableHeaderCellValue}>BUDGET (ALLOC/UTIL)</Text>
              <Text style={[styles.tableHeaderCellValue, { textAlign: 'right' }]}>TAX/VOTER</Text>
            </View>

            {/* Central Government Row */}
            <View style={styles.tableRowWithSub}>
              <View style={styles.tableRowMain}>
                <Text style={styles.tableCellLabel}>Central Govt Allocation</Text>
                <Text style={styles.tableCellValue}>
                  {budget.central_allocated_crores.toFixed(1)} Cr / {budget.central_utilized_crores.toFixed(1)} Cr
                </Text>
                <Text style={[styles.tableCellValue, { textAlign: 'right', fontWeight: 'bold' }]}>
                  Rs.{politician.personal_loss_central_rupees.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.tableCellSub}>
                Utilization: {budget.central_allocated_crores > 0 ? ((budget.central_utilized_crores/budget.central_allocated_crores)*100).toFixed(1) : 0}% | Unutilized: Rs.{(budget.central_allocated_crores - budget.central_utilized_crores).toFixed(1)} Cr
              </Text>
            </View>

            {/* State Government Row */}
            <View style={styles.tableRowWithSub}>
              <View style={styles.tableRowMain}>
                <Text style={styles.tableCellLabel}>State Govt Allocation</Text>
                <Text style={styles.tableCellValue}>
                  {budget.state_allocated_crores.toFixed(1)} Cr / {budget.state_utilized_crores.toFixed(1)} Cr
                </Text>
                <Text style={[styles.tableCellValue, { textAlign: 'right', fontWeight: 'bold' }]}>
                  Rs.{politician.personal_loss_state_rupees.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.tableCellSub}>
                Utilization: {budget.state_allocated_crores > 0 ? ((budget.state_utilized_crores/budget.state_allocated_crores)*100).toFixed(1) : 0}% | Unutilized: Rs.{(budget.state_allocated_crores - budget.state_utilized_crores).toFixed(1)} Cr
              </Text>
            </View>

            {/* Local Representative Row */}
            <View style={styles.tableRowWithSub}>
              <View style={styles.tableRowMain}>
                <Text style={styles.tableCellLabel}>Local Rep (MPLADS)</Text>
                <Text style={styles.tableCellValue}>
                  {budget.mplads_allocated_crores.toFixed(1)} Cr / {budget.mplads_utilized_crores.toFixed(1)} Cr
                </Text>
                <Text style={[styles.tableCellValue, { textAlign: 'right', fontWeight: 'bold' }]}>
                  Rs.{politician.personal_loss_mplads_rupees.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.tableCellSub}>
                Utilization: {budget.mplads_allocated_crores > 0 ? ((budget.mplads_utilized_crores/budget.mplads_allocated_crores)*100).toFixed(1) : 0}% | Unspent: Rs.{(budget.mplads_allocated_crores - budget.mplads_utilized_crores).toFixed(1)} Cr
              </Text>
            </View>

            {/* CAG Audit Discrepancies Row */}
            {budget.audit_discrepancy_crores > 0 && (
              <View style={[styles.tableRowWithSub, { borderBottomWidth: 0, backgroundColor: '#FFF0F0', padding: Theme.spacing.s }]}>
                <View style={styles.tableRowMain}>
                  <Text style={[styles.tableCellLabel, { color: Theme.colors.danger, fontWeight: '700' }]}>CAG Audit Discrepancies</Text>
                  <Text style={[styles.tableCellValue, { color: Theme.colors.danger, fontWeight: '700' }]}>
                    {budget.audit_discrepancy_crores.toFixed(1)} Cr
                  </Text>
                  <Text style={[styles.tableCellValue, { textAlign: 'right', color: Theme.colors.danger, fontWeight: 'bold' }]}>
                    Rs.{politician.personal_loss_audit_rupees.toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.tableCellSub, { color: Theme.colors.danger, fontStyle: 'italic' }]}>
                  * CAG audit: {budget.audit_notes}
                </Text>
              </View>
            )}
          </View>

          {/* Budget Source Transparency Links */}
          <View style={{ marginTop: Theme.spacing.s, marginBottom: Theme.spacing.s, paddingHorizontal: Theme.spacing.xs }}>
            <TouchableOpacity style={{ paddingVertical: 2 }} onPress={() => handleOpenLink('https://www.indiabudget.gov.in/')}>
              <Text style={[styles.commodityPriceDetail, { color: Theme.colors.primary }]}>Source: Union Budget (indiabudget.gov.in) ↗</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: 2 }} onPress={() => handleOpenLink('https://openbudgetsindia.org/')}>
              <Text style={[styles.commodityPriceDetail, { color: Theme.colors.primary }]}>Source: State Budgets (openbudgetsindia.org) ↗</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: 2 }} onPress={() => handleOpenLink('https://www.mplads.gov.in/')}>
              <Text style={[styles.commodityPriceDetail, { color: Theme.colors.primary }]}>Source: MPLADS Portal (mplads.gov.in) ↗</Text>
            </TouchableOpacity>
          </View>

          {/* In-app Upload Portal link */}
          <TouchableOpacity
            style={styles.inAppUploadLink}
            onPress={() => navigation.navigate('Crowdsource', { tab: 'audit' })}
          >
            <Text style={styles.inAppUploadLinkText}>
              Found new audit data or budget sheets? Upload details here ↗
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.explainButton}
            onPress={() => toggleExplanation('corruptionTax')}
          >
            <Text style={styles.explainButtonText}>
              {expandedExplanation === 'corruptionTax' ? 'Hide Math Formula ▲' : 'Show Math Formula ▼'}
            </Text>
          </TouchableOpacity>

          {expandedExplanation === 'corruptionTax' && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationTitle}>CORRUPTION TAX & AUDIT DISCREPANCY FORMULAS</Text>
              <Text style={styles.explanationText}>
                We distribute unspent budgets and audited discrepancies per voter across the constituency voting population:
              </Text>
              <Text style={styles.formulaText}>
                Central Gov Tax = ((Central Alloc - Central Util) * 10^7) / Voting Pop{'\n'}
                = ({(budget.central_allocated_crores - budget.central_utilized_crores).toFixed(1)} Cr * 10^7) / {activeConstituencyDetails?.voting_population.toLocaleString()} = Rs.{politician.personal_loss_central_rupees.toFixed(2)}{'\n\n'}
                State Gov Tax = ((State Alloc - State Util) * 10^7) / Voting Pop{'\n'}
                = ({(budget.state_allocated_crores - budget.state_utilized_crores).toFixed(1)} Cr * 10^7) / {activeConstituencyDetails?.voting_population.toLocaleString()} = Rs.{politician.personal_loss_state_rupees.toFixed(2)}{'\n\n'}
                Local MP Tax (MPLADS) = ((MPLADS Alloc - MPLADS Util) * 10^7) / Voting Pop{'\n'}
                = ({(budget.mplads_allocated_crores - budget.mplads_utilized_crores).toFixed(1)} Cr * 10^7) / {activeConstituencyDetails?.voting_population.toLocaleString()} = Rs.{politician.personal_loss_mplads_rupees.toFixed(2)}{'\n\n'}
                CAG Audit Tax = (Audit Discrepancies * 10^7) / Voting Pop{'\n'}
                = ({budget.audit_discrepancy_crores.toFixed(1)} Cr * 10^7) / {activeConstituencyDetails?.voting_population.toLocaleString()} = Rs.{politician.personal_loss_audit_rupees.toFixed(2)}{'\n\n'}
                Total Tax = Central Gov Tax + State Gov Tax + Local MP Tax + CAG Audit Tax{'\n'}
                = Rs.{politician.personal_loss_total_rupees.toFixed(2)} per voter
              </Text>
            </View>
          )}
        </View>

        {/* Citations Card: Data Verification Portal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>DATA CREDIBILITY & AUDITS</Text>
            <Text style={styles.cardTitle}>VERIFY SOURCE DATA</Text>
          </View>
          <Text style={styles.citationsDesc}>
            Jagrut relies entirely on verified open-source government registries and publications. Click any source portal below to inspect and audit the raw records yourself.
          </Text>

          <TouchableOpacity
            style={styles.citationRow}
            onPress={() => handleOpenLink('https://mospi.gov.in/periodic-labour-force-survey-plfs')}
          >
            <View style={styles.citationInfo}>
              <Text style={styles.citationName}>Periodic Labour Force Survey (PLFS)</Text>
              <Text style={styles.citationDetails}>MoSPI, Government of India (Official Monthly/Daily Wage Baselines Webpage)</Text>
            </View>
            <Text style={styles.citationLinkSymbol}>↗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.citationRow}
            onPress={() => handleOpenLink('https://fcainfoweb.nic.in/ereporting/Reports/Daily_Prices_Report.aspx')}
          >
            <View style={styles.citationInfo}>
              <Text style={styles.citationName}>Price Monitoring Division (PMD)</Text>
              <Text style={styles.citationDetails}>Ministry of Consumer Affairs (Daily Retail Prices Report Webpage)</Text>
            </View>
            <Text style={styles.citationLinkSymbol}>↗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.citationRow}
            onPress={() => handleOpenLink('https://affidavit.eci.gov.in/')}
          >
            <View style={styles.citationInfo}>
              <Text style={styles.citationName}>ECI Candidate Affidavit Portal</Text>
              <Text style={styles.citationDetails}>Election Commission of India (Official Sworn Assets Declarations Portal)</Text>
            </View>
            <Text style={styles.citationLinkSymbol}>↗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.citationRow}
            onPress={() => handleOpenLink('https://mplads.gov.in/mplads/Public/StateWisePerformance.aspx')}
          >
            <View style={styles.citationInfo}>
              <Text style={styles.citationName}>MPLADS Performance Reports</Text>
              <Text style={styles.citationDetails}>MoSPI, Government of India (Official State/Constituency Wise Performance Webpage)</Text>
            </View>
            <Text style={styles.citationLinkSymbol}>↗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.citationRow}
            onPress={() => handleOpenLink('https://cag.gov.in/en/audit-report')}
          >
            <View style={styles.citationInfo}>
              <Text style={styles.citationName}>CAG Audit Reports Search</Text>
              <Text style={styles.citationDetails}>Comptroller & Auditor General of India (Official Audit Reports Webpage)</Text>
            </View>
            <Text style={styles.citationLinkSymbol}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* Onboarding Screen Return */}
        <TouchableOpacity
          style={styles.crowdsourceFooterButton}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={styles.crowdsourceFooterButtonText}>
            CHANGE DEMOGRAPHICS OR CONSTITUENCY
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    padding: Theme.spacing.m,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.l,
  },
  errorText: {
    ...Theme.typography.h3,
    color: Theme.colors.danger,
    marginBottom: Theme.spacing.l,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  cardDark: {
    backgroundColor: Theme.colors.surfaceDark,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: Theme.spacing.s,
    marginBottom: Theme.spacing.m,
  },
  cardLabel: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  cardTitle: {
    ...Theme.typography.h3,
    fontWeight: '800',
    marginTop: Theme.spacing.xs,
  },
  statContainer: {
    alignItems: 'center',
    marginVertical: Theme.spacing.m,
  },
  statLabel: {
    ...Theme.typography.caption,
    fontSize: 10,
    marginTop: Theme.spacing.xs,
  },
  statementText: {
    ...Theme.typography.body1,
    lineHeight: 22,
    marginBottom: Theme.spacing.m,
  },
  detailsTable: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: Theme.spacing.s,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.s,
  },
  tableCellLabel: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  tableCellValue: {
    ...Theme.typography.body2,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  auditNotes: {
    ...Theme.typography.body2,
    fontStyle: 'italic',
    color: Theme.colors.danger,
    marginTop: Theme.spacing.xs,
    fontSize: 12,
  },
  affidavitButton: {
    backgroundColor: Theme.colors.primary,
    padding: Theme.spacing.m,
    alignItems: 'center',
    marginTop: Theme.spacing.m,
  },
  affidavitButtonText: {
    ...Theme.typography.body2,
    color: Theme.colors.background,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: Theme.colors.warning,
    padding: Theme.spacing.m,
    alignItems: 'center',
    marginTop: Theme.spacing.m,
  },
  outlineButtonText: {
    ...Theme.typography.body2,
    color: Theme.colors.warning,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: Theme.colors.textPrimary,
    padding: Theme.spacing.m,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.textPrimary,
  },
  primaryButtonText: {
    ...Theme.typography.body1,
    color: Theme.colors.background,
    fontWeight: '800',
  },
  missingRepContainer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.m,
  },
  missingRepTitle: {
    ...Theme.typography.caption,
    color: Theme.colors.warning,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: Theme.spacing.s,
  },
  missingRepText: {
    ...Theme.typography.body2,
    color: Theme.colors.textInverse,
    textAlign: 'center',
    marginBottom: Theme.spacing.m,
    lineHeight: 18,
  },
  crowdsourceFooterButton: {
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
    alignItems: 'center',
    marginVertical: Theme.spacing.m,
  },
  crowdsourceFooterButtonText: {
    ...Theme.typography.caption,
    color: Theme.colors.textPrimary,
    fontWeight: '800',
  },
  explainButton: {
    alignSelf: 'center',
    marginTop: Theme.spacing.m,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: Theme.spacing.s,
    paddingHorizontal: Theme.spacing.m,
  },
  explainButtonText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  explanationBox: {
    marginTop: Theme.spacing.m,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
  },
  explanationTitle: {
    ...Theme.typography.caption,
    fontWeight: '800',
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.s,
  },
  explanationText: {
    ...Theme.typography.body2,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Theme.spacing.s,
  },
  formulaText: {
    fontFamily: 'monospace',
    fontSize: 11,
    backgroundColor: '#EAEAEA',
    padding: Theme.spacing.s,
    marginBottom: Theme.spacing.s,
    lineHeight: 16,
  },
  citationsDesc: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.m,
    lineHeight: 18,
  },
  citationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  citationInfo: {
    flex: 1,
    paddingRight: Theme.spacing.m,
  },
  citationName: {
    ...Theme.typography.body2,
    fontWeight: '700',
  },
  citationDetails: {
    ...Theme.typography.caption,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'none',
  },
  citationLinkSymbol: {
    ...Theme.typography.h3,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  timeframeBox: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  timeframeText: {
    ...Theme.typography.caption,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    lineHeight: 14,
    textTransform: 'none',
  },
  summaryCard: {
    backgroundColor: Theme.colors.background,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  summaryHeader: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: Theme.spacing.xs,
  },
  summarySubheader: {
    ...Theme.typography.caption,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.m,
    textTransform: 'none',
  },
  summaryBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.s,
  },
  summaryBulletNumber: {
    ...Theme.typography.body2,
    fontWeight: '800',
    backgroundColor: Theme.colors.primary,
    color: Theme.colors.background,
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: 'center',
    lineHeight: 18,
    marginRight: Theme.spacing.s,
    fontSize: 11,
    overflow: 'hidden',
  },
  summaryBulletText: {
    ...Theme.typography.body2,
    flex: 1,
    color: Theme.colors.textPrimary,
    lineHeight: 18,
  },
  commodityPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  commodityPriceInfo: {
    flex: 1,
    paddingRight: Theme.spacing.s,
  },
  commodityPriceName: {
    ...Theme.typography.body2,
    fontWeight: '700',
  },
  commodityPriceDetail: {
    ...Theme.typography.caption,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'none',
  },
  commodityVerifyLinkContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  commodityVerifyLink: {
    ...Theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.primary,
    textTransform: 'none',
  },
  inAppUploadLink: {
    marginTop: Theme.spacing.m,
    alignItems: 'center',
    padding: Theme.spacing.s,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    borderStyle: 'dashed',
  },
  inAppUploadLinkText: {
    ...Theme.typography.caption,
    fontSize: 10,
    color: Theme.colors.primary,
    fontWeight: '700',
    textTransform: 'none',
  },
  inAppUploadLinkDark: {
    marginTop: Theme.spacing.m,
    alignItems: 'center',
    padding: Theme.spacing.s,
    borderWidth: 1,
    borderColor: Theme.colors.warning,
    borderStyle: 'dashed',
  },
  inAppUploadLinkTextDark: {
    ...Theme.typography.caption,
    fontSize: 10,
    color: Theme.colors.warning,
    fontWeight: '700',
    textTransform: 'none',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.s,
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.borderDark,
    marginBottom: Theme.spacing.xs,
  },
  tableHeaderCellLabel: {
    ...Theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    flex: 1,
  },
  tableHeaderCellValue: {
    ...Theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  tableRowWithSub: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingVertical: Theme.spacing.s,
  },
  tableRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableCellSub: {
    ...Theme.typography.caption,
    fontSize: 9,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'none',
  },
});
