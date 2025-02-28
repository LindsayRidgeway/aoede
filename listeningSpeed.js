import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

const GOOGLE_TTS_API_KEY = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_API_KEY;


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

export const speakSentenceWithPauses = async (sentence, listeningSpeed) => {
    console.log(`🎯 FINAL DEBUG: Received listeningSpeed: ${listeningSpeed}`);  // ✅ Confirm value
    if (!sentence) return;

    const speakingRate = Math.max(0.5, Math.min(1.5, (listeningSpeed - 0.5) * 1));
    console.log(`🎧 FINAL DEBUG: Adjusted speakingRate: ${speakingRate}`);

    try {
        const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input: { text: sentence },
                    voice: { languageCode: "ru-RU", ssmlGender: "FEMALE" },
                    audioConfig: { audioEncoding: "MP3", speakingRate: speakingRate }
                }),
            }
        );

        const data = await response.json();
        if (!data.audioContent) throw new Error("❌ Failed to generate speech.");

        // ✅ Decode Base64 and play MP3
        const sound = new Audio.Sound();
        const audioUri = `data:audio/mp3;base64,${data.audioContent}`;
        await sound.loadAsync({ uri: audioUri });
        console.log(`🎧 Playing audio at speed: ${speakingRate}`);  // ✅ Log actual rate
        await sound.playAsync();
    } catch (error) {
        console.error("❌ ERROR: Google TTS request failed:", error);
    }
};
