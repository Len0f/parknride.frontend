// reducers/favorites.js
import { createSlice } from "@reduxjs/toolkit";

/**
 * State minimal : seulement la liste visible.
 * items: [{ placeId, name, latitude, longitude, address, type }]
 */
const initialState = {
  items: [],
};

const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    /** Remplace l’ensemble (après un GET du back) */
    setFavorites: (state, action) => {
      state.items = action.payload || [];
    },

    /** Ajout/Màj local (optimistic) */
    localAddOrUpdate: (state, action) => {
      const p = action.payload; // { id, name, latitude, longitude, address, type }
      const i = state.items.findIndex((x) => x.placeId === p.id);
      const draft = {
        placeId: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        address: p.address,
        type: p.type,
      };
      if (i >= 0) state.items[i] = { ...state.items[i], ...draft };
      else state.items.unshift(draft);
    },

    /** Suppression locale (optimistic) */
    localRemove: (state, action) => {
      const placeId = action.payload;
      const i = state.items.findIndex((x) => x.placeId === placeId);
      if (i >= 0) state.items.splice(i, 1);
    },
  },
});

export const { setFavorites, localAddOrUpdate, localRemove } =
  favoritesSlice.actions;
export default favoritesSlice.reducer;

// Sélecteurs
export const selectFavorites = (s) => s.favorites.items;
export const isFavoriteById = (id) => (s) =>
  s.favorites.items.some((x) => x.placeId === id);
