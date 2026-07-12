import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Theme } from '../theme';

interface BasketBuilderProps {
  navigation: any;
}

export default function BasketBuilderScreen({ navigation }: BasketBuilderProps) {
  const { commodities, basketItems, setBasketItems } = useAppStore();

  const handleToggleItem = (commodityId: number) => {
    const existingIndex = basketItems.findIndex(item => item.commodity_id === commodityId);
    if (existingIndex > -1) {
      // Remove item
      const newItems = basketItems.filter(item => item.commodity_id !== commodityId);
      setBasketItems(newItems);
    } else {
      // Add item with default estimated monthly quantity
      const comm = commodities.find(c => c.id === commodityId);
      const defaultQty = comm ? comm.default_monthly_quantity : 1;
      const newItems = [...basketItems, { commodity_id: commodityId, quantity: defaultQty }];
      setBasketItems(newItems);
    }
  };

  const handleAdjustQuantity = (commodityId: number, delta: number) => {
    const newItems = basketItems.map(item => {
      if (item.commodity_id === commodityId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setBasketItems(newItems);
  };

  const isChecked = (commodityId: number) => {
    return basketItems.some(item => item.commodity_id === commodityId);
  };

  const getItemQuantity = (commodityId: number) => {
    const item = basketItems.find(i => i.commodity_id === commodityId);
    return item ? item.quantity : 0;
  };

  // Group commodities by category
  const categories: { [key: string]: any[] } = {};
  commodities.forEach(c => {
    if (!categories[c.category]) {
      categories[c.category] = [];
    }
    categories[c.category].push(c);
  });

  const handleCalculate = () => {
    if (basketItems.length === 0) {
      Alert.alert('Empty Basket', 'Please select at least one item to build your basket.');
      return;
    }
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>HOUSEHOLD CONSUMPTION</Text>
          <Text style={styles.description}>
            Select the standard necessities you regularly purchase. Pre-filled values represent the estimated monthly consumption for a median household.
          </Text>
        </View>

        {Object.keys(categories).map(catName => (
          <View key={catName} style={styles.categorySection}>
            <Text style={styles.categoryHeader}>{catName.toUpperCase()}</Text>
            {categories[catName].map(item => {
              const checked = isChecked(item.id);
              const qty = getItemQuantity(item.id);

              return (
                <View key={item.id} style={[styles.itemRow, checked && styles.itemRowActive]}>
                  <TouchableOpacity
                    style={styles.itemInfo}
                    onPress={() => handleToggleItem(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>
                        Rs.{item.price_current} / {item.unit}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {checked && (
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleAdjustQuantity(item.id, -1)}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>
                        {qty} {item.unit}
                      </Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleAdjustQuantity(item.id, 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleCalculate}>
          <Text style={styles.primaryButtonText}>
            CALCULATE IMPACT ({basketItems.length} ITEMS) →
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100, // extra padding for bottom button
  },
  header: {
    marginBottom: Theme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: Theme.spacing.m,
  },
  title: {
    ...Theme.typography.h2,
    letterSpacing: 1,
  },
  description: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
    lineHeight: 20,
  },
  categorySection: {
    marginBottom: Theme.spacing.l,
  },
  categoryHeader: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: Theme.spacing.s,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.textPrimary,
    paddingLeft: Theme.spacing.s,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.m,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.s,
    backgroundColor: Theme.colors.background,
  },
  itemRowActive: {
    borderColor: Theme.colors.textPrimary,
    backgroundColor: Theme.colors.surface,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
    marginRight: Theme.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Theme.colors.textPrimary,
  },
  checkboxTick: {
    color: Theme.colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  textContainer: {
    flex: 1,
  },
  itemName: {
    ...Theme.typography.body1,
    fontWeight: '600',
  },
  itemPrice: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.borderDark,
    height: 36,
  },
  qtyBtn: {
    width: 32,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.border,
  },
  qtyBtnText: {
    ...Theme.typography.h3,
    fontWeight: 'bold',
  },
  qtyText: {
    ...Theme.typography.body2,
    fontWeight: '700',
    paddingHorizontal: Theme.spacing.s,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.colors.background,
    borderTopWidth: 2,
    borderTopColor: Theme.colors.borderDark,
    padding: Theme.spacing.m,
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
    letterSpacing: 1,
  },
});
