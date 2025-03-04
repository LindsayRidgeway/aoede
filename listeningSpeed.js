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
    console.log("DEBUG-GSLS1: Getting stored listening speed");
    const storedListeningSpeed = await AsyncStorage.getItem("listeningSpeed");
    console.log("DEBUG-GSLS2: Retrieved:", storedListeningSpeed);
    return storedListeningSpeed ? parseFloat(storedListeningSpeed) || 1.0 : 1.0;
  } catch (error) {
    console.error("DEBUG-GSLS-ERROR:", error);
    return 1.0;
  }
};

export const getStoredStudyLanguage = async () => {
  try {
    console.log("DEBUG-GSSL1: Getting stored study language");
    const storedStudyLanguage = await AsyncStorage.getItem("studyLanguage");
    const storedLanguageCode = await AsyncStorage.getItem("studyLanguageCode");

    console.log("DEBUG-GSSL2: Retrieved language:", storedStudyLanguage);
    console.log("DEBUG-GSSL3: Retrieved code:", storedLanguageCode);

    if (storedLanguageCode) {
      detectedLanguageCode = storedLanguageCode; // Cache the stored code
      console.log("DEBUG-GSSL4: Updated detectedLanguageCode to:", detectedLanguageCode);
    }

    return storedStudyLanguage ? storedStudyLanguage : "";
  } catch (error) {
    console.error("DEBUG-GSSL-ERROR:", error);
    return "";
  }
};

export const saveStudyLanguage = async (language) => {
  try {
    console.log("DEBUG-SSL1: Saving study language:", language);
    await AsyncStorage.setItem("studyLanguage", language);
    console.log("DEBUG-SSL2: Saved study language");

    // Detect language code and store it
    console.log("DEBUG-SSL3: Detecting language code");
    const languageCode = await detectLanguageCode(language);
    console.log("DEBUG-SSL4: Detected code:", languageCode);
    
    if (languageCode) {
      await AsyncStorage.setItem("studyLanguageCode", languageCode);
      console.log("DEBUG-SSL5: Saved language code:", languageCode);
    } else {
      console.log("DEBUG-SSL6: No language code detected");
    }
  } catch (error) {
    console.error("DEBUG-SSL-ERROR:", error);
  }
};

export const saveListeningSpeed = async (speed) => {
  try {
    console.log("DEBUG-SLS1: Saving listening speed:", speed);
    await AsyncStorage.setItem("listeningSpeed", speed.toString());
    console.log("DEBUG-SLS2: Saved listening speed");
  } catch (error) {
    console.error("DEBUG-SLS-ERROR:", error);
  }
};

export const updateSpeechRate = async (rate, setSpeechRate) => {
  console.log("DEBUG-USR1: Updating speech rate:", rate);
  setSpeechRate(rate);
  try {
    await AsyncStorage.setItem("speechRate", rate.toString());
    console.log("DEBUG-USR2: Saved speech rate");
  } catch (error) {
    console.error("DEBUG-USR-ERROR:", error);
  }
};

// Add function to stop speaking
export const stopSpeaking = async () => {
  console.log("DEBUG-SS1: Stopping speaking");
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      currentSound = null;
      console.log("DEBUG-SS2: Sound stopped");
    } catch (error) {
      console.error("DEBUG-SS-ERROR:", error);
    }
  } else {
    console.log("DEBUG-SS3: No sound to stop");
  }
};

const supportedTTSLanguages = {
  "en": "en-US", "fr": "fr-FR", "de": "de-DE", "es": "es-ES", "it": "it-IT",
  "ru": "ru-RU", "zh": "zh-CN", "ja": "ja-JP", "ko": "ko-KR", "ar": "ar-XA",
  "he": "he-IL", "iw": "he-IL" // Hebrew support (Google uses both codes)
};

