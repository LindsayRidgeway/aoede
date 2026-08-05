const getSimplificationPrompt = ({sourceText, bookLanguage, studyLanguage}) => {
  return `Your input (see below) is a sentence in ${bookLanguage}.

Please generate your output as follows:
1. Translate the input sentence from ${bookLanguage} to ${studyLanguage}.
2. Lightly modernize archaic or tangled wording when it would make the sentence hard for a fluent modern reader to understand.
3. Preserve literary style, voice, imagery, humor, menace, formality, and character-specific language. Keep archaic words or phrasing when they are clearly part of a character's voice, period flavor, ritual speech, poetry, or deliberate style.
4. Write the ${studyLanguage} sentence to the output.
5. The output must be in ${studyLanguage}, not ${bookLanguage}, unless those are the same language.
6. IMPORTANT: Please be sure to end the sentence with a NEWLINE.

Note:
- Please do not add comments and do not produce any output other than the ${studyLanguage} sentence.
- Do not summarize, simplify for children, explain, or add your own thoughts or events.

Input:
${sourceText}`;
};

export default getSimplificationPrompt;
