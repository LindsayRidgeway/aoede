const getSimplificationPrompt = (sourceText, bookLanguage, studyLanguage, userLanguage) => {
  return `You will receive one sentence in ${bookLanguage} from a book.

Your task is to do three things in this order:
1. Translate the sentence into ${studyLanguage}.
2. Do not simplify the sentence — preserve its structure and wording.
3. Translate the sentence into ${userLanguage}.

Output format:
- Write the sentence in ${studyLanguage}.
- Under it, write its ${userLanguage} translation.
- Do NOT include the original ${bookLanguage} sentence.

Book sentence:
${sourceText}`;
};

export default getSimplificationPrompt;