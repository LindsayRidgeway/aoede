const getSimplificationPrompt = (sourceText, bookLanguage, studyLanguage, userLanguage) => {
  return `You will receive one sentence in {bookLanguage} from a book.

Your task is to do three things:
1. Translate the sentence into {studyLanguage}.
2. Simplify the translated sentence so that a native {studyLanguage}-speaking child at reading level 15 can understand it.
3. Translate each simplified sentence into {userLanguage}, so the reader can understand the meaning.

Output format:
- Write each simplified sentence in {studyLanguage} on a line by itself.
- Under each sentence, write its {userLanguage} translation.
- Do NOT number or group the sentences.
- Do NOT explain anything.
- Do NOT include the original {bookLanguage} sentence.

Simplification rules:
- Vocabulary: advanced vocabulary and complex grammar.
- Each simplified sentence must be 4 to 8 words long.
- Use only basic grammar and sentence forms appropriate for RL 15.
- You may use ONE harder word per sentence.
- Use indirect speech, passive voice, and a range of connectors.
- Break the sentence into multiple simpler ones as needed.

Book sentence:
{sourceText}`;
};

export default getSimplificationPrompt;
