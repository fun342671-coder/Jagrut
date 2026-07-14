import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnonymousUUID } from '../api/client';

export const API_BASE_URL = 'https://fun342671-coder.github.io/Jagrut';

export interface Profession {
  id: number;
  title: string;
  median_wage_current: number;
  median_wage_5yr_ago: number;
}

export interface ConstituencyLookup {
  id: number;
  name: string;
}

export interface Representative {
  constituency_id: number;
  rep_name: string;
  party: string;
  declared_assets_current_cr: number;
  declared_assets_previous_cr: number;
  pending_criminal_cases: number;
  affidavit_url: string;
  verified_by_consensus: boolean;
}

export interface ConstituencyDetails {
  id: number;
  name: string;
  type: string;
  voting_population: number;
  mplads_allocated_crores: number;
  mplads_utilized_crores: number;
  mplads_unutilized_crores: number;
  central_allocated_crores: number;
  central_utilized_crores: number;
  central_unutilized_crores: number;
  state_allocated_crores: number;
  state_utilized_crores: number;
  state_unutilized_crores: number;
  total_budget_allocated_crores: number;
  total_budget_utilized_crores: number;
  budget_utilization_pct: number;
  audit_discrepancy_crores: number;
  audit_notes: string;
  representative: Representative | null;
}

export interface Commodity {
  id: number;
  name: string;
  category: string;
  price_current: number;
  price_5yr_ago: number;
  price_marketplace: number;
  unit: string;
  default_monthly_quantity: number;
  price_source_url: string;
}

export interface BasketItem {
  commodity_id: number;
  quantity: number;
}

interface AppState {
  uuid: string | null;
  professions: Profession[];
  constituencies: ConstituencyLookup[];
  commodities: Commodity[];
  rawCommodities: Commodity[]; // Un-overridden commodities cached from network
  rawConstituencyDetails: ConstituencyDetails | null; // Un-overridden active constituency
  professionId: number | null;
  constituencyId: number | null;
  basketItems: BasketItem[];
  activeConstituencyDetails: ConstituencyDetails | null;
  
  // Local Crowdsourced Overrides
  localAffidavitOverrides: Record<number, { rep_name: string, party: string, declared_assets_current_cr: number, declared_assets_previous_cr: number, pending_criminal_cases: number }>;
  localPriceOverrides: Record<number, number>;
  localAuditOverrides: Record<number, { central_allocated_crores: number, central_utilized_crores: number, state_allocated_crores: number, state_utilized_crores: number, audit_discrepancy_crores: number }>;

  isLoading: boolean;
  error: string | null;
  loadingConstituency: boolean;
  errorConstituency: string | null;

  initializeStore: () => Promise<void>;
  setProfessionId: (id: number) => Promise<void>;
  setConstituencyId: (id: number) => Promise<void>;
  setBasketItems: (items: BasketItem[]) => Promise<void>;
  clearBasket: () => Promise<void>;
  
