const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 18) => {
  return `You will receive one sentence from a book.

Do not simplify it. Return it exactly as it is, but ensure proper formatting.

${sourceText}

Formatting:
- One sentence per line.
- Use proper punctuation: period, question mark, or exclamation.
- Do not comment, explain, or translate.
- Just return the sentence, unchanged.`;
};

export default getSimplificationPrompt;