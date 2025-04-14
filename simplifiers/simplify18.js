const getSimplificationPrompt = (sourceText, bookLanguage, studyLanguage, userLanguage) => {
  return `You will receive one or more sentences in ${bookLanguage} from a book.

Your task is to do three things in this order:
1. Translate each sentence into ${studyLanguage}.
2. Do not simplify the sentences — preserve their structure and wording.
3. Translate each sentence into ${userLanguage}.

Output format:
- Write each sentence in ${studyLanguage} on a line by itself, only one sentence per line.
- Under each sentence, write its ${userLanguage} translation.
- Do NOT number or group the sentences.
- Do NOT explain anything.
- Do NOT include the original ${bookLanguage} sentences.

Book text:
${sourceText}`;
};

export default getSimplificationPrompt;