  // Override Actions
  addAffidavitOverride: (constituencyId: number, repName: string, party: string, assetsCurrent: number, assetsPrevious: number, cases: number) => Promise<void>;
  addPriceOverride: (commodityId: number, priceCurrent: number) => Promise<void>;
  addAuditOverride: (constituencyId: number, centralAllocated: number, centralUtilized: number, stateAllocated: number, stateUtilized: number, auditDiscrepancy: number) => Promise<void>;
  clearOverrides: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  // Helper to merge overrides onto raw data
  const applyAllOverrides = (
    commodities: Commodity[],
    activeConstDetails: ConstituencyDetails | null,
    priceOverrides: Record<number, number>,
    affidavitOverrides: any,
    auditOverrides: any
  ) => {
    // 1. Merge price overrides onto commodities
    const mergedCommodities = commodities.map(c => {
      if (priceOverrides[c.id] !== undefined) {
        return {
          ...c,
          price_current: priceOverrides[c.id],
          price_marketplace: parseFloat((priceOverrides[c.id] * 1.03).toFixed(2))
        };
      }
      return c;
    });

    // 2. Merge audit and representative overrides onto active constituency details
    let mergedConstDetails = activeConstDetails ? { ...activeConstDetails } : null;
    if (mergedConstDetails) {
      const cid = mergedConstDetails.id;
      
      if (auditOverrides[cid]) {
        const aud = auditOverrides[cid];
        mergedConstDetails.central_allocated_crores = aud.central_allocated_crores;
        mergedConstDetails.central_utilized_crores = aud.central_utilized_crores;
        mergedConstDetails.central_unutilized_crores = parseFloat((aud.central_allocated_crores - aud.central_utilized_crores).toFixed(2));
        
        mergedConstDetails.state_allocated_crores = aud.state_allocated_crores;
        mergedConstDetails.state_utilized_crores = aud.state_utilized_crores;
        mergedConstDetails.state_unutilized_crores = parseFloat((aud.state_allocated_crores - aud.state_utilized_crores).toFixed(2));
        
        mergedConstDetails.audit_discrepancy_crores = aud.audit_discrepancy_crores;
        
        // Recalculate totals
        mergedConstDetails.total_budget_allocated_crores = parseFloat((mergedConstDetails.mplads_allocated_crores + aud.central_allocated_crores + aud.state_allocated_crores).toFixed(2));
        mergedConstDetails.total_budget_utilized_crores = parseFloat((mergedConstDetails.mplads_utilized_crores + aud.central_utilized_crores + aud.state_utilized_crores).toFixed(2));
        mergedConstDetails.budget_utilization_pct = parseFloat(((mergedConstDetails.total_budget_utilized_crores / mergedConstDetails.total_budget_allocated_crores) * 100).toFixed(1));
      }

      if (affidavitOverrides[cid]) {
        const aff = affidavitOverrides[cid];
        mergedConstDetails.representative = {
          constituency_id: cid,
          rep_name: aff.rep_name,
          party: aff.party,
          declared_assets_current_cr: aff.declared_assets_current_cr,
          declared_assets_previous_cr: aff.declared_assets_previous_cr,
          pending_criminal_cases: aff.pending_criminal_cases,
          affidavit_url: '',
          verified_by_consensus: true
        };
      }
    }

    return {
      commodities: mergedCommodities,
      activeConstituencyDetails: mergedConstDetails
    };
  };

