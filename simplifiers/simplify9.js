const getSimplificationPrompt = (sourceText, bookLanguage, studyLanguage, userLanguage) => {
  return `You will receive one or more sentences in ${bookLanguage} from a book.

Your task is to do three things in this order:
1. Translate the sentence into ${studyLanguage}.
2. Simplify the translated sentence so that a native ${studyLanguage}-speaking child at reading level 9 can understand it.
3. Translate each simplified sentence into ${userLanguage}.

Output format:
- Write each simplified sentence in ${studyLanguage} on a line by itself, only one sentence per line.
- Under each sentence, write its ${userLanguage} translation.
- Do NOT number or group the sentences.
- Do NOT explain anything.
- Do NOT include the original ${bookLanguage} sentence.

Simplification rules:
- Break the translated sentence into multiple shorter ones as needed to carry out the following guidelines.
- Vocabulary: basic vocabulary, with ONE harder word allowed per simplified sentence.
- Each simplified sentence should be no longer than 10 words.
- Sentence structure: Use varied sentence beginnings and structure for the simplified sentences to avoid the monotony of continuous SVO sentences.

Book sentence:
${sourceText}`;
};

export default getSimplificationPrompt;