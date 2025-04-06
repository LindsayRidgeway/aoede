const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 9) => {
  return `You will receive one sentence from a book.

Your job is to simplify it so that a 9-year-old native ${targetLanguage} speaker can easily understand it.

${sourceText}

Rules:
1. Keep each sentence under 9 words.
2. Use common vocabulary for a child that age.
3. Avoid long phrases or abstract ideas.
4. Follow the original sentence's structure where possible.

Formatting:
- One simplified sentence per line.
- End with proper punctuation.
- Do not number or comment. No explanations.`;
};

export default getSimplificationPrompt;