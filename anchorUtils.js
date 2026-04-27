const FRONT_MATTER_ANCHORS = new Set([
  'preface',
  'introduction',
  'intro',
  'toc',
  'contents',
  'table-of-contents',
  'title',
  'heading',
  'header'
]);

const EXACT_READING_ANCHORS = [
  'chapter01', 'chapter1', 'chapter-1', 'chapter_i', 'chapteri',
  'chap01', 'chap1', 'chap-1', 'chap_i', 'chapi',
  'book01', 'book1', 'book-1', 'book_i', 'booki',
  'part01', 'part1', 'part-1', 'part_i', 'parti'
];

const ANY_ANCHOR_REGEX = /<(?:a|[a-z0-9]+)\b[^>]*\b(?:id|name)=["']([^"']+)["'][^>]*>/gi;
const HEADING_ANCHOR_REGEX = /<h[1-6][^>]*>\s*<a[^>]*\b(?:id|name)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h[1-6]>/gi;

const normalizeAnchor = (anchor) => (anchor || '').trim().toLowerCase();

export const isFrontMatterAnchor = (anchor) => FRONT_MATTER_ANCHORS.has(normalizeAnchor(anchor));

const stripTags = (text) => text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const findMatchingAnchor = (htmlContent, predicate) => {
  ANY_ANCHOR_REGEX.lastIndex = 0;
  let match;

  while ((match = ANY_ANCHOR_REGEX.exec(htmlContent)) !== null) {
    const anchorValue = match[1];
    if (predicate(anchorValue)) {
      return anchorValue;
    }
  }

  return null;
};

const findMatchingHeadingAnchor = (htmlContent, predicate) => {
  HEADING_ANCHOR_REGEX.lastIndex = 0;
  let match;

  while ((match = HEADING_ANCHOR_REGEX.exec(htmlContent)) !== null) {
    const anchorValue = match[1];
    const headingText = stripTags(match[2]);

    if (predicate(anchorValue, headingText)) {
      return anchorValue;
    }
  }

  return null;
};

const isChapterLikeAnchor = (anchorValue) => {
  const normalized = normalizeAnchor(anchorValue);
  return (
    EXACT_READING_ANCHORS.includes(normalized) ||
    /^(?:chapter|chap|book|part)[-_]?(?:0*1|i)$/i.test(anchorValue) ||
    /^i$/i.test(anchorValue)
  );
};

const isChapterLikeHeading = (headingText) => {
  const normalized = stripTags(headingText).toUpperCase();
  return /^(?:CHAPTER|CHAPITRE|BOOK|PART)\s*(?:1|I)\b/.test(normalized) || normalized === 'I';
};

export const findBestAnchor = (htmlContent) => {
  if (!htmlContent) {
    return null;
  }

  for (const anchor of EXACT_READING_ANCHORS) {
    const exactAnchor = findMatchingAnchor(
      htmlContent,
      (anchorValue) => normalizeAnchor(anchorValue) === anchor
    );

    if (exactAnchor) {
      return exactAnchor;
    }
  }

  const headingAnchor = findMatchingHeadingAnchor(
    htmlContent,
    (anchorValue, headingText) =>
      isChapterLikeAnchor(anchorValue) || isChapterLikeHeading(headingText)
  );

  if (headingAnchor) {
    return headingAnchor;
  }

  const genericChapterAnchor = findMatchingAnchor(
    htmlContent,
    (anchorValue) =>
      !isFrontMatterAnchor(anchorValue) &&
      /^(?:chapter|chap|book|part)/i.test(anchorValue)
  );

  if (genericChapterAnchor) {
    return genericChapterAnchor;
  }

  const frontMatterAnchor = findMatchingAnchor(
    htmlContent,
    (anchorValue) => isFrontMatterAnchor(anchorValue)
  );

  if (frontMatterAnchor) {
    return frontMatterAnchor;
  }

  return findMatchingAnchor(htmlContent, () => true);
};

export const resolvePreferredAnchor = (htmlContent, currentAnchor) => {
  if (!isFrontMatterAnchor(currentAnchor)) {
    return currentAnchor;
  }

  const preferredAnchor = findBestAnchor(htmlContent);
  if (preferredAnchor && !isFrontMatterAnchor(preferredAnchor)) {
    return preferredAnchor;
  }

  return currentAnchor;
};
