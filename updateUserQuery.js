import AsyncStorage from '@react-native-async-storage/async-storage';

export const updateUserQuery = async (query, setUserQuery) => {
  setUserQuery(query);
  try {
    await AsyncStorage.setItem("userQuery", query);
    console.log(`✅ Saved userQuery to storage: "${query}"`);
  } catch (error) {
    console.error("❌ ERROR: Saving userQuery failed:", error);
  }
};