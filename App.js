import React, { useState, useEffect } from 'react';
import { fetchBookTextFromChatGPT, translateText } from './api';
import { MainUI } from './UI';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Re-added missing import

export default function App() {
  const [uiText, setUiText] = useState({});
  const [userQuery, setUserQuery] = useState("");  
  const [sentence, setSentence] = useState("");
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [showText, setShowText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("ru");
  const [loadingBook, setLoadingBook] = useState(false);

  useEffect(() => {
    const userLang = navigator.language.split('-')[0] || "en";
    const labels = [
      "Calliope", "Source Material", "Enter a book title or genre", "Listen", "Next Sentence",
      "Load Book", "Show Foreign Sentence", "Show Translation", "Reading Speed"
    ];

    const translateLabels = async () => {
      try {
        const translatedLabels = await Promise.all(labels.map(label => translateText(label, "en", userLang)));
        setUiText({
          appName: translatedLabels[0],
          sourceMaterial: translatedLabels[1],
          enterBook: translatedLabels[2],
          listen: translatedLabels[3],
          next: translatedLabels[4],
          loadBook: translatedLabels[5],
          showText: translatedLabels[6],
          showTranslation: translatedLabels[7],
          readingSpeed: translatedLabels[8]
        });
      } catch (error) {
        console.error("❌ ERROR: Failed to translate UI labels:", error);
      }
    };

    translateLabels();

    // ✅ Load stored values on startup
    const loadStoredSettings = async () => {
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

    loadStoredSettings();
  }, []);

  // ✅ Save userQuery to storage when changed
  const updateUserQuery = async (query) => {
    setUserQuery(query);
    try {
      await AsyncStorage.setItem("userQuery", query);
      console.log(`✅ Saved userQuery to storage: "${query}"`);
    } catch (error) {
      console.error("❌ ERROR: Saving userQuery failed:", error);
    }
  };

  // ✅ Save speechRate to storage when changed
  const updateSpeechRate = async (rate) => {
    setSpeechRate(rate);
    try {
      await AsyncStorage.setItem("speechRate", rate.toString());
      console.log(`✅ Saved speechRate to storage: "${rate}"`);
    } catch (error) {
      console.error("❌ ERROR: Saving speechRate failed:", error);
    }
  };

  const loadBook = async () => {
    if (!userQuery) return;

    setLoadingBook(true);

    try {
      const { text, language } = await fetchBookTextFromChatGPT(userQuery);
      setSentence(text);
      setDetectedLanguage(language || "en");

      let validSourceLang = language ? language.toLowerCase().trim() : "en";
      validSourceLang = validSourceLang.replace(/[^a-z]/g, "");

      if (!/^[a-z]{2}$/i.test(validSourceLang)) {
        console.warn(`⚠ AI returned invalid language code: "${validSourceLang}". Defaulting to "en".`);
        validSourceLang = "en";
      }

      console.log(`🔍 Translating from ${validSourceLang} to ${studyLanguage}:`, text);

      if (typeof translateText !== "function") {
        console.error("❌ translateText is not a function. Check import in App.js.");
        return;
      }

      if (validSourceLang === studyLanguage) {
        setTranslatedSentence(text);
      } else {
        const translated = await translateText(text, validSourceLang, studyLanguage);
        setTranslatedSentence(translated.replace(/^"|"$/g, ""));
      }
    } catch (error) {
      console.error("❌ Book loading failed:", error);
    } finally {
      setLoadingBook(false);
    }
  };

  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}  
      setUserQuery={updateUserQuery}  // ✅ Ensure updates persist
      loadBook={loadBook}
      sentence={translatedSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={updateSpeechRate}  // ✅ Ensure updates persist
      speakSentence={() => {
        if (!translatedSentence) return;
        Speech.stop();
        Speech.speak(translatedSentence, { rate: speechRate, language: studyLanguage });
      }}
      loadingBook={loadingBook}
    />
  );
}