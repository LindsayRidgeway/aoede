const getSimplificationPrompt = (sourceText, bookLanguage, studyLanguage, userLanguage) => {
  return `You will receive one or more sentences in ${bookLanguage} from a book.

Your task is to do three things in this order:
1. Translate the sentence into ${studyLanguage}.
2. Simplify the translated sentence so that a native ${studyLanguage}-speaking child at reading level 6 can understand it.
3. Translate each simplified sentence into ${userLanguage}.

Output format:
- Write each simplified sentence in ${studyLanguage} on a line by itself, only one sentence per line.
- Under each sentence, write its ${userLanguage} translation.
- Do NOT number or group the sentences.
- Do NOT explain anything.
- Do NOT include the original ${bookLanguage} sentence.

Simplification rules:
- Break the translated sentence into multiple shorter ones as needed to carry out the following guidelines.
- Vocabulary: very basic vocabulary, except you may use ONE harder word per simplified sentence.
- Each simplified sentence should be no longer than 8 words.
- Simplifying the sentence may require you to lose some of its meaning, but do not add your own thoughts of what the sentence might have said instead.
- Sentence structure: Use varied sentence beginnings and structure for the simplified sentences to avoid the monotony of continuous SVO sentences.

After you have completed this work, please examine the first sentence in ${studyLanguage}
that you are you planning to return. If it turns out that it contains multiple sentences,
which is a mistake you sometimes make, please discard your work and repeat these instructions
with the original set of one or more sentences in ${bookLanguage}. 

Book sentence:
${sourceText}`;
};

export default getSimplificationPrompt;