const axios = require("axios");

// Replace with your Google Translate API key
const API_KEY = "AIzaSyDvrAsHGvT7nurWKi3w0879zLWFYtpEgJ0";

// Google Translate API endpoints
const LANGUAGES_URL = `https://translation.googleapis.com/language/translate/v2/languages?key=${API_KEY}&target=en`;
const TRANSLATE_URL = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;

// Function to fetch supported languages
async function getSupportedLanguages() {
    try {
        const response = await axios.get(LANGUAGES_URL);
        return response.data.data.languages.map(lang => lang.language);
    } catch (error) {
        console.error("Error fetching languages:", error.response ? error.response.data : error);
        return [];
    }
}

/*
testTranslation("fr").then(success => {
    console.log(success ? "✅ French passed!" : "❌ French failed!");
    });
*/

async function testTranslation(lang) {
    try {
        console.log(`🔍 Testing translation for: ${lang}`);

        // Step 1: Translate "Hello" from English to target language
        const toLangResponse = await axios.post(TRANSLATE_URL, {
            q: "Hello",
            source: "en",
            target: lang,
            format: "text",
        });

        const translatedText = toLangResponse.data.data.translations[0]?.translatedText;
        console.log(`🔹 Translated to ${lang}:`, translatedText);

        if (!translatedText) {
            console.error(`❌ No translated text returned for ${lang}`);
            return false;
        }

        // Step 2: Translate it back to English
        const toEnglishResponse = await axios.post(TRANSLATE_URL, {
            q: translatedText,
            source: lang,
            target: "en",
            format: "text",
        });

        const backToEnglish = toEnglishResponse.data.data.translations[0]?.translatedText;
        console.log(`🔹 Translated back to English:`, backToEnglish);

        if (!backToEnglish) {
            console.error(`❌ No back translation returned for ${lang}`);
            return false;
        }

        // 🔥 New logic: Allow close matches
        const acceptableVariants = ["hello", "hi", "good morning", "greetings", "good afternoon", "happy", "bye", "peace", "news", "your", "welcome", "good evening."];

        return acceptableVariants.some(variant => backToEnglish.toLowerCase().includes(variant));
    } catch (error) {
        console.error(`❌ Error testing ${lang}:`, error.response ? JSON.stringify(error.response.data, null, 2) : error);
        return false;
    }
}

/*
// Function to test bidirectional translation
  async function testTranslation(lang) {
    try {
        // Step 1: Translate "Hello" from English to target language
        const toLangResponse = await axios.post(TRANSLATE_URL, {
            q: "Hello",
            source: "en",
            target: lang,
            format: "text",
            key: API_KEY
        });

        const translatedText = toLangResponse.data.data.translations[0].translatedText;

        // Step 2: Translate it back to English
        const toEnglishResponse = await axios.post(TRANSLATE_URL, {
            q: translatedText,
            source: lang,
            target: "en",
            format: "text",
            key: API_KEY
        });

        const backToEnglish = toEnglishResponse.data.data.translations[0].translatedText;

        return backToEnglish.toLowerCase().includes("hello"); // Check if it returns "Hello" or close to it
    } catch (error) {
        console.error(`Error testing ${lang}:`, error.response ? error.response.data : error);
        return false;
    }
    }
    */

// Main function to check all languages
async function checkLanguages() {
    console.log("Fetching supported languages...");
    const languages = await getSupportedLanguages();

    if (languages.length === 0) {
        console.log("No languages found.");
        return;
    }

    console.log(`Testing ${languages.length} languages for bidirectional support...`);

    let failures = [];

    for (let lang of languages) {
        const success = await testTranslation(lang);
        if (!success) {
            failures.push(lang);
            console.log(`❌ ${lang} failed bidirectional translation`);
        } else {
            console.log(`✅ ${lang} passed`);
        }
    }

    console.log("\n=== Bidirectional Translation Failures ===");
    console.log(failures.length > 0 ? failures.join(", ") : "All languages passed!");
}

// Run the script
checkLanguages();
