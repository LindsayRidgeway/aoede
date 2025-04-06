const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 15) => {
  return `You will receive one sentence from a book.

Your job is to simplify it for a 15-year-old native ${targetLanguage} speaker.

${sourceText}

Guidelines:
1. Sentences may be up to 15 words long.
2. Use vocabulary familiar to a high school student.
3. Preserve tone, literary devices, and emotional impact.
4. Keep sentence order and meaning intact.

Formatting:
- One simplified sentence per line.
- Punctuation is required.
- No comments or numbering. Just return the sentences.`;
};

export default getSimplificationPrompt;