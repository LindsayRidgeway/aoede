export const fetchBookTextFromChatGPT = async (query) => {
  try {
    const requestBody = {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You retrieve the first paragraph of books or genres in their original language. Respond with only the paragraph text, followed by the detected two-letter ISO language code (e.g., 'fr', 'de', 'ru'). The language code must be on a separate last line, and contain only the two-letter code." },
        { role: "user", content: `Provide the first paragraph of "${query}" in its original language, followed by the language code on a new line.` }
      ]
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer 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`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const fullResponse = data.choices[0].message.content.trim();
    const parts = fullResponse.split("\n");

    if (parts.length < 2) {
      console.error("❌ API Response Missing Expected Formatting:", fullResponse);
      return { text: "⚠ Book fetch failed", language: "en" };
    }

    let text = parts.slice(0, -1).join("\n").trim();
    let detectedLanguage = parts[parts.length - 1].trim().toLowerCase();

    // ✅ Fix: Sanitize language code
    detectedLanguage = detectedLanguage.replace(/[^a-z]/g, ""); // Removes invalid characters
    if (!/^[a-z]{2}$/i.test(detectedLanguage)) {
      console.warn(`⚠ AI returned invalid language code: "${detectedLanguage}". Defaulting to "en".`);
      detectedLanguage = "en";
    }

    // ✅ Fix: Trim text to avoid "QUERY LENGTH LIMIT EXCEEDED"
    const maxLength = 450; // Safe limit below 500 chars
    if (text.length > maxLength) {
      console.warn(`⚠ Trimming text: Exceeds ${maxLength} chars`);
      text = text.slice(0, maxLength) + "..."; // Truncate with ellipsis
    }

    console.log(`🔍 AI Response Parsed: Detected language = ${detectedLanguage}, Extracted text =`, text);

    return { text, language: detectedLanguage };
  } catch (error) {
    console.error("❌ Error fetching book text:", error);
    return { text: "⚠ Book fetch failed", language: "en" };
  }
};

// ✅ Ensure `translateText()` is properly exported
export const translateText = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;

  try {
    console.log(`🔄 Translating from ${sourceLang} to ${targetLang}:`, text);

    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    );

    const data = await response.json();
    const translatedText = data.responseData.translatedText || text;

    console.log(`✅ Translation successful:`, translatedText);
    return translatedText;
  } catch (error) {
    console.error("❌ Translation error:", error);
    return "⚠ Translation failed";
  }
};