const getSimplificationPrompt = (sourceText, bookLanguage, studyLanguage, userLanguage) => {
  return `You will receive one sentence in ${bookLanguage} from a book.

Your task is to do three things in this order:
1. Translate the sentence into ${studyLanguage}.
2. Translate each sentence into ${userLanguage}.

Output format:
- Write each sentence in ${studyLanguage} on a line by itself, only one sentence per line.
- Under each sentence, write its ${userLanguage} translation.
- Do NOT number or group the sentences.
- Do NOT explain anything.
- Do NOT include the original ${bookLanguage} sentence.

Simplification rules:


Book sentence:
${sourceText}`;
};

export default getSimplificationPrompt;