  return {
    uuid: null,
    professions: [],
    constituencies: [],
    commodities: [],
    rawCommodities: [],
    rawConstituencyDetails: null,
    professionId: null,
    constituencyId: null,
    basketItems: [],
    activeConstituencyDetails: null,
    
    localAffidavitOverrides: {},
    localPriceOverrides: {},
    localAuditOverrides: {},
    
    isLoading: false,
    error: null,
    loadingConstituency: false,
    errorConstituency: null,

    initializeStore: async () => {
      set({ isLoading: true, error: null });
      try {
        // 1. Get/Generate Anonymous UUID
        const uuid = await getAnonymousUUID();
        set({ uuid });

        // 2. Load Local Overrides from AsyncStorage
        let priceOverrides = {};
        let affidavitOverrides = {};
        let auditOverrides = {};

        try {
          const pOvStr = await AsyncStorage.getItem('@jagrut_price_overrides');
          if (pOvStr) priceOverrides = JSON.parse(pOvStr);
          const aOvStr = await AsyncStorage.getItem('@jagrut_affidavit_overrides');
          if (aOvStr) affidavitOverrides = JSON.parse(aOvStr);
          const auOvStr = await AsyncStorage.getItem('@jagrut_audit_overrides');
          if (auOvStr) auditOverrides = JSON.parse(auOvStr);
          
          set({
            localPriceOverrides: priceOverrides,
            localAffidavitOverrides: affidavitOverrides,
            localAuditOverrides: auditOverrides
          });
        } catch (err) {
          console.warn("Failed to load local overrides:", err);
        }

        // 3. Hydrate from Cache First
        let manifestData = null;
        let commoditiesData = null;

        try {
          const cachedManifest = await AsyncStorage.getItem('@jagrut_manifest_cache');
          if (cachedManifest) {
            manifestData = JSON.parse(cachedManifest);
            set({
              professions: manifestData.professions || [],
              constituencies: manifestData.constituencies || []
            });
          }
          
          const cachedCommodities = await AsyncStorage.getItem('@jagrut_commodities_cache');
          if (cachedCommodities) {
            commoditiesData = JSON.parse(cachedCommodities);
            set({ rawCommodities: commoditiesData });
            const merged = applyAllOverrides(
              commoditiesData,
              null,
              priceOverrides,
              affidavitOverrides,
              auditOverrides
            );
            set({ commodities: merged.commodities });
          }
          
          if (manifestData && commoditiesData) {
            set({ isLoading: false });
          }
        } catch (err) {
          console.warn("Failed to load initial cache:", err);
        }

        // 4. Background Network Validation
        (async () => {
          try {
            const manifestRes = await fetch(`${API_BASE_URL}/api/manifest.json`);
            if (manifestRes.ok) {
              const remoteManifest = await manifestRes.json();
              if (!manifestData || remoteManifest.revised_timestamp > (manifestData.revised_timestamp || 0)) {
                await AsyncStorage.setItem('@jagrut_manifest_cache', JSON.stringify(remoteManifest));
                set({
                  professions: remoteManifest.professions || [],
                  constituencies: remoteManifest.constituencies || []
                });

                const commoditiesRes = await fetch(`${API_BASE_URL}/api/commodities.json`);
                if (commoditiesRes.ok) {
                  const remoteCommodities = await commoditiesRes.json();
                  await AsyncStorage.setItem('@jagrut_commodities_cache', JSON.stringify(remoteCommodities));
                  set({ rawCommodities: remoteCommodities });
                  const merged = applyAllOverrides(
                    remoteCommodities,
                    get().rawConstituencyDetails,
                    get().localPriceOverrides,
                    get().localAffidavitOverrides,
                    get().localAuditOverrides
                  );
                  set({ commodities: merged.commodities });
                }
              }
            }
          } catch (err) {
            console.warn("Background validation failed:", err);
          } finally {
            set({ isLoading: false });
          }
        })();

        // Selection starts fresh
        set({
          professionId: null,
          constituencyId: null,
          basketItems: [],
          rawConstituencyDetails: null,
          activeConstituencyDetails: null
        });
        
        set({ isLoading: false });
      } catch (err: any) {
        set({ error: err.message || 'Initialization failed', isLoading: false });
      }
    },

    setProfessionId: async (id: number) => {
      set({ professionId: id });
    },

    setConstituencyId: async (id: number) => {
      set({ constituencyId: id, loadingConstituency: true, errorConstituency: null });

      let constDetails = null;
      try {
        const cachedStr = await AsyncStorage.getItem(`@jagrut_const_${id}`);
        if (cachedStr) {
          constDetails = JSON.parse(cachedStr);
          set({ rawConstituencyDetails: constDetails });
          const merged = applyAllOverrides(
            get().rawCommodities,
            constDetails,
            get().localPriceOverrides,
            get().localAffidavitOverrides,
            get().localAuditOverrides
          );
          set({ activeConstituencyDetails: merged.activeConstituencyDetails, loadingConstituency: false });
        }
      } catch (e) {
        console.warn("Failed to load constituency cache:", e);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/constituencies/c_${id}.json`);
        if (!response.ok) {
           if (!constDetails) throw new Error(`Failed to fetch details for constituency ID ${id}`);
        } else {
           const data = await response.json();
           await AsyncStorage.setItem(`@jagrut_const_${id}`, JSON.stringify(data));
           set({ rawConstituencyDetails: data });
           
           const merged = applyAllOverrides(
             get().rawCommodities,
             data,
             get().localPriceOverrides,
             get().localAffidavitOverrides,
             get().localAuditOverrides
           );
           
           set({ activeConstituencyDetails: merged.activeConstituencyDetails, loadingConstituency: false });
        }
      } catch (err: any) {
        console.error(err);
        if (!constDetails) {
            set({ errorConstituency: err.message || 'Failed to fetch constituency data', loadingConstituency: false });
        }
      }
    },

    setBasketItems: async (items: BasketItem[]) => {
      set({ basketItems: items });
    },

    clearBasket: async () => {
      set({ basketItems: [] });
    },

    // Override actions
    addAffidavitOverride: async (constituencyId, repName, party, assetsCurrent, assetsPrevious, cases) => {
      const overrides = {
        ...get().localAffidavitOverrides,
        [constituencyId]: {
          rep_name: repName,
          party,
          declared_assets_current_cr: assetsCurrent,
          declared_assets_previous_cr: assetsPrevious,
          pending_criminal_cases: cases
        }
      };
      
      await AsyncStorage.setItem('@jagrut_affidavit_overrides', JSON.stringify(overrides));
      set({ localAffidavitOverrides: overrides });
      
      // Re-apply overrides to state
      const merged = applyAllOverrides(
        get().rawCommodities,
        get().rawConstituencyDetails,
        get().localPriceOverrides,
        overrides,
        get().localAuditOverrides
      );
      set({
        commodities: merged.commodities,
        activeConstituencyDetails: merged.activeConstituencyDetails
      });
    },

    addPriceOverride: async (commodityId, priceCurrent) => {
      const overrides = {
        ...get().localPriceOverrides,
        [commodityId]: priceCurrent
      };
      
      await AsyncStorage.setItem('@jagrut_price_overrides', JSON.stringify(overrides));
      set({ localPriceOverrides: overrides });
      
      const merged = applyAllOverrides(
        get().rawCommodities,
        get().rawConstituencyDetails,
        overrides,
        get().localAffidavitOverrides,
        get().localAuditOverrides
      );
      set({
        commodities: merged.commodities,
        activeConstituencyDetails: merged.activeConstituencyDetails
      });
    },

    addAuditOverride: async (constituencyId, centralAllocated, centralUtilized, stateAllocated, stateUtilized, auditDiscrepancy) => {
      const overrides = {
        ...get().localAuditOverrides,
        [constituencyId]: {
          central_allocated_crores: centralAllocated,
          central_utilized_crores: centralUtilized,
          state_allocated_crores: stateAllocated,
          state_utilized_crores: stateUtilized,
          audit_discrepancy_crores: auditDiscrepancy
        }
      };
      
      await AsyncStorage.setItem('@jagrut_audit_overrides', JSON.stringify(overrides));
      set({ localAuditOverrides: overrides });
      
      const merged = applyAllOverrides(
        get().rawCommodities,
        get().rawConstituencyDetails,
        get().localPriceOverrides,
        get().localAffidavitOverrides,
        overrides
      );
      set({
        commodities: merged.commodities,
        activeConstituencyDetails: merged.activeConstituencyDetails
      });
    },

    clearOverrides: async () => {
      await AsyncStorage.removeItem('@jagrut_price_overrides');
      await AsyncStorage.removeItem('@jagrut_affidavit_overrides');
      await AsyncStorage.removeItem('@jagrut_audit_overrides');
      
      set({
        localPriceOverrides: {},
        localAffidavitOverrides: {},
        localAuditOverrides: {}
      });
      
      const merged = applyAllOverrides(
        get().rawCommodities,
        get().rawConstituencyDetails,
        {},
        {},
        {}
      );
      
      set({
        commodities: merged.commodities,
        activeConstituencyDetails: merged.activeConstituencyDetails
      });
    }
  };
});
