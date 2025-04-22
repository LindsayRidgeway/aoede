const getSimplificationPrompt = (sourceText, bookLanguage, studyLanguage, userLanguage) => {
  return `You will receive one or more sentences in ${bookLanguage} from a book.

Your task is to do the following for EACH sentence:
1. Translate the sentence into ${studyLanguage}.
2. Do not simplify the sentence — preserve its structure and wording.
3. Translate the same sentence into ${userLanguage}.

Output format:
- For each input sentence:
  - Write the translated sentence in ${studyLanguage} on one line.
  - On the next line, write its ${userLanguage} translation.
- Process each input sentence separately, maintaining a strict one-to-one relationship.
- Make sure your output has exactly two lines for each input sentence (one for ${studyLanguage}, one for ${userLanguage}).
- Do NOT combine multiple input sentences.
- Do NOT split a single input sentence into multiple output sentences.
- Do NOT number or group the sentences.
- Do NOT explain anything.
- Do NOT include the original ${bookLanguage} sentences.

Book text:
${sourceText}`;
};

export default getSimplificationPrompt;