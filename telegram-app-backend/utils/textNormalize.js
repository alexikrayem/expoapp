// utils/textNormalize.js
// Shared normalization helper for product linking and similarity.

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // Arabic diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // replace punctuation/symbols with spaces
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = {
  normalizeText,
};