export const speakSentenceWithPauses = async (sentence, listeningSpeed, onFinish) => {
    if (!sentence) {
      console.log("DEBUG-SSWP1: Empty sentence, nothing to speak");
      return;
    }

    console.log("DEBUG-SSWP2: Speaking sentence:", sentence);
    console.log("DEBUG-SSWP3: Speed:", listeningSpeed);

    // Stop any currently playing audio first
    await stopSpeaking();
    console.log("DEBUG-SSWP4: Previous audio stopped");

    const speakingRate = Math.max(0.5, Math.min(1.5, (listeningSpeed - 0.5) * 1));
    console.log("DEBUG-SSWP5: Calculated speaking rate:", speakingRate);
    
    console.log("DEBUG-SSWP6: Current language code:", detectedLanguageCode);
    const ttsLanguageCode = supportedTTSLanguages[detectedLanguageCode] || detectedLanguageCode;
    console.log("DEBUG-SSWP7: TTS language code:", ttsLanguageCode);

    try {
        console.log("DEBUG-SSWP8: Fetching TTS audio from Google");
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
        console.log("DEBUG-SSWP9: TTS response received");
        
        if (!data.audioContent) {
          console.log("DEBUG-SSWP10: No audio content in response");
          throw new Error("No audio content");
        }

        // Decode Base64 and play MP3
        console.log("DEBUG-SSWP11: Creating sound object");
        const sound = new Audio.Sound();
        currentSound = sound; // Store reference to current sound
        
        const audioUri = `data:audio/mp3;base64,${data.audioContent}`;
        console.log("DEBUG-SSWP12: Loading audio");
        await sound.loadAsync({ uri: audioUri });
        
        // Set up a listener for when playback finishes
        console.log("DEBUG-SSWP13: Setting up playback listener");
        sound.setOnPlaybackStatusUpdate(status => {
            if (status.didJustFinish) {
                console.log("DEBUG-SSWP14: Playback finished");
                currentSound = null;
                if (onFinish) {
                  console.log("DEBUG-SSWP15: Calling onFinish callback");
                  onFinish();
                }
            }
        });
        
        console.log("DEBUG-SSWP16: Starting playback");
        await sound.playAsync();
        console.log("DEBUG-SSWP17: Playback started");
    } catch (error) {
        console.error("DEBUG-SSWP-ERROR:", error);
        if (onFinish) {
          console.log("DEBUG-SSWP18: Calling onFinish after error");
          onFinish();
        }
    }
};

export const detectLanguageCode = async (languageName) => {
  if (!languageName) {
    console.log("DEBUG-DLC1: Empty language name");
    return "";
  }
  
  console.log("DEBUG-DLC2: Detecting language code for:", languageName);
  console.log("DEBUG-DLC3: Last detected language:", lastDetectedLanguage);
  console.log("DEBUG-DLC4: Current detected code:", detectedLanguageCode);
  
  if (detectedLanguageCode && languageName === lastDetectedLanguage) {
    console.log("DEBUG-DLC5: Using cached language code:", detectedLanguageCode);
    return detectedLanguageCode;
  }
  
  lastDetectedLanguage = languageName;
  console.log("DEBUG-DLC6: Updated last detected language");
  
  try {
    console.log("DEBUG-DLC7: Fetching language list from Google API");
    // Fetch Google's official language list
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_TRANSLATE_API_KEY}&target=${navigator.language.split('-')[0] || "en"}`,
      { method: "GET" }
    );

    const data = await response.json();
    console.log("DEBUG-DLC8: API response received");
    
    if (!data || !data.data || !data.data.languages) {
      console.log("DEBUG-DLC9: Invalid response format:", data);
      return "";
    }

    console.log(`DEBUG-DLC10: Got ${data.data.languages.length} languages from API`);
    
    // Convert API list to a mapping of "localized name" → "language code"
    const languageMap = {};
    for (const lang of data.data.languages) {
      if (lang.name) {
        languageMap[lang.name.toLowerCase()] = lang.language;
      }
    }
    
    console.log(`DEBUG-DLC11: Created map with ${Object.keys(languageMap).length} entries`);
    
    // Direct lookup - try a few variations of hebrew
    if (languageName.toLowerCase() === "hebrew") {
      console.log("DEBUG-DLC12: Direct detection for Hebrew");
      detectedLanguageCode = "he";
      return "he";
    }
    
    if (languageName.toLowerCase() === "עברית") { // Hebrew in Hebrew
      console.log("DEBUG-DLC13: Direct detection for עברית");
      detectedLanguageCode = "he";
      return "he";
    }

    // Match the user's input to a language code
    const userInput = languageName.toLowerCase();
    console.log("DEBUG-DLC14: Looking for match for:", userInput);
    
    detectedLanguageCode = languageMap[userInput] || "";
    
    if (detectedLanguageCode) {
      console.log("DEBUG-DLC15: Found direct match:", detectedLanguageCode);
      return detectedLanguageCode;
    } else {
      // Try to find a partial match
      for (const [name, code] of Object.entries(languageMap)) {
        console.log(`DEBUG-DLC16: Checking ${name} against ${userInput}`);
        if (name.includes(userInput) || userInput.includes(name)) {
          console.log(`DEBUG-DLC17: Found partial match: ${name} → ${code}`);
          detectedLanguageCode = code;
          return code;
        }
      }
      
      console.log("DEBUG-DLC18: No match found");
      return "";
    }
  } catch (error) {
    console.error("DEBUG-DLC-ERROR:", error);
    return "";
  }
};