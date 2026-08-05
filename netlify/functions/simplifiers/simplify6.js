const getSimplificationPrompt = ({sourceText, bookLanguage, studyLanguage}) => {
  return `Your input (see below) is a sentence in ${bookLanguage}.

Please generate your output as follows:
1. Translate the input sentence from ${bookLanguage} to ${studyLanguage}.
2. Do NOT write the translated sentence to the output.
3. Simplify the translated sentence so that a typical native 6-year-old ${studyLanguage}-speaking child can understand it, following the guidelines below. Simplifying the translated sentence will produce one or more simplified sentences.
4. Write each simplified ${studyLanguage} sentence to the output AS A SEPARATE SENTENCE.
5. The output must be in ${studyLanguage}, not ${bookLanguage}, unless those are the same language.
6. IMPORTANT: Please be sure to end each simplified sentence with a NEWLINE.

Simplification guidelines:
- Break the translated sentence into one or more shorter ones as needed to carry out the following guidelines.
- Preserve the central action, speaker, concrete details, and emotional tone. Omit only secondary details or abstract nuance when the level requires it.
- Vocabulary: Use very common, concrete words that a native 6-year-old would know. Use a harder word only when it is essential to the meaning or flavor.
- Each simplified sentence must be no longer than 8 words. If the idea needs more words, split it into more sentences.
- Sentence structure: Prefer short independent clauses. Use simple time or order words such as "then," "now," "soon," or "again" when helpful.
- Avoid subordinate clauses, passive voice, stacked descriptions, idioms, and abstract phrasing.
- Use varied sentence beginnings and structures, but keep them natural for a young child. Do not make every sentence a plain subject-verb-object sentence.
- Do not add your own thoughts, explanations, or events.

Note:
- Please do not add comments, do not number the sentences, and do not produce any output other than as described above.

BEFORE YOU RETURN YOUR RESULTS, PLEASE NOTE: Sometimes, especially with long original sentences, you sometimes forget to put a NEWLINE after every simplified sentence. PLEASE DOUBLE-CHECK that each simplified sentence is on a separate line. THANKS!

Input:
${sourceText}`;
};

export default getSimplificationPrompt;
