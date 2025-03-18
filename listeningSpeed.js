import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

// Export the language code variable
export let detectedLanguageCode = null;

// Keep track of current playback
let currentSound = null; // Track the current sound object
let cachedVoicesByLanguage = {}; // Cache for TTS voices by language
let supportedVoiceLanguageCodes = new Set(); // Set of all supported language codes (with regions)
let languageAliases = new Map(); // Map of language code aliases discovered during initialization

// Safely access API keys with optional chaining
const GOOGLE_TTS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY || "";

// Keep track of available voices
let availableVoices = null;
let languageInitialized = false; // Track if we've initialized voice data

// Function to fetch available voices from Google TTS API
async function fetchAvailableVoices() {
  if (!GOOGLE_TTS_API_KEY) {
    console.warn("[TTS] No Google API key found");
    return null;
  }

  try {
    console.log("[TTS] Fetching available voices from Google TTS API");
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${GOOGLE_TTS_API_KEY}`
    );

    if (!response.ok) {
      console.warn("[TTS] Failed to fetch voices:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.voices || null;
  } catch (error) {
    console.warn("[TTS] Error fetching voices:", error);
    return null;
  }
}

// Fetch and cache supported languages from Google Translate API
async function fetchSupportedLanguages() {
  if (!GOOGLE_TTS_API_KEY) {
    console.warn("[TTS] No Google API key found");
    return null;
  }

  try {
    console.log("[TTS] Fetching supported languages from Google Translate API");
    // Use 'en' as target language for consistent response format
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_TTS_API_KEY}&target=en`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.warn("[TTS] Failed to fetch languages:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.data?.languages || null;
  } catch (error) {
    console.warn("[TTS] Error fetching languages:", error);
    return null;
  }
}

// Initialize and cache voice list
export const initializeVoices = async () => {
  if (languageInitialized && availableVoices) {
    return availableVoices;
  }
  
  try {
    console.log("[TTS] Initializing voices...");
    
    // Step 1: Fetch all supported voices from Google TTS API
    availableVoices = await fetchAvailableVoices();
    
    if (!availableVoices || availableVoices.length === 0) {
      console.warn("[TTS] No voices returned from API");
      return null;
    }
    
    console.log(`[TTS] Got ${availableVoices.length} voices from API`);
    
    // Step 2: Process and categorize all voices
    // Clear existing cache
    cachedVoicesByLanguage = {};
    supportedVoiceLanguageCodes.clear();
    languageAliases.clear();
    
    // Process voice data
    for (const voice of availableVoices) {
      // Add all language codes to supported set
      voice.languageCodes.forEach(code => {
        supportedVoiceLanguageCodes.add(code);
        
        // Also add the base language code to our set for easy checking
        const baseCode = code.split('-')[0];
        supportedVoiceLanguageCodes.add(baseCode);
      });
      
      // Map voices by base language code for easier lookup
      for (const langCode of voice.languageCodes) {
        // Get base language code without region (e.g., 'en' from 'en-US')
        const baseCode = langCode.split('-')[0];
        
        if (!cachedVoicesByLanguage[baseCode]) {
          cachedVoicesByLanguage[baseCode] = [];
        }
        
        // Add this voice to the language's voice array
        cachedVoicesByLanguage[baseCode].push({
          ...voice,
          // Add the specific language code this voice was matched with
          matchedLanguageCode: langCode
        });
      }
    }
    
    // Step 3: Fetch Google Translate supported languages to discover potential aliases
    const supportedLanguages = await fetchSupportedLanguages();
    
    if (supportedLanguages && supportedLanguages.length > 0) {
      console.log(`[TTS] Got ${supportedLanguages.length} languages from Translate API`);
      
      // Create a map of language names to codes for easy lookup
      const languageNameToCode = new Map();
      supportedLanguages.forEach(lang => {
        // Store both lowercase and original versions for case-insensitive matching
        if (lang.name) {
          languageNameToCode.set(lang.name.toLowerCase(), lang.language);
        }
      });
      
      // Look for language codes that have the same name but different codes
      // These are potential aliases we need to handle
      const nameToCodesMap = new Map();
      supportedLanguages.forEach(lang => {
        if (lang.name) {
          const name = lang.name.toLowerCase();
          if (!nameToCodesMap.has(name)) {
            nameToCodesMap.set(name, []);
          }
          nameToCodesMap.get(name).push(lang.language);
        }
      });
      
      // Find languages with multiple codes (potential aliases)
      for (const [name, codes] of nameToCodesMap.entries()) {
        if (codes.length > 1) {
          console.log(`[TTS] Found language "${name}" with multiple codes:`, codes);
          
          // For each code, check which ones are supported by TTS API
          for (const code of codes) {
            const baseCode = code.split('-')[0];
            if (supportedVoiceLanguageCodes.has(baseCode) || supportedVoiceLanguageCodes.has(code)) {
              // This is a supported code in TTS - use it as the target for aliased codes
              for (const aliasCode of codes) {
                if (aliasCode !== code) {
                  languageAliases.set(aliasCode, baseCode);
                  console.log(`[TTS] Adding alias: ${aliasCode} -> ${baseCode}`);
                }
              }
              break; // We found a supported code, no need to continue
            }
          }
        }
      }
      
      // Add additional special case mappings that we know about
      if (!languageAliases.has('iw') && supportedVoiceLanguageCodes.has('he')) {
        languageAliases.set('iw', 'he'); // Hebrew
        console.log(`[TTS] Adding known alias: iw -> he`);
      }
      
      if (!languageAliases.has('jw') && supportedVoiceLanguageCodes.has('jv')) {
        languageAliases.set('jw', 'jv'); // Javanese
        console.log(`[TTS] Adding known alias: jw -> jv`);
      }
    }
    
    // Log final results
    console.log("[TTS] Supported language codes:", Array.from(supportedVoiceLanguageCodes));
    console.log("[TTS] Base language codes with voices:", Object.keys(cachedVoicesByLanguage));
    console.log("[TTS] Language aliases:", Object.fromEntries(languageAliases));
    
    languageInitialized = true;
    return availableVoices;
  } catch (error) {
    console.warn("[TTS] Error initializing voices:", error);
    return null;
  }
};

// Resolve any language code aliases to their supported version
const resolveLanguageCode = (languageCode) => {
  if (!languageCode) return null;
  
  const normalizedCode = languageCode.toLowerCase().trim();
  
  // Check if this is an aliased code that needs resolution
  if (languageAliases.has(normalizedCode)) {
    const resolvedCode = languageAliases.get(normalizedCode);
    console.log(`[TTS] Resolved alias ${normalizedCode} to ${resolvedCode}`);
    return resolvedCode;
  }
  
  return normalizedCode;
};

// Find a supported language code based on the input language
const findSupportedLanguageCode = (inputLanguage) => {
  if (!inputLanguage) return null;
  
  // Normalize to lowercase and resolve any aliases
  const normalizedCode = resolveLanguageCode(inputLanguage);
  
  console.log(`[TTS] Finding supported language code for: ${normalizedCode}`);
  
  // Check if this language is directly supported, either as a base code or with a region
  if (supportedVoiceLanguageCodes.has(normalizedCode)) {
    console.log(`[TTS] Found direct support for: ${normalizedCode}`);
    return normalizedCode;
  }
  
  // Check if we have any language codes that start with this base code
  const matchingCodes = Array.from(supportedVoiceLanguageCodes)
    .filter(code => code.toLowerCase().startsWith(normalizedCode + '-'));
  
  if (matchingCodes.length > 0) {
    console.log(`[TTS] Found ${matchingCodes.length} matching codes with region, using: ${matchingCodes[0]}`);
    return matchingCodes[0];
  }
  
  // Check if we have any voices specifically for this base language
  if (cachedVoicesByLanguage[normalizedCode] && cachedVoicesByLanguage[normalizedCode].length > 0) {
    const firstVoice = cachedVoicesByLanguage[normalizedCode][0];
    console.log(`[TTS] Found voice with language code: ${firstVoice.matchedLanguageCode}`);
    return firstVoice.matchedLanguageCode;
  }
  
  // No match found
  console.log(`[TTS] No supported language code found for: ${normalizedCode}`);
  return null;
};

// Get the best voice for a language
const getBestVoiceForLanguage = (languageCode) => {
  if (!languageCode) return null;
  
  // Normalize to lowercase and resolve any aliases
  const normalizedCode = resolveLanguageCode(languageCode);
  
  console.log(`[TTS] Finding best voice for language: ${normalizedCode}`);
  
  // Check if we have any voices for this base language
  if (cachedVoicesByLanguage[normalizedCode] && cachedVoicesByLanguage[normalizedCode].length > 0) {
    // Prefer female voices when available
    const femaleVoices = cachedVoicesByLanguage[normalizedCode].filter(
      voice => voice.ssmlGender === 'FEMALE'
    );
    
    if (femaleVoices.length > 0) {
      console.log(`[TTS] Found female voice: ${femaleVoices[0].name}`);
      return {
        name: femaleVoices[0].name,
        languageCode: femaleVoices[0].matchedLanguageCode
      };
    }
    
    console.log(`[TTS] Using voice: ${cachedVoicesByLanguage[normalizedCode][0].name}`);
    return {
      name: cachedVoicesByLanguage[normalizedCode][0].name,
      languageCode: cachedVoicesByLanguage[normalizedCode][0].matchedLanguageCode
    };
  }
  
  // Return null if no match found
  console.log(`[TTS] No voice found for language: ${normalizedCode}`);
  return null;
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

    // Store the language code directly
    if (language && language.length > 0) {
      detectedLanguageCode = language;
      await AsyncStorage.setItem("studyLanguageCode", language);
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
      console.warn("[TTS] Error stopping speech:", error);
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
  if (!languageInitialized || !availableVoices) {
    await initializeVoices();
  }

  const speakingRate = Math.max(0.5, Math.min(1.5, (listeningSpeed - 0.5) * 1));

  console.log(`[TTS] Speaking sentence in language code: ${detectedLanguageCode}`);
  
  // First, try to find the best voice and language code for this language
  const bestVoice = getBestVoiceForLanguage(detectedLanguageCode);
  
  // If we found a voice, use its matched language code
  let ttsLanguageCode = null;
  let voiceName = null;
  
  if (bestVoice) {
    ttsLanguageCode = bestVoice.languageCode;
    voiceName = bestVoice.name;
  } else {
    // No voice found, try to find a supported language code
    ttsLanguageCode = findSupportedLanguageCode(detectedLanguageCode);
  }
  
  // If we still don't have a language code, fall back to English
  if (!ttsLanguageCode) {
    console.log("[TTS] No supported language found, falling back to English");
    ttsLanguageCode = "en-US";
  }

  try {
    // Check if we have a Google API key before attempting the API call
    if (!GOOGLE_TTS_API_KEY) {
      console.warn("[TTS] No Google API key found");
      if (onFinish) onFinish();
      return;
    }

    // Preparing TTS request body
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
      console.log(`[TTS] Using specific voice: ${voiceName}`);
    }

    console.log(`[TTS] Making TTS request with language: ${ttsLanguageCode}`);

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[TTS] API error:", JSON.stringify(errorData));
      if (onFinish) onFinish();
      return;
    }

    const data = await response.json();
    if (!data.audioContent) {
      console.warn("[TTS] No audio content in response");
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
              console.warn("[TTS] Error cleaning up sound:", error);
            } finally {
              if (onFinish) onFinish();
            }
          })();
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.warn("[TTS] Error playing sound:", error);
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
    console.warn("[TTS] Error in speech synthesis:", error);
    if (onFinish) onFinish(); // Call onFinish even on error
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
  initializeVoices,
  detectedLanguageCode
};