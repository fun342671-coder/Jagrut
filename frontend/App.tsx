import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';

import { Theme } from './src/theme';
import { useAppStore } from './src/store/useAppStore';

// Import Screens
import OnboardingScreen from './src/screens/Onboarding';
import BasketBuilderScreen from './src/screens/BasketBuilder';
import DashboardScreen from './src/screens/ImpactDashboard';
import CrowdsourceScreen from './src/screens/UploadAffidavit';

const Stack = createNativeStackNavigator();

export default function App() {
  const initializeStore = useAppStore(state => state.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Theme.colors.surface },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BasketBuilder" component={BasketBuilderScreen} options={{ title: 'Build Your Basket' }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Impact Dashboard' }} />
        <Stack.Screen name="Crowdsource" component={CrowdsourceScreen} options={{ title: 'Upload Affidavit' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({});

