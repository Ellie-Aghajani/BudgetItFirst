import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  uid: string | null;
  email: string | null;
  // From Firebase: set by Google sign-in, or by the name field at sign-up.
  displayName: string | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  uid: null,
  email: null,
  displayName: null,
  isLoading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{
        uid: string;
        email: string | null;
        displayName: string | null;
      }>,
    ) => {
      state.uid = action.payload.uid;
      state.email = action.payload.email;
      state.displayName = action.payload.displayName;
      state.isLoading = false;
    },
    clearUser: (state) => {
      state.uid = null;
      state.email = null;
      state.displayName = null;
      state.isLoading = false;
    },
    setDisplayName: (state, action: PayloadAction<string>) => {
      state.displayName = action.payload;
    },
  },
});

export const { setUser, clearUser, setDisplayName } = authSlice.actions;
export default authSlice.reducer;
