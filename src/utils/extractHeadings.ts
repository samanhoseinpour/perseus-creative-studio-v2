export type Heading = { id: string; text: string; level: number };

export function countWords(mdxContent: string): number {
  return mdxContent
    .replace(/```[\s\S]*?```/g, '')       // strip fenced code blocks
    .replace(/`[^`]+`/g, '')              // strip inline code
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → label text only
    .replace(/^#{1,6}\s/gm, '')           // strip heading markers
    .replace(/[*_~>|#]/g, '')             // strip markdown symbols
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function readingTimeIso(wordCount: number): string {
  return `PT${readingMinutes(wordCount)}M`;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function extractHeadings(mdxContent: string): Heading[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const headings: Heading[] = [];
  let match;
  while ((match = headingRegex.exec(mdxContent)) !== null) {
    const level = match[1].length;
    const rawText = match[2]
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .trim();
    headings.push({ id: slugifyHeading(rawText), text: rawText, level });
  }
  return headings;
}
