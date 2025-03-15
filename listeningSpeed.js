import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

// Export the language code variable
export let detectedLanguageCode = null;

// Keep track of the last detected language to avoid redundant API calls
let lastDetectedLanguage = "";
let currentSound = null; // Track the current sound object
let cachedVoicesByLanguage = {}; // Cache for TTS voices by language

// Safely access API keys with optional chaining
const GOOGLE_TRANSLATE_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY || "";
const GOOGLE_TTS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY || "";

// A comprehensive fallback map of language codes to TTS language codes
// Used when dynamic voice fetching fails
const fallbackTTSLanguages = {
  // Base language codes
  "en": "en-US",
  "fr": "fr-FR",
  "de": "de-DE",
  "es": "es-ES",
  "it": "it-IT",
  "ru": "ru-RU",
  "zh": "zh-CN",
  "ja": "ja-JP",
  "ko": "ko-KR",
  "ar": "ar-XA",
  "he": "he-IL",
  "iw": "he-IL", // Hebrew support (Google uses both codes)
  "no": "nb-NO", // Norwegian Bokmål
  "nb": "nb-NO", // Norwegian Bokmål explicit
  "nn": "nb-NO", // Norwegian Nynorsk (fallback to Bokmål)
  "pt": "pt-PT",
  "nl": "nl-NL",
  "hi": "hi-IN",
  "tr": "tr-TR",
  "vi": "vi-VN",
  "th": "th-TH",
  "id": "id-ID",
  "pl": "pl-PL",
  "sv": "sv-SE", // Swedish
  "fi": "fi-FI", // Finnish
  "da": "da-DK", // Danish
  "uk": "uk-UA", // Ukrainian
  "cs": "cs-CZ", // Czech
  "el": "el-GR", // Greek
  "hu": "hu-HU", // Hungarian
  "ro": "ro-RO", // Romanian
  
  // Regional variants
  "en-us": "en-US",
  "en-gb": "en-GB",
  "es-mx": "es-US",
  "fr-ca": "fr-CA",
  "pt-br": "pt-BR",
  "zh-hk": "zh-HK",
  "zh-tw": "zh-TW"
};

// Keep track of available voices
let availableVoices = null;

// Function to fetch available voices from Google TTS API
async function fetchAvailableVoices() {
  if (!GOOGLE_TTS_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${GOOGLE_TTS_API_KEY}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.voices || null;
  } catch (error) {
    return null;
  }
}

// Initialize and cache voice list
export const initializeVoices = async () => {
  if (availableVoices) {
    return availableVoices;
  }
  
  try {
    availableVoices = await fetchAvailableVoices();
    
    if (availableVoices) {
      // Create a map of language codes to voices
      for (const voice of availableVoices) {
        const languageCode = voice.languageCodes[0].split('-')[0];
        if (!cachedVoicesByLanguage[languageCode]) {
          cachedVoicesByLanguage[languageCode] = [];
        }
        cachedVoicesByLanguage[languageCode].push(voice);
      }
    }
    
    return availableVoices;
  } catch (error) {
    return null;
  }
};

// Get the best voice for a language
const getBestVoiceForLanguage = (languageCode) => {
  // First try exact match
  if (cachedVoicesByLanguage[languageCode] && cachedVoicesByLanguage[languageCode].length > 0) {
    // Prefer female voices when available
    const femaleVoices = cachedVoicesByLanguage[languageCode].filter(
      voice => voice.ssmlGender === 'FEMALE'
    );
    
    if (femaleVoices.length > 0) {
      return femaleVoices[0].name;
    }
    
    return cachedVoicesByLanguage[languageCode][0].name;
  }
  
  // If we have the fallback mapping, use it
  const fallbackCode = fallbackTTSLanguages[languageCode];
  
  // Return null if no match found
  return null;
};

