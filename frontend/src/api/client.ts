import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Sharded static API Base URL
export const API_BASE_URL = 'https://fun342671-coder.github.io/Jagrut/api/';

export const getAnonymousUUID = async (): Promise<string> => {
  let uuid = await AsyncStorage.getItem('@jagrut_uuid');
  if (!uuid) {
    uuid = Crypto.randomUUID();
    await AsyncStorage.setItem('@jagrut_uuid', uuid);
  }
  return uuid;
};

let cachedManifest: any = null;
let cachedCommodities: any = null;
const cachedConstituencies: Record<number, any> = {};

export const fetchManifest = async () => {
  if (cachedManifest) return cachedManifest;
  try {
    const response = await fetch(`${API_BASE_URL}manifest.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.status}`);
    const data = await response.json();
    cachedManifest = data;
    return data;
  } catch (error) {
    console.error("Error fetching manifest:", error);
    throw error;
  }
};

export const fetchCommodities = async () => {
  if (cachedCommodities) return cachedCommodities;
  try {
    const response = await fetch(`${API_BASE_URL}commodities.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch commodities: ${response.status}`);
    const data = await response.json();
    cachedCommodities = data;
    return data;
  } catch (error) {
    console.error("Error fetching commodities:", error);
    throw error;
  }
};

export const fetchConstituency = async (id: number) => {
  if (cachedConstituencies[id]) return cachedConstituencies[id];
  try {
    const response = await fetch(`${API_BASE_URL}constituencies/c_${id}.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch constituency ${id}: ${response.status}`);
    const data = await response.json();
    cachedConstituencies[id] = data;
    return data;
  } catch (error) {
    console.error(`Error fetching constituency ${id}:`, error);
    throw error;
  }
};

export const getProfessions = async () => {
  const data = await fetchManifest();
  return data.professions;
};

export const getConstituencies = async () => {
  const data = await fetchManifest();
  return data.constituencies;
};

export const getCommodities = async () => {
  const data = await fetchCommodities();
  const categories: Record<string, any[]> = {};
  data.forEach((c: any) => {
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
