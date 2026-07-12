import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Theme } from '../theme';

interface OnboardingProps {
  navigation: any;
}

export default function OnboardingScreen({ navigation }: OnboardingProps) {
  const {
    uuid,
    professions,
    constituencies,
    professionId,
    constituencyId,
    isLoading,
    error,
    initializeStore,
    setProfessionId,
    setConstituencyId
  } = useAppStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [professionModalVisible, setProfessionModalVisible] = useState(false);
  const [constituencyModalVisible, setConstituencyModalVisible] = useState(false);

  useEffect(() => {
    // If we already have a UUID and selections saved, we can skip or show them loaded
    if (uuid) {
      setStep(2);
    }
  }, [uuid]);

  const handleGenerateID = async () => {
    await initializeStore();
    setStep(2);
  };

  const handleNext = () => {
    if (!professionId) {
      Alert.alert('Selection Required', 'Please select your profession.');
      return;
    }
    if (!constituencyId) {
      Alert.alert('Selection Required', 'Please select your constituency.');
      return;
    }
    navigation.navigate('BasketBuilder');
  };

  const selectedProfession = professions.find(p => p.id === professionId);
  const selectedConstituency = constituencies.find(c => c.id === constituencyId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.textPrimary} />
        <Text style={[Theme.typography.body2, { marginTop: Theme.spacing.m }]}>Loading static data engine...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>JAGRUT</Text>
          <Text style={styles.tagline}>CIVIC EQUITY MONITOR</Text>
        </View>

        {step === 1 ? (
          <View style={styles.stepContainer}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>ZERO-KNOWLEDGE ARCHITECTURE</Text>
              <Text style={styles.infoText}>
                This system does not request, log, or store your Name, Email, Phone Number, or GPS location.
              </Text>
              <Text style={styles.infoText}>
                Your identity is cryptographically bound to a localized, device-generated UUID.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateID}>
              <Text style={styles.primaryButtonText}>GENERATE ANONYMOUS ID</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.stepContainer}>
            <Text style={styles.subtitle}>DEMOGRAPHIC MAPPING</Text>
            
            <View style={styles.uuidContainer}>
              <Text style={styles.uuidLabel}>YOUR ANONYMOUS UUID:</Text>
              <Text style={styles.uuidValue} numberOfLines={1} ellipsizeMode="middle">
                {uuid}
              </Text>
            </View>

            {/* Profession Dropdown */}
            <Text style={styles.label}>1. SELECT YOUR PROFESSION</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setProfessionModalVisible(true)}
            >
              <Text style={selectedProfession ? styles.dropdownText : styles.dropdownPlaceholder}>
                {selectedProfession ? selectedProfession.title : 'Choose profession...'}
              </Text>
            </TouchableOpacity>

            {/* Constituency Dropdown */}
            <Text style={styles.label}>2. SELECT YOUR CONSTITUENCY</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setConstituencyModalVisible(true)}
            >
              <Text style={selectedConstituency ? styles.dropdownText : styles.dropdownPlaceholder}>
                {selectedConstituency ? selectedConstituency.name : 'Choose constituency...'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>BUILD BASKET →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Profession Modal */}
      <Modal
        visible={professionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProfessionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SELECT PROFESSION</Text>
            <FlatList
              data={professions}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setProfessionId(item.id);
                    setProfessionModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.title}</Text>
                  <Text style={styles.modalItemSubtext}>
                    Daily wage: Rs.{item.median_wage_current} (Prev: Rs.{item.median_wage_5yr_ago})
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setProfessionModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Constituency Modal */}
      <Modal
        visible={constituencyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setConstituencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SELECT CONSTITUENCY</Text>
            <FlatList
              data={constituencies}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setConstituencyId(item.id);
                    setConstituencyModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setConstituencyModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    flex: 1,
    padding: Theme.spacing.l,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: Theme.spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.borderDark,
    paddingBottom: Theme.spacing.m,
  },
  logo: {
    ...Theme.typography.h1,
    letterSpacing: 4,
  },
  tagline: {
    ...Theme.typography.caption,
    letterSpacing: 2,
    marginTop: Theme.spacing.xs,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    marginTop: Theme.spacing.xl,
  },
  subtitle: {
    ...Theme.typography.h3,
    letterSpacing: 1,
    marginBottom: Theme.spacing.m,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.xl,
  },
  infoTitle: {
    ...Theme.typography.caption,
    color: Theme.colors.danger,
    fontWeight: '700',
    marginBottom: Theme.spacing.s,
  },
  infoText: {
    ...Theme.typography.body2,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.s,
    lineHeight: 20,
  },
  uuidContainer: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.m,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.l,
  },
  uuidLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginBottom: Theme.spacing.xs,
  },
  uuidValue: {
    ...Theme.typography.body2,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  label: {
    ...Theme.typography.caption,
    color: Theme.colors.textPrimary,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs,
    marginTop: Theme.spacing.m,
  },
  dropdown: {
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
    backgroundColor: Theme.colors.background,
    marginBottom: Theme.spacing.m,
  },
  dropdownPlaceholder: {
    ...Theme.typography.body1,
    color: Theme.colors.textSecondary,
  },
  dropdownText: {
    ...Theme.typography.body1,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: Theme.colors.textPrimary,
    padding: Theme.spacing.m,
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
    borderWidth: 2,
    borderColor: Theme.colors.textPrimary,
  },
  primaryButtonText: {
    ...Theme.typography.body1,
    color: Theme.colors.background,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Theme.borderRadius.large,
    borderTopRightRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    maxHeight: '80%',
  },
  modalTitle: {
    ...Theme.typography.h2,
    marginBottom: Theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: Theme.spacing.s,
  },
  modalItem: {
    paddingVertical: Theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalItemText: {
    ...Theme.typography.body1,
    fontWeight: '600',
  },
  modalItemSubtext: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
  },
  closeButton: {
    marginTop: Theme.spacing.m,
    padding: Theme.spacing.m,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
  },
  closeButtonText: {
    ...Theme.typography.body1,
    fontWeight: '700',
  },
});
