import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// For local development, this could point to a local HTTP server serving the public directory
// For production, this will point to the GitHub Pages URL
export const API_BASE_URL = 'http://localhost:8081'; 

export const getAnonymousUUID = async (): Promise<string> => {
  let uuid = await AsyncStorage.getItem('@jagrut_uuid');
  if (!uuid) {
    uuid = Crypto.randomUUID();
    await AsyncStorage.setItem('@jagrut_uuid', uuid);
  }
  return uuid;
};

let cachedApiData: any = null;

export const fetchPublicApi = async () => {
  if (cachedApiData) return cachedApiData;

  try {
    const response = await fetch(`${API_BASE_URL}/public_api.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache', // Ensure we get the latest daily build
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch static API: ${response.status}`);
    }

    const data = await response.json();
    cachedApiData = data;
    return data;
  } catch (error) {
    console.error("Error fetching static API:", error);
    throw error;
  }
};

export const getProfessions = async () => {
  const data = await fetchPublicApi();
  return data.professions;
};

export const getConstituencies = async () => {
  const data = await fetchPublicApi();
  return data.constituencies;
};

export const getCommodities = async () => {
  const data = await fetchPublicApi();
  // Transform flat commodities array into category grouped structure if UI expects it
  const categories: Record<string, any[]> = {};
  data.commodities.forEach((c: any) => {
    if (!categories[c.category]) categories[c.category] = [];
    categories[c.category].push(c);
  });
  return { categories };
};

// Stateless local saving of basket
export const saveBasketLocally = async (uuid: string, professionId: number, constituencyId: number, items: {commodity_id: number, quantity: number}[]) => {
  const state = {
    uuid,
    professionId,
    constituencyId,
    items,
  };
  await AsyncStorage.setItem('@jagrut_user_state', JSON.stringify(state));
  return { status: 'saved_locally', items_count: items.length };
};

export const getLocalBasket = async () => {
  const stateStr = await AsyncStorage.getItem('@jagrut_user_state');
  if (stateStr) {
    return JSON.parse(stateStr);
  }
  return null;
};
