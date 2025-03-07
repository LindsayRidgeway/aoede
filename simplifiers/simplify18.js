// simplify18.js - Prompt for 18-year-old reading level (original text)

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 18) => {
  return `Here are some consecutive sentences from a book:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language. Do NOT simplify them - this is for an adult native speaker of ${targetLanguage}.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Preserve the narrative flow exactly as it appears in the original
3. Retain the author's style, voice, and literary devices
4. Keep the same sentence structure and complexity as the original when possible
5. Preserve all information from the original text
6. Maintain the same tone and emotional impact as the original

Guidelines for translation:
1. Provide a faithful translation that retains the literary quality of the original
2. For idioms or cultural references, use equivalent expressions in ${targetLanguage} that capture the same meaning
3. Preserve metaphors, similes, and other figurative language
4. Only adapt elements that are necessary for linguistic or cultural understanding

Please aim to create about 25-30 translated sentences total from these original sentences.

VERY IMPORTANT: Format your response by listing ONLY ONE translated sentence per line. Each sentence must end with a period, question mark, or exclamation point. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;