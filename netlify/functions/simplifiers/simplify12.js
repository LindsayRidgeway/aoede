const getSimplificationPrompt = ({sourceText, bookLanguage, studyLanguage}) => {
  return `Your input (see below) is a sentence in ${bookLanguage}.

Please generate your output as follows:
1. Translate the input sentence from ${bookLanguage} to ${studyLanguage}.
2. Do NOT write the translated sentence to the output.
3. Simplify the translated sentence so that a typical native 12-year-old ${studyLanguage}-speaking child can understand it, following the guidelines below. Simplifying the translated sentence will produce one or more simplified sentences.
4. Write each simplified ${studyLanguage} sentence to the output AS A SEPARATE SENTENCE.
5. The output must be in ${studyLanguage}, not ${bookLanguage}, unless those are the same language.
6. IMPORTANT: Please be sure to end each simplified sentence with a NEWLINE.

Simplification guidelines:
- Break the translated sentence into one or more shorter ones as needed to carry out the following guidelines.
- Preserve the central action, speaker, important details, emotional tone, and main cause-and-effect relationships. Omit only secondary nuance when necessary.
- Vocabulary: Use clear middle-grade vocabulary. Keep precise literary words when they matter, but replace rare or archaic words that are not important to style or character.
- Each simplified sentence must be no longer than 12 words. If the idea needs more words, split it into more sentences.
- Sentence structure: Use simple, compound, and moderately complex sentences. You may use clear subordinate clauses with "because," "although," "while," "after," or "before."
- Avoid tangled syntax, stacked clauses, unclear pronoun chains, and heavy abstractions.
- Use varied sentence beginnings and structures. Preserve some rhythm and suspense when the original sentence depends on them.
- Do not add your own thoughts, explanations, or events.

Note:
- Please do not add comments, do not number the sentences, and do not produce any output other than as described above.

BEFORE YOU RETURN YOUR RESULTS, PLEASE NOTE: Sometimes, especially with long original sentences, you sometimes forget to put a NEWLINE after every simplified sentence. PLEASE DOUBLE-CHECK that each simplified sentence is on a separate line. THANKS!

Input:
${sourceText}`;
};

export default getSimplificationPrompt;
