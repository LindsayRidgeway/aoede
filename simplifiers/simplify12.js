const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 12) => {
  return `You will receive one sentence from a book.

Your job is to simplify it so that a 12-year-old native ${targetLanguage} speaker can easily understand it.

${sourceText}

Rules:
1. Sentences can be up to 12 words long.
2. Use familiar grammar and tone for a middle schooler.
3. You may keep metaphors if they’re easy to understand.
4. Preserve meaning and sequence of ideas.

Formatting:
- One simplified sentence per line.
- Use periods, question marks, or exclamations.
- No titles, numbers, or explanations. Just the output.`;
};

export default getSimplificationPrompt;