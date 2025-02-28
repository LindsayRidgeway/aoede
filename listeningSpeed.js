import AsyncStorage from '@react-native-async-storage/async-storage';

export const getStoredListeningSpeed = async () => {
  try {
    const storedListeningSpeed = await AsyncStorage.getItem("listeningSpeed");
    return storedListeningSpeed ? parseFloat(storedListeningSpeed) || 1.0 : 1.0;
  } catch (error) {
    console.error("❌ ERROR: Loading stored listening speed failed:", error);
    return 1.0;
  }
};

export const saveListeningSpeed = async (speed) => {
  try {
    await AsyncStorage.setItem("listeningSpeed", speed.toString());
  } catch (error) {
    console.error("❌ ERROR: Saving listening speed failed:", error);
  }
};

export const updateSpeechRate = async (rate, setSpeechRate) => {
  setSpeechRate(rate);
  try {
    await AsyncStorage.setItem("speechRate", rate.toString());
    console.log(`✅ Saved speechRate to storage: "${rate}"`);
  } catch (error) {
    console.error("❌ ERROR: Saving speechRate failed:", error);
  }
};
