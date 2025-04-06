const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 6) => {
  return `You will receive one sentence from a book.

Your job is to simplify it so that a 6-year-old native ${targetLanguage} speaker can easily understand it.

${sourceText}

Rules:
1. Each simplified sentence must be only 4 to 8 words long.
2. Each sentence can include ONE harder word.
3. Use only very basic grammar and vocabulary otherwise.
4. Keep present tense when possible.
5. Try to follow the structure of the original sentence.
6. IMPORTANT: Your response MUST be in the ${targetLanguage} language, not English.

Formatting:
- Put ONE simplified sentence per line.
- End each sentence with a period, question mark, or exclamation point.
- Do NOT number or group the sentences.
- Do NOT explain anything. Just return the simplified sentences.`;
};

export default getSimplificationPrompt;