// Get the best language code for a language
const getBestTTSLanguageCode = (languageCode) => {
  if (!languageCode) return null;
  
  // Normalize to lowercase
  const normalizedCode = languageCode.toLowerCase();
  
  // First check if we have voices cached for this language
  if (cachedVoicesByLanguage[normalizedCode] && cachedVoicesByLanguage[normalizedCode].length > 0) {
    // Get the first voice's languageCode (which is the full code like "en-US")
    return cachedVoicesByLanguage[normalizedCode][0].languageCodes[0];
  }
  
  // If not found in cache, use the fallback mapping
  return fallbackTTSLanguages[normalizedCode] || null;
};

// Export all functions
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
      await currentSound.unloadAsync();
    } catch (error) {
      console.warn("Error stopping speech:", error);
    } finally {
      currentSound = null;
    }
  }
};

export const speakSentenceWithPauses = async (sentence, listeningSpeed, onFinish) => {
  if (!sentence) {
    if (onFinish) onFinish();
    return;
  }

  // Stop any currently playing audio first
  await stopSpeaking();

  // Ensure voices are initialized
  if (!availableVoices) {
    await initializeVoices();
  }

  const speakingRate = Math.max(0.5, Math.min(1.5, (listeningSpeed - 0.5) * 1));
  
  // Get the appropriate TTS language code
  let ttsLanguageCode;
  
  if (detectedLanguageCode) {
    // Try to get the best TTS language code for the detected language
    ttsLanguageCode = getBestTTSLanguageCode(detectedLanguageCode);
    
    // If not found, use the detected code directly
    if (!ttsLanguageCode) {
      ttsLanguageCode = fallbackTTSLanguages[detectedLanguageCode] || detectedLanguageCode;
    }
  } else {
    // Default to English if no language code is detected
    ttsLanguageCode = "en-US";
  }

  try {
    // Check if we have a Google API key before attempting the API call
    if (!GOOGLE_TTS_API_KEY) {
      if (onFinish) onFinish();
      return;
    }

    // Get the best voice for the language if available
    const voiceName = getBestVoiceForLanguage(detectedLanguageCode);
    
    // Prepare TTS request body
    const requestBody = {
      input: { text: sentence },
      voice: { 
        languageCode: ttsLanguageCode,
        ssmlGender: "FEMALE"
      },
      audioConfig: { audioEncoding: "MP3", speakingRate: speakingRate }
    };
    
    // If we have a specific voice name, use it
    if (voiceName) {
      requestBody.voice.name = voiceName;
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();
    if (!data.audioContent) {
      if (onFinish) onFinish();
      return;
    }

    // Decode Base64 and play MP3
    const sound = new Audio.Sound();
    currentSound = sound; // Store reference to current sound
    
    try {
      const audioUri = `data:audio/mp3;base64,${data.audioContent}`;
      await sound.loadAsync({ uri: audioUri });
      
      // Set up a listener for when playback finishes
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          // Only run this once when playback finishes
          sound.setOnPlaybackStatusUpdate(null);
          
          // Clean up
          (async () => {
            try {
              if (sound === currentSound) {
                await sound.unloadAsync();
                currentSound = null;
              }
            } catch (error) {
              console.warn("Error cleaning up sound:", error);
            } finally {
              if (onFinish) onFinish();
            }
          })();
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.warn("Error playing sound:", error);
      if (sound === currentSound) {
        try {
          await sound.unloadAsync();
        } catch (e) {
          // Ignore errors during cleanup
        }
        currentSound = null;
      }
      if (onFinish) onFinish();
    }
  } catch (error) {
    console.warn("Error in speech synthesis:", error);
    if (onFinish) onFinish(); // Call onFinish even on error
  }
};

export const detectLanguageCode = async (languageName) => {
  if (!languageName) return "";
  
  if (detectedLanguageCode && languageName === lastDetectedLanguage) {
    return detectedLanguageCode;
  }
  
  lastDetectedLanguage = languageName;
  
  // Comprehensive direct mappings for common languages and their native names
  const directMappings = {
    // English language names
    'english': 'en',
    'french': 'fr', 'français': 'fr',
    'german': 'de', 'deutsch': 'de',
    'spanish': 'es', 'español': 'es',
    'italian': 'it', 'italiano': 'it',
    'russian': 'ru', 'русский': 'ru',
    'japanese': 'ja', '日本語': 'ja',
    'chinese': 'zh', '中文': 'zh',
    'korean': 'ko', '한국어': 'ko',
    'arabic': 'ar', 'العربية': 'ar',
    'hindi': 'hi', 'हिन्दी': 'hi',
    'portuguese': 'pt', 'português': 'pt',
    'dutch': 'nl', 'nederlands': 'nl',
    'hebrew': 'he', 'עברית': 'he',
    'norwegian': 'no', 'norsk': 'no', 'bokmål': 'nb', 'nynorsk': 'nn',
    'swedish': 'sv', 'svenska': 'sv',
    'danish': 'da', 'dansk': 'da',
    'finnish': 'fi', 'suomi': 'fi',
    'polish': 'pl', 'polski': 'pl',
    'turkish': 'tr', 'türkçe': 'tr',
    'vietnamese': 'vi', 'tiếng việt': 'vi',
    'thai': 'th', 'ไทย': 'th',
    'indonesian': 'id', 'bahasa indonesia': 'id',
    'ukrainian': 'uk', 'українська': 'uk',
    'greek': 'el', 'ελληνικά': 'el',
    'czech': 'cs', 'čeština': 'cs',
    'hungarian': 'hu', 'magyar': 'hu',
    'romanian': 'ro', 'română': 'ro',
    
    // Common variations and regional
    'american': 'en', 'british': 'en',
    'castilian': 'es', 'castellano': 'es',
    'brazilian': 'pt', 'portuguese brazilian': 'pt',
    'farsi': 'fa', 'persian': 'fa',
    'flemish': 'nl',
    
    // Short forms
    'eng': 'en', 'fre': 'fr', 'fra': 'fr', 'ger': 'de', 'deu': 'de',
    'spa': 'es', 'ita': 'it', 'rus': 'ru', 'jap': 'ja', 'jpn': 'ja',
    'chi': 'zh', 'zho': 'zh', 'kor': 'ko', 'ara': 'ar', 'hin': 'hi',
    'por': 'pt', 'dut': 'nl', 'nld': 'nl', 'heb': 'he', 'nor': 'no'
  };
  
  // Check direct mappings (case-insensitive)
  const lowerCaseInput = languageName.toLowerCase().trim();
  if (directMappings[lowerCaseInput]) {
    detectedLanguageCode = directMappings[lowerCaseInput];
    return detectedLanguageCode;
  }
  
  try {
    // Check if we have a Google API key before attempting the API call
    if (!GOOGLE_TRANSLATE_API_KEY) {
      return "";
    }

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
    detectedLanguageCode = languageMap[lowerCaseInput] || "";
    
    // If no exact match, try fuzzy matching
    if (!detectedLanguageCode) {
      for (const [name, code] of Object.entries(languageMap)) {
        if (name.includes(lowerCaseInput) || lowerCaseInput.includes(name)) {
          detectedLanguageCode = code;
          break;
        }
      }
    }
    
    // If it looks like a language code itself, use it
    if (!detectedLanguageCode && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(lowerCaseInput)) {
      detectedLanguageCode = lowerCaseInput.split('-')[0].toLowerCase();
    }

    return detectedLanguageCode;
  } catch (error) {
    return "";
  }
};

// Call initializeVoices during module loading to start fetching voices
initializeVoices();

// Add a default export with all functions
export default {
  getStoredListeningSpeed,
  getStoredStudyLanguage,
  saveStudyLanguage,
  saveListeningSpeed,
  updateSpeechRate,
  stopSpeaking,
  speakSentenceWithPauses,
  detectLanguageCode,
  initializeVoices,
  detectedLanguageCode
};