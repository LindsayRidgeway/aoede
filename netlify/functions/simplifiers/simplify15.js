const getSimplificationPrompt = ({sourceText, bookLanguage, studyLanguage}) => {
  return `Your input (see below) is a sentence in ${bookLanguage}.

Please generate your output as follows:
1. Translate the input sentence from ${bookLanguage} to ${studyLanguage}.
2. Do NOT write the translated sentence to the output.
3. Simplify the translated sentence so that a typical native 15-year-old ${studyLanguage}-speaking person can understand it, following the guidelines below. Simplifying the translated sentence will produce one or more simplified sentences.
4. Write each simplified ${studyLanguage} sentence to the output AS A SEPARATE SENTENCE.
5. The output must be in ${studyLanguage}, not ${bookLanguage}, unless those are the same language.
6. IMPORTANT: Please be sure to end each simplified sentence with a NEWLINE.

Simplification guidelines:
- Break the translated sentence into one or more shorter ones as needed to carry out the following guidelines.
- Preserve the action, speaker, important details, emotional tone, imagery, and main nuance. Lose meaning only when the original is too dense to keep clearly.
- Vocabulary: Use accessible young-adult vocabulary. Keep precise literary, emotional, or technical words when they carry meaning, style, or character.
- Each simplified sentence should usually be no longer than 16 words, but a graceful longer sentence is acceptable when it remains clear.
- Sentence structure: Use a natural mix of simple, compound, and complex sentences. Keep clear subordination, contrast, rhythm, and suspense when useful.
- Untangle archaic or overloaded syntax, but do not flatten style into a string of plain statements.
- Use varied sentence beginnings and structures. Avoid monotonous subject-verb-object repetition.
- Do not add your own thoughts, explanations, or events.

Note:
- Please do not add comments, do not number the sentences, and do not produce any output other than as described above.

BEFORE YOU RETURN YOUR RESULTS, PLEASE NOTE: Sometimes, especially with long original sentences, you sometimes forget to put a NEWLINE after every simplified sentence. PLEASE DOUBLE-CHECK that each simplified sentence is on a separate line. THANKS!

Input:
${sourceText}`;
};

export default getSimplificationPrompt;
