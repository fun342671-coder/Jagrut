import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Theme } from '../theme';

interface UploadAffidavitProps {
  navigation: any;
  route?: any;
}

type IngestionType = 'affidavit' | 'price' | 'audit';

export default function UploadAffidavitScreen({ navigation, route }: UploadAffidavitProps) {
  const {
    constituencies,
    commodities,
    constituencyId,
    addAffidavitOverride,
    addPriceOverride,
    addAuditOverride,
    clearOverrides,
    localAffidavitOverrides,
    localPriceOverrides,
    localAuditOverrides
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<IngestionType>('affidavit');
  
  // Sync tab with navigation params if routed from another page
  React.useEffect(() => {
    if (route?.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route?.params?.tab]);
  
  // File Upload Simulation States
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [hasParsed, setHasParsed] = useState(false);

  // Form Fields - Affidavit
  const [selectedCid, setSelectedCid] = useState<number>(constituencyId || 1);
  const [repName, setRepName] = useState('');
  const [party, setParty] = useState('');
  const [assetsCurrent, setAssetsCurrent] = useState('');
  const [assetsPrevious, setAssetsPrevious] = useState('');
  const [criminalCases, setCriminalCases] = useState('');

  // Form Fields - Price
  const [selectedCommId, setSelectedCommId] = useState<number>(1);
  const [priceCurrent, setPriceCurrent] = useState('');

  // Form Fields - Audit
  const [auditCentralAlloc, setAuditCentralAlloc] = useState('');
  const [auditCentralUtil, setAuditCentralUtil] = useState('');
  const [auditStateAlloc, setAuditStateAlloc] = useState('');
  const [auditStateUtil, setAuditStateUtil] = useState('');
  const [auditDiscrepancy, setAuditDiscrepancy] = useState('');

  // Modals for selection
  const [constituencyModalVisible, setConstituencyModalVisible] = useState(false);
  const [commodityModalVisible, setCommodityModalVisible] = useState(false);

  const selectedConstituency = constituencies.find(c => c.id === selectedCid);
  const selectedCommodity = commodities.find(c => c.id === selectedCommId);

  const resetForm = () => {
    setSelectedFile(null);
    setHasParsed(false);
    setIsParsing(false);
    
    // Reset inputs
    setRepName('');
    setParty('');
    setAssetsCurrent('');
    setAssetsPrevious('');
    setCriminalCases('');
    setPriceCurrent('');
    setAuditCentralAlloc('');
    setAuditCentralUtil('');
    setAuditStateAlloc('');
    setAuditStateUtil('');
    setAuditDiscrepancy('');
  };

  const handleTabChange = (tab: IngestionType) => {
    setActiveTab(tab);
    resetForm();
  };

  const handleSimulateUpload = () => {
    let mockFileName = '';
    if (activeTab === 'affidavit') {
      mockFileName = `affidavit_${selectedConstituency?.name.toLowerCase().replace(/ /g, '_')}_2024.pdf`;
    } else if (activeTab === 'price') {
      mockFileName = `grocery_bill_july_2026.jpg`;
    } else {
      mockFileName = `cag_audit_report_${selectedConstituency?.name.toLowerCase().replace(/ /g, '_')}.pdf`;
    }

    setSelectedFile(mockFileName);
    setIsParsing(true);

    // Simulate OCR / Local Parsing pipeline
    setTimeout(() => {
      setIsParsing(false);
      setHasParsed(true);

      // Auto-fill mock/extracted values from the document
      if (activeTab === 'affidavit') {
        const defaultRepNames: Record<number, string> = {
          1: 'Arvind Sawant', 2: 'Piyush Goyal', 3: 'Tejasvi Surya', 
          4: 'Bansuri Swaraj', 5: 'Asaduddin Owaisi', 6: 'Murlidhar Mohol',
          7: 'Thamizhachi Thangapandian', 8: 'Mala Roy', 9: 'Rajnath Singh',
          10: 'Hasmukhbhai Patel', 11: 'Shobha Karandlaje', 12: 'Dineshchandra Anavadiya'
        };
        const defaultParties: Record<number, string> = {
          1: 'Shiv Sena (UBT)', 2: 'BJP', 3: 'BJP', 4: 'BJP', 5: 'AIMIM', 6: 'BJP',
          7: 'DMK', 8: 'AITC', 9: 'BJP', 10: 'BJP', 11: 'BJP', 12: 'BJP'
        };
        
        setRepName(defaultRepNames[selectedCid] || 'Rajesh Kumar');
        setParty(defaultParties[selectedCid] || 'Independent');
        setAssetsCurrent('15.5');
        setAssetsPrevious('8.2');
        setCriminalCases('1');
      } else if (activeTab === 'price') {
        const comm = commodities.find(c => c.id === selectedCommId);
        if (comm) {
          // Suggest a slightly higher/adjusted price
          setPriceCurrent((comm.price_current * 1.15).toFixed(2));
        }
      } else {
        // Audit
        setAuditCentralAlloc('130');
        setAuditCentralUtil('90');
        setAuditStateAlloc('160');
        setAuditStateUtil('110');
        setAuditDiscrepancy('18.5');
      }
    }, 1500);
  };

  const handleSubmit = async () => {
    if (activeTab === 'affidavit') {
      if (!repName || !party || !assetsCurrent || !assetsPrevious) {
        Alert.alert('Incomplete Form', 'Please provide representative name, party, current and previous asset values.');
        return;
      }
      
      const curr = parseFloat(assetsCurrent);
      const prev = parseFloat(assetsPrevious);
      const cases = parseInt(criminalCases) || 0;

      if (isNaN(curr) || isNaN(prev)) {
        Alert.alert('Invalid Assets', 'Assets must be valid decimal numbers (Crores).');
        return;
      }

      await addAffidavitOverride(selectedCid, repName, party, curr, prev, cases);
      Alert.alert(
        'Ingestion Successful', 
        `Candidate affidavit override saved locally for ${selectedConstituency?.name}. Calculations updated!`,
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
    } else if (activeTab === 'price') {
      if (!priceCurrent) {
        Alert.alert('Incomplete Form', 'Please provide a current price.');
        return;
      }

      const pr = parseFloat(priceCurrent);
      if (isNaN(pr) || pr <= 0) {
        Alert.alert('Invalid Price', 'Price must be a positive number.');
        return;
      }

      await addPriceOverride(selectedCommId, pr);
      Alert.alert(
        'Ingestion Successful', 
        `Price override of Rs.${pr} saved locally for ${selectedCommodity?.name}. Basket calculations updated!`,
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
    } else {
      // Audit
      if (!auditCentralAlloc || !auditCentralUtil || !auditStateAlloc || !auditStateUtil || !auditDiscrepancy) {
        Alert.alert('Incomplete Form', 'Please fill in all allocation, utilization, and discrepancy fields.');
        return;
      }

      const ca = parseFloat(auditCentralAlloc);
      const cu = parseFloat(auditCentralUtil);
      const sa = parseFloat(auditStateAlloc);
      const su = parseFloat(auditStateUtil);
      const ad = parseFloat(auditDiscrepancy);

      if (isNaN(ca) || isNaN(cu) || isNaN(sa) || isNaN(su) || isNaN(ad)) {
        Alert.alert('Invalid Budgets', 'Budget and discrepancy values must be valid numbers (Crores).');
        return;
      }

      await addAuditOverride(selectedCid, ca, cu, sa, su, ad);
      Alert.alert(
        'Ingestion Successful', 
        `Audit budget overrides saved locally for ${selectedConstituency?.name}. Discrepancy calculations updated!`,
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Reset Data',
      'Are you sure you want to delete all local overrides and reset the database to the official seed values?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            await clearOverrides();
            resetForm();
            Alert.alert('Database Reset', 'All user overrides cleared. App returned to official government data sources.');
          }
        }
      ]
    );
  };

  // Check if there are active overrides
  const totalOverrides = Object.keys(localAffidavitOverrides).length + 
                         Object.keys(localPriceOverrides).length + 
                         Object.keys(localAuditOverrides).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.title}>CROWDSOURCED UPLOAD PORTAL</Text>
          <Text style={styles.tag}>INTEGRITY DATA INGESTION ENGINE</Text>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'affidavit' && styles.tabActive]}
            onPress={() => handleTabChange('affidavit')}
          >
            <Text style={[styles.tabText, activeTab === 'affidavit' && styles.tabTextActive]}>AFFIDAVIT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'price' && styles.tabActive]}
            onPress={() => handleTabChange('price')}
          >
            <Text style={[styles.tabText, activeTab === 'price' && styles.tabTextActive]}>PRICE STMT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'audit' && styles.tabActive]}
            onPress={() => handleTabChange('audit')}
          >
            <Text style={[styles.tabText, activeTab === 'audit' && styles.tabTextActive]}>AUDIT REPORT</Text>
          </TouchableOpacity>
        </View>

        {/* Info Text */}
        <Text style={styles.sectionDesc}>
          {activeTab === 'affidavit' && 'Upload candidate asset declarations (sworn ECI affidavits) to override local representative net-worth increase data.'}
          {activeTab === 'price' && 'Upload a local retail price receipt or statement to update essential commodity pricing matrices for purchasing power calculations.'}
          {activeTab === 'audit' && 'Upload CAG audits or state/central budget sheets to override constituency allocations and compare discrepancies.'}
        </Text>

        {/* Step 1: Selection Dropdowns */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {activeTab === 'price' ? 'SELECT COMMODITY TO OVERRIDE' : 'SELECT TARGET CONSTITUENCY'}
          </Text>
          {activeTab === 'price' ? (
            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => setCommodityModalVisible(true)}
            >
              <Text style={styles.dropdownBtnText}>
                {selectedCommodity ? `${selectedCommodity.name} (Rs.${selectedCommodity.price_current}/${selectedCommodity.unit})` : 'Select Commodity'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => setConstituencyModalVisible(true)}
            >
              <Text style={styles.dropdownBtnText}>
                {selectedConstituency ? selectedConstituency.name : 'Select Constituency'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step 2: Telegram Deep Link Handoff */}
        <View style={styles.uploadBox}>
          <Text style={styles.uploadTitle}>SECURE DOCUMENT INGESTION</Text>
          
          <TouchableOpacity 
            style={styles.fileDropzone} 
            onPress={() => {
              const telegramUrl = `tg://resolve?domain=JagrutBot&start=c_${selectedCid}`;
              import('react-native').then(({ Linking }) => {
                Linking.openURL(telegramUrl).catch(() => {
                  Linking.openURL(`https://t.me/JagrutBot?start=c_${selectedCid}`);
                });
              });
            }}
          >
            <Text style={styles.uploadIcon}>🚀</Text>
            <Text style={styles.uploadMainText}>Submit via Secure Telegram Bot</Text>
            <Text style={styles.uploadSubtext}>Opens Telegram directly with your constituency pre-loaded.</Text>
          </TouchableOpacity>
          
          <Text style={{...Theme.typography.caption, marginTop: Theme.spacing.s, color: Theme.colors.textSecondary, textAlign: 'center', textTransform: 'none'}}>
            Fallback link: https://t.me/JagrutBot?start=c_{selectedCid}
          </Text>
        </View>

        {/* Step 3: Verified Data Inputs (Appears after mock parsing) */}
        {hasParsed && (
          <View style={styles.dataForm}>
            <Text style={styles.formTitle}>EXTRACTED DATA VERIFICATION (MANUAL REVIEW)</Text>
            
            {activeTab === 'affidavit' && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Representative Name</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={repName}
                    onChangeText={setRepName}
                    placeholder="Enter Candidate Name"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Party</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={party}
                    onChangeText={setParty}
                    placeholder="e.g. BJP, INC, Independent"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Declared Current Assets (Crores INR)</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={assetsCurrent}
                    onChangeText={setAssetsCurrent}
                    keyboardType="numeric"
                    placeholder="Current assets in Crores"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Declared Previous Assets (5 Yrs Ago, Crores INR)</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={assetsPrevious}
                    onChangeText={setAssetsPrevious}
                    keyboardType="numeric"
                    placeholder="Previous assets in Crores"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Pending Criminal Cases</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={criminalCases}
                    onChangeText={setCriminalCases}
                    keyboardType="numeric"
                    placeholder="Count of pending cases"
                  />
                </View>
              </View>
            )}

            {activeTab === 'price' && (
              <View>
                <Text style={styles.selectedCommInfo}>
                  Commodity: {selectedCommodity?.name} (Category: {selectedCommodity?.category})
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verified Current Price (in INR per {selectedCommodity?.unit})</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={priceCurrent}
                    onChangeText={setPriceCurrent}
                    keyboardType="numeric"
                    placeholder={`Price in Rs. per ${selectedCommodity?.unit}`}
                  />
                </View>
              </View>
            )}

            {activeTab === 'audit' && (
              <View>
                <Text style={styles.sectionHeader}>CENTRAL GOVERNMENT BUDGET</Text>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Allocated (Cr)</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={auditCentralAlloc}
                      onChangeText={setAuditCentralAlloc}
                      keyboardType="numeric"
                      placeholder="Central allocation"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Utilized (Cr)</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={auditCentralUtil}
                      onChangeText={setAuditCentralUtil}
                      keyboardType="numeric"
                      placeholder="Central utilization"
                    />
                  </View>
                </View>

                <Text style={styles.sectionHeader}>STATE GOVERNMENT BUDGET</Text>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Allocated (Cr)</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={auditStateAlloc}
                      onChangeText={setAuditStateAlloc}
                      keyboardType="numeric"
                      placeholder="State allocation"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Utilized (Cr)</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={auditStateUtil}
                      onChangeText={setAuditStateUtil}
                      keyboardType="numeric"
                      placeholder="State utilization"
                    />
                  </View>
                </View>

                <Text style={styles.sectionHeader}>CAG AUDIT DISCREPANCY</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Flagged Discrepancies / Diversions (Crores INR)</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={auditDiscrepancy}
                    onChangeText={setAuditDiscrepancy}
                    keyboardType="numeric"
                    placeholder="Audit statement discrepancies"
                  />
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>SUBMIT TO LOCAL CALCULATIONS PIPELINE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Database Overrides Status & Reset */}
        {totalOverrides > 0 && (
          <View style={styles.overridesStatusCard}>
            <Text style={styles.overridesStatusText}>
              ACTIVE LOCAL OVERRIDES: {totalOverrides} (Data currently overriding database)
            </Text>
            <TouchableOpacity style={styles.resetBtn} onPress={handleClearAll}>
              <Text style={styles.resetBtnText}>RESET TO OFFICIAL GOVERNMENT DATA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Constituency Picker Modal */}
        <Modal
          visible={constituencyModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setConstituencyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>SELECT CONSTITUENCY</Text>
              <ScrollView style={styles.modalList}>
                {constituencies.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.modalItem, c.id === selectedCid && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedCid(c.id);
                      setConstituencyModalVisible(false);
                      resetForm();
                    }}
                  >
                    <Text style={[styles.modalItemText, c.id === selectedCid && styles.modalItemTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setConstituencyModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Commodity Picker Modal */}
        <Modal
          visible={commodityModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setCommodityModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>SELECT COMMODITY</Text>
              <ScrollView style={styles.modalList}>
                {commodities.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.modalItem, c.id === selectedCommId && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedCommId(c.id);
                      setCommodityModalVisible(false);
                      resetForm();
                    }}
                  >
                    <Text style={[styles.modalItemText, c.id === selectedCommId && styles.modalItemTextActive]}>
                      {c.name} (Rs.{c.price_current} / {c.unit})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCommodityModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  header: {
    marginBottom: Theme.spacing.m,
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.borderDark,
    paddingBottom: Theme.spacing.s,
  },
  title: {
    ...Theme.typography.h2,
    letterSpacing: 0.5,
  },
  tag: {
    ...Theme.typography.caption,
    color: Theme.colors.danger,
    marginTop: Theme.spacing.xs,
    fontWeight: '800',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    marginVertical: Theme.spacing.s,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.s,
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
  },
  tabActive: {
    backgroundColor: Theme.colors.textPrimary,
  },
  tabText: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  tabTextActive: {
    color: Theme.colors.background,
  },
  sectionDesc: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.m,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: Theme.spacing.m,
  },
  label: {
    ...Theme.typography.caption,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
    backgroundColor: Theme.colors.background,
  },
  dropdownBtnText: {
    ...Theme.typography.body1,
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  uploadBox: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  uploadTitle: {
    ...Theme.typography.caption,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: Theme.spacing.xs,
  },
  fileDropzone: {
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  uploadIcon: {
    fontSize: 32,
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.s,
  },
  uploadMainText: {
    ...Theme.typography.body1,
    fontWeight: '700',
  },
  uploadSubtext: {
    ...Theme.typography.caption,
    fontSize: 10,
    marginTop: Theme.spacing.xs,
    textTransform: 'none',
  },
  fileStatusContainer: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
  },
  fileName: {
    ...Theme.typography.body2,
    fontWeight: '700',
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.s,
    fontFamily: 'monospace',
  },
  parsingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parsingText: {
    ...Theme.typography.body2,
    color: Theme.colors.primary,
    marginLeft: Theme.spacing.s,
    fontStyle: 'italic',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIcon: {
    color: Theme.colors.success,
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: Theme.spacing.s,
  },
  successText: {
    ...Theme.typography.body2,
    color: Theme.colors.success,
    fontWeight: '600',
  },
  dataForm: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  formTitle: {
    ...Theme.typography.caption,
    fontWeight: '800',
    color: Theme.colors.danger,
    marginBottom: Theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: Theme.spacing.xs,
  },
  selectedCommInfo: {
    ...Theme.typography.body2,
    fontWeight: '700',
    marginBottom: Theme.spacing.s,
  },
  sectionHeader: {
    ...Theme.typography.caption,
    fontWeight: '800',
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.s,
    marginBottom: Theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: Theme.spacing.s,
  },
  inputLabel: {
    ...Theme.typography.caption,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'none',
  },
  textInput: {
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.s,
    fontSize: 14,
    color: Theme.colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: Theme.colors.textPrimary,
    padding: Theme.spacing.m,
    alignItems: 'center',
    marginTop: Theme.spacing.m,
    borderWidth: 2,
    borderColor: Theme.colors.textPrimary,
  },
  submitBtnText: {
    ...Theme.typography.body2,
    color: Theme.colors.background,
    fontWeight: '800',
  },
  overridesStatusCard: {
    borderWidth: 2,
    borderColor: Theme.colors.warning,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.xl,
    backgroundColor: '#FFFDF0',
  },
  overridesStatusText: {
    ...Theme.typography.caption,
    color: Theme.colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Theme.spacing.s,
  },
  resetBtn: {
    backgroundColor: Theme.colors.danger,
    padding: Theme.spacing.m,
    alignItems: 'center',
  },
  resetBtnText: {
    ...Theme.typography.body2,
    color: Theme.colors.background,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.m,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Theme.colors.background,
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
  },
  modalTitle: {
    ...Theme.typography.caption,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.m,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.borderDark,
    paddingBottom: Theme.spacing.s,
  },
  modalList: {
    marginBottom: Theme.spacing.m,
  },
  modalItem: {
    padding: Theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalItemActive: {
    backgroundColor: Theme.colors.surface,
  },
  modalItemText: {
    ...Theme.typography.body1,
    fontWeight: '500',
  },
  modalItemTextActive: {
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  modalCloseBtn: {
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    ...Theme.typography.body2,
    fontWeight: '800',
  },
});
