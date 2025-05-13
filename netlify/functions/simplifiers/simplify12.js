const getSimplificationPrompt = ({sourceText, bookLanguage, studyLanguage}) => {
  return `Your input (see below) is a sentence in ${bookLanguage}.

Please generate your output as follows:
1. Translate the input sentence from ${bookLanguage} to ${studyLanguage}.
2. Do NOT write the translated sentence to the output.
3. Simplify the translated sentence so that a typical native 12-year-old ${studyLanguage}-speaking child can understand it, following the guidelines below. Simplifying the translated sentence will produce one or more simplified sentences.
4. Write each simplified ${studyLanguage} sentence to the output as a separate sentence.
5. IMPORTANT: Please be sure to end each simplified sentence with a NEWLINE.

Simplification guidelines:
- Break the translated sentence into one or more shorter ones as needed to carry out the following guidelines.
- Vocabulary: intermediate vocabulary, except you may use ONE harder word per simplified sentence.
- Each simplified sentence should be no longer than 12 words.
- Simplifying the sentence may require you to lose some of its meaning, but do not add your own thoughts of what the sentence might have said instead.
- Sentence structure: Use varied sentence beginnings and structure for the simplified sentences to avoid the monotony of continuous SVO sentences.

Note:
- Please do not add comments, do not number the sentences, and do not produce any other output other than as described above.

Input:
${sourceText}`;
};

export default getSimplificationPrompt;
