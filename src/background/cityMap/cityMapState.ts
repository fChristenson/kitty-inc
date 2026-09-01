import { companyStorageKey } from "../../company";

// so a reload lands the player back on the same city page they had selected —
// namespaced per company (see company.ts's companyStorageKey) since each
// company has its own separate set of cities/buildings. Split out of
// cityMap/index.ts since it's plain persistence with no canvas/DOM involved.
const CITY_MAP_STATE_KEY = "cash-clicker:city-map-state";

export interface PersistedCityMapState {
  cityIndex: number;
}

export function loadCityMapState(companyIndex: number): PersistedCityMapState {
  try {
    const raw = localStorage.getItem(
      companyStorageKey(CITY_MAP_STATE_KEY, companyIndex),
    );
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      cityIndex: Number.isFinite(parsed?.cityIndex) ? parsed.cityIndex : 0,
    };
  } catch {
    return { cityIndex: 0 };
  }
}

export function saveCityMapState(
  companyIndex: number,
  state: PersistedCityMapState,
): void {
  try {
    localStorage.setItem(
      companyStorageKey(CITY_MAP_STATE_KEY, companyIndex),
      JSON.stringify(state),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}
