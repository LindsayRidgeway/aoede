import AsyncStorage from '@react-native-async-storage/async-storage';

export const loadStoredSettings = async (setUserQuery, setSpeechRate) => {
  try {
    const storedUserQuery = await AsyncStorage.getItem("userQuery");
    const storedSpeechRate = await AsyncStorage.getItem("speechRate");

    if (storedUserQuery !== null) {
      setUserQuery(storedUserQuery);
    }

    if (storedSpeechRate !== null) {
      setSpeechRate(parseFloat(storedSpeechRate));
    }
  } catch (error) {
    console.error("❌ ERROR: Loading stored settings failed:", error);
  }
};
