const font = {
  widthOfTextAtSize: (text, size) => text.length * size
};

function splitLongWord(word, font, size, maxWidth) {
  const chunks = [];
  let current = '';
  for (const char of word) {
    const candidate = `${current}${char}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      chunks.push(current);
      current = char;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
    } else {
      const chunks = splitLongWord(word, font, size, maxWidth);
      lines.push(...chunks.slice(0, -1));
      current = chunks.at(-1) ?? '';
    }
  }

  if (current) lines.push(current);
  return lines;
}

console.log(wrapText('Hello World', font, 10, 100));
console.log(wrapText('HelloWorld! Hello', font, 10, 100));
console.log(wrapText('Supercalifragilisticexpialidocious', font, 10, 100));
