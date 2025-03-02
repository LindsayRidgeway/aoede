import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

export let detectedLanguageCode;
detectedLanguageCode = null;

let lastDetectedLanguage = "";
let currentSound = null; // Track the current sound object

const GOOGLE_TRANSLATE_API_KEY = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_API_KEY;
const GOOGLE_TTS_API_KEY = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_API_KEY;

export const getStoredListeningSpeed = async () => {
  try {
    const storedListeningSpeed = await AsyncStorage.getItem("listeningSpeed");
    return storedListeningSpeed ? parseFloat(storedListeningSpeed) || 1.0 : 1.0;
  } catch (error) {
    return 1.0;
  }
};

export const getStoredStudyLanguage = async () => {
  try {
    const storedStudyLanguage = await AsyncStorage.getItem("studyLanguage");
    const storedLanguageCode = await AsyncStorage.getItem("studyLanguageCode");

    if (storedLanguageCode) {
      detectedLanguageCode = storedLanguageCode; // Cache the stored code
    }

    return storedStudyLanguage ? storedStudyLanguage : "";
  } catch (error) {
    return "";
  }
};

export const saveStudyLanguage = async (language) => {
  try {
    await AsyncStorage.setItem("studyLanguage", language);

    // Detect language code and store it
    const languageCode = await detectLanguageCode(language);
    if (languageCode) {
      await AsyncStorage.setItem("studyLanguageCode", languageCode);
    }
  } catch (error) {
    // Handle silently
  }
};

export const saveListeningSpeed = async (speed) => {
  try {
    await AsyncStorage.setItem("listeningSpeed", speed.toString());
  } catch (error) {
    // Handle silently
  }
};

export const updateSpeechRate = async (rate, setSpeechRate) => {
  setSpeechRate(rate);
  try {
    await AsyncStorage.setItem("speechRate", rate.toString());
  } catch (error) {
    // Handle silently
  }
};

// Add function to stop speaking
export const stopSpeaking = async () => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      currentSound = null;
    } catch (error) {
      // Handle silently
    }
  }
};

const supportedTTSLanguages = {
  "en": "en-US", "fr": "fr-FR", "de": "de-DE", "es": "es-ES", "it": "it-IT",
  "ru": "ru-RU", "zh": "zh-CN", "ja": "ja-JP", "ko": "ko-KR", "ar": "ar-XA"
};

export const speakSentenceWithPauses = async (sentence, listeningSpeed, onFinish) => {
    if (!sentence) return;

    // Stop any currently playing audio first
    await stopSpeaking();

    const speakingRate = Math.max(0.5, Math.min(1.5, (listeningSpeed - 0.5) * 1));
    const ttsLanguageCode = supportedTTSLanguages[detectedLanguageCode] || detectedLanguageCode;

    try {
        const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input: { text: sentence },
                    voice: { languageCode: ttsLanguageCode, ssmlGender: "FEMALE" },
                    audioConfig: { audioEncoding: "MP3", speakingRate: speakingRate }
                }),
            }
        );

        const data = await response.json();
        if (!data.audioContent) throw new Error();

        // Decode Base64 and play MP3
        const sound = new Audio.Sound();
        currentSound = sound; // Store reference to current sound
        const audioUri = `data:audio/mp3;base64,${data.audioContent}`;
        await sound.loadAsync({ uri: audioUri });
        
        // Set up a listener for when playback finishes
        sound.setOnPlaybackStatusUpdate(status => {
            if (status.didJustFinish) {
                currentSound = null;
                if (onFinish) onFinish();
            }
        });
        
        await sound.playAsync();
    } catch (error) {
        if (onFinish) onFinish(); // Call onFinish even on error
    }
};

export const detectLanguageCode = async (languageName) => {
  if (!languageName) return "";
  if (detectedLanguageCode && languageName === lastDetectedLanguage) {
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
      return "";
    }

    // Convert API list to a mapping of "localized name" → "language code"
    const languageMap = {};
    for (const lang of data.data.languages) {
      if (lang.name) {
        languageMap[lang.name.toLowerCase()] = lang.language;
      }
    }

    // Match the user's input to a language code
    const userInput = languageName.toLowerCase();
    detectedLanguageCode = languageMap[userInput.toLowerCase()] || "";

    if (detectedLanguageCode) {
      return detectedLanguageCode;
    } else {
      return "";
    }
  } catch (error) {
    return "";
  }
};