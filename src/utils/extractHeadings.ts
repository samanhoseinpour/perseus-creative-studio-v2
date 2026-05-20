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

export type Faq = { question: string; answer: string };

// An H2 that starts with one of these phrases marks an FAQ section.
// Word-boundary instead of `$` so titles like
// "Frequently Asked Questions About Real Estate Media" still qualify.
// The bare "questions" alternative is intentionally omitted — it false-
// positives on content H2s like "Questions to Ask Before Booking".
const FAQ_HEADING_RE =
  /^(faqs?|frequently asked questions?|common questions?)\b/i;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}

function stripBlockMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')           // fenced code
    .replace(/`([^`]+)`/g, '$1')              // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')     // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links → label
    .replace(/\*\*(.+?)\*\*/g, '$1')          // bold
    .replace(/\*(.+?)\*/g, '$1')              // italic
    .replace(/<[^>]+>/g, '')                  // JSX/HTML tags
    .replace(/^>\s?/gm, '')                   // blockquote markers
    .replace(/^[-*+]\s+/gm, '')               // list bullets
    .replace(/\n{3,}/g, '\n\n')               // collapse blank lines
    .trim();
}

// Looks for an H2 whose title matches FAQ_HEADING_RE and treats every H3
// inside that section as a question, with the lines until the next H3/H2
// (or EOF) as its answer. Returns [] if no FAQ section is found.
export function extractFaqs(mdxContent: string): Faq[] {
  const lines = mdxContent.split('\n');
  let inFaqSection = false;
  let inCodeFence = false;
  let currentQuestion: string | null = null;
  let currentAnswerLines: string[] = [];
  const faqs: Faq[] = [];

  const flush = () => {
    if (currentQuestion !== null) {
      const answer = stripBlockMarkdown(currentAnswerLines.join('\n'));
      if (answer) faqs.push({ question: currentQuestion, answer });
      currentQuestion = null;
      currentAnswerLines = [];
    }
  };

  for (const line of lines) {
    if (/^```/.test(line)) {
      inCodeFence = !inCodeFence;
      if (inFaqSection && currentQuestion !== null)
        currentAnswerLines.push(line);
      continue;
    }
    if (inCodeFence) {
      if (inFaqSection && currentQuestion !== null)
        currentAnswerLines.push(line);
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flush();
      inFaqSection = FAQ_HEADING_RE.test(stripInlineMarkdown(h2[1]));
      continue;
    }

    if (!inFaqSection) continue;

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flush();
      currentQuestion = stripInlineMarkdown(h3[1]);
      continue;
    }

    if (currentQuestion !== null) currentAnswerLines.push(line);
  }
  flush();
  return faqs;
}
