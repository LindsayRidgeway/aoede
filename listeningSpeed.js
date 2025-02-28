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
export const getStoredStudyLanguage = async () => {
  try {
    const storedStudyLanguage = await AsyncStorage.getItem("studyLanguage");
    return storedStudyLanguage ? storedStudyLanguage : "";
  } catch (error) {
    console.error("❌ ERROR: Loading stored study language failed:", error);
    return "";
  }
};

export const saveStudyLanguage = async (language) => {
  try {
    await AsyncStorage.setItem("studyLanguage", language);
    console.log(`✅ DEBUG: Study Language saved as "${language}"`);  // ✅ Log save
  } catch (error) {
    console.error("❌ ERROR: Saving study language failed:", error);
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
  } catch (error) {
    console.error("❌ ERROR: Saving speechRate failed:", error);
  }
};

export const speakSentenceWithPauses = async (sentence, listeningSpeed) => {
    if (!sentence) return;

    const speakingRate = Math.max(0.5, Math.min(1.5, (listeningSpeed - 0.5) * 1));

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
        await sound.playAsync();
    } catch (error) {
        console.error("❌ ERROR: Google TTS request failed:", error);
    }
};
