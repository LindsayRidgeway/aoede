import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

let lastDetectedLanguage = "";

const GOOGLE_TRANSLATE_API_KEY = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_API_KEY;
let detectedLanguageCode = null;

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
    const storedLanguageCode = await AsyncStorage.getItem("studyLanguageCode");

    if (storedLanguageCode) {
      detectedLanguageCode = storedLanguageCode; // ✅ Cache the stored code
      console.log(`📢 Loaded stored language code: ${storedLanguageCode}`);
    }

    return storedStudyLanguage ? storedStudyLanguage : "";
  } catch (error) {
    console.error("❌ ERROR: Loading stored study language failed:", error);
    return "";
  }
};

export const saveStudyLanguage = async (language) => {
  try {
    await AsyncStorage.setItem("studyLanguage", language);
    console.log(`✅ DEBUG: Study Language saved as "${language}"`);

    // Detect language code and store it
    const languageCode = await detectLanguageCode(language);
    if (languageCode) {
      await AsyncStorage.setItem("studyLanguageCode", languageCode);
      console.log(`✅ DEBUG: Study Language Code saved as "${languageCode}"`);
    }
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

export const detectLanguageCode = async (languageName) => {
  if (!languageName) return "";
  if (detectedLanguageCode && languageName === lastDetectedLanguage) {
    console.log(`📢 Using cached language code: ${detectedLanguageCode}`);
    return detectedLanguageCode;
  }
  lastDetectedLanguage = languageName;
  try {
    // Fetch Google's official language list
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_TRANSLATE_API_KEY}&target=${navigator.language.split('-')[0] || "en"}`,
      { method: "GET" }
    );

    const data = await response.json();
    if (!data || !data.data || !data.data.languages) {
      console.warn("⚠ Google Translate API returned no language list.");
      return "";
    }

    // Convert API list to a mapping of "localized name" → "language code"
    const languageMap = {};
    for (const lang of data.data.languages) {
      if (lang.name) {  // ✅ Ensure `name` exists
	languageMap[lang.name.toLowerCase()] = lang.language;
      }
    }

    // Match the user’s input to a language code
    const userInput = languageName.toLowerCase();
    detectedLanguageCode = languageMap[userInput.toLowerCase()] || "";
    console.log(`🔍 DEBUG: Matching "${userInput}" to language code: "${detectedLanguageCode}"`);

    if (detectedLanguageCode) {
      console.log(`✅ Found Study Language Code: ${detectedLanguageCode}`);
      return detectedLanguageCode;
    } else {
      console.warn(`⚠ Could not find language code for "${languageName}".`);
      return "";
    }
  } catch (error) {
    console.error("❌ ERROR: Google Translate API request failed:", error);
    return "";
  }
};
