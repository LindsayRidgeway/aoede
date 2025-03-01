import AsyncStorage from '@react-native-async-storage/async-storage';

export const updateUserQuery = async (query, setUserQuery) => {
  setUserQuery(query);
  try {
    await AsyncStorage.setItem("userQuery", query);
  } catch (error) {
    console.error("❌ ERROR: Saving userQuery failed:", error);
  }
};
