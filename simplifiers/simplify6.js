const getSimplificationPrompt = (sourceText, bookLanguage, studyLanguage) => {
  return `Your input (see below) is a string of one or more sentences in ${bookLanguage}.

Please produce your output following the following steps:
1. Write the five-character sentence "/+++/" to the output.
2. Read a sentence from the input.
3. Translate that sentence into ${studyLanguage}.
4. Simplify the translated sentence into one or more sentences in ${studyLanguage} so that a typical native 6-year-old ${studyLanguage}-speaking child can understand it, following the guidelines below.
5. Write each resulting simplified sentence to the output as a separate sentence. If, for example, you create three simplified sentences from a single translated sentence, write the three simplified sentences to the output.
6. Go back to step 1 until all of the input sentences have been processed.

Simplification guidelines:
- Break the translated sentence into one or more shorter ones as needed to carry out the following guidelines.
- Vocabulary: very basic vocabulary, except you may use ONE harder word per simplified sentence.
- Each simplified sentence should be no longer than 8 words.
- Simplifying the sentence may require you to lose some of its meaning, but do not add your own thoughts of what the sentence might have said instead.
- Sentence structure: Use varied sentence beginnings and structure for the simplified sentences to avoid the monotony of continuous SVO sentences.

Note:
- Please do not add comments, do not number the sentences, and do not produce any other output other than as described above.

Input:
${sourceText}`;
};

export default getSimplificationPrompt;