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
        const acceptableVariants = ["hello", "hi", "good morning"];

        return acceptableVariants.some(variant => backToEnglish.toLowerCase().includes(variant));
    } catch (error) {
        console.error(`❌ Error testing ${lang}:`, error.response ? JSON.stringify(error.response.data, null, 2) : error);
        return false;
    }
}