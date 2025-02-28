import AsyncStorage from '@react-native-async-storage/async-storage';

export const loadStoredSettings = async (setUserQuery, setSpeechRate) => {
  try {
    const storedUserQuery = await AsyncStorage.getItem("userQuery");
    const storedSpeechRate = await AsyncStorage.getItem("speechRate");

    if (storedUserQuery !== null) {
      console.log(`📢 Loaded userQuery from storage: "${storedUserQuery}"`);
      setUserQuery(storedUserQuery);
    }

    if (storedSpeechRate !== null) {
      console.log(`📢 Loaded speechRate from storage: "${storedSpeechRate}"`);
      setSpeechRate(parseFloat(storedSpeechRate));
    }
  } catch (error) {
    console.error("❌ ERROR: Loading stored settings failed:", error);
  }
};