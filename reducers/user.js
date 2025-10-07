// reducers/user.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: {
    _id: null,
    token: null,
    username: null,
    email: null,
    city: null,
    vehicle: [], // si tu t'en sers encore
  },
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // À l'inscription : on pose AUSSI _id
    registerUser: (state, action) => {
      state.value._id = action.payload._id ?? state.value._id; // ✅ important
      state.value.token = action.payload.token ?? null;
      state.value.username = action.payload.username ?? null;
      state.value.email = action.payload.email ?? null;
    },
    // Au login : on pose _id + (token/username/email si renvoyés)
    loginUser: (state, action) => {
      state.value._id = action.payload._id ?? null; // ✅ important
      state.value.token = action.payload.token ?? null;
      state.value.username = action.payload.username ?? state.value.username;
      state.value.email = action.payload.email ?? state.value.email;
    },
    logoutUser: (state) => {
      state.value = { ...initialState.value }; // reset propre
    },
    // Mise à jour partielle (robuste)
    updateUser: (state, action) => {
      const p = action.payload || {};
      if (p._id !== undefined) state.value._id = p._id;
      if (p.username !== undefined) state.value.username = p.username;
      if (p.email !== undefined) state.value.email = p.email;
      if (p.token !== undefined) state.value.token = p.token;
      if (p.city !== undefined) state.value.city = p.city;
      if (p.vehicle !== undefined) state.value.vehicle = p.vehicle;
    },
  },
});

export const { registerUser, loginUser, logoutUser, updateUser } =
  userSlice.actions;
export default userSlice.reducer;
