import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "agentlar_token";
const USER_KEY = "agentlar_user";

const isWeb = Platform.OS === "web";

// Lazy-load expo-secure-store on native platforms only (it imports
// native byte counter modules that crash the web bundler).
let SecureStoreNative: any = null;
if (!isWeb) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SecureStoreNative = require("expo-secure-store");
}

async function setItem(k: string, v: string) {
  if (isWeb) return AsyncStorage.setItem(k, v);
  return SecureStoreNative.setItemAsync(k, v);
}
async function getItem(k: string) {
  if (isWeb) return AsyncStorage.getItem(k);
  return SecureStoreNative.getItemAsync(k);
}
async function removeItem(k: string) {
  if (isWeb) return AsyncStorage.removeItem(k);
  return SecureStoreNative.deleteItemAsync(k);
}

export const tokenStore = {
  async setToken(token: string) {
    await setItem(KEY, token);
  },
  async getToken() {
    return getItem(KEY);
  },
  async clearToken() {
    await removeItem(KEY);
  },
  async setUser(user: any) {
    await setItem(USER_KEY, JSON.stringify(user));
  },
  async getUser() {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  async clearUser() {
    await removeItem(USER_KEY);
  },
};
