const getSimplificationPrompt = ({sourceText, bookLanguage, studyLanguage}) => {
  return `Your input (see below) is a sentence in ${bookLanguage}.

Please generate your output as follows:
1. Translate the input sentence from ${bookLanguage} to ${studyLanguage}.
2. Write the ${studyLanguage} sentence to the output.
3. IMPORTANT: Please be sure to end the sentence with a NEWLINE.

Note:
- Please do not add comments and do not produce any output other than the ${studyLanguage} sentence.

Input:
${sourceText}`;
};

export default getSimplificationPrompt;
