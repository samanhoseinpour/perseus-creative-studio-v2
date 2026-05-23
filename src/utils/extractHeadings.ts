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

// Dedupe slugs in document order: the first occurrence keeps the bare slug,
// repeats get `-2`, `-3`, … This mirrors the resolver used to stamp DOM
// heading ids on the post page, so a post with two headings of the same text
// (e.g. a body section and a matching FAQ question) yields unique, matching
// anchors instead of colliding ids. Create one counter per pass.
export function makeSlugDeduper(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

export function extractHeadings(mdxContent: string): Heading[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const headings: Heading[] = [];
  const dedupe = makeSlugDeduper();
  let match;
  while ((match = headingRegex.exec(mdxContent)) !== null) {
    const level = match[1].length;
    const rawText = match[2]
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .trim();
    headings.push({ id: dedupe(rawText), text: rawText, level });
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

export type EmbeddedVideo = {
  id: string;
  title?: string;
  description?: string;
  uploadDate?: string;
  // True when the author marked the embed with the `external` flag —
  // signals the video is on someone else's channel, so the page-level
  // JSON-LD should skip emitting a VideoObject for it.
  external?: boolean;
};

const YOUTUBE_TAG_RE = /<YouTube\b([^/>]*)\/>/g;
const JSX_ATTR_RE = /(\w+)\s*=\s*"([^"]*)"/g;
// Bare boolean JSX attributes (`<YouTube ... external />`). Matches a word
// that is NOT followed by `=` — distinguishes `external` from `id="..."`.
const JSX_BOOL_ATTR_RE = /(?:^|\s)(\w+)(?=\s|\/?>|$)(?!\s*=)/g;
const HEADING_RE_GM = /^#{2,4}\s+(.+)$/gm;

// Finds every `<YouTube id="..." />` embed in the MDX. Authors can pass
// `title` / `description` / `uploadDate` props to enrich the resulting
// VideoObject; otherwise the nearest preceding H2/H3/H4 is used as the
// video name and `uploadDate` falls back to the article's publish date
// at the JSON-LD layer. Deduplicated by video id — multiple embeds of
// the same clip collapse into one VideoObject node.
export function extractVideos(mdxContent: string): EmbeddedVideo[] {
  const headings: { pos: number; text: string }[] = [];
  let hm: RegExpExecArray | null;
  HEADING_RE_GM.lastIndex = 0;
  while ((hm = HEADING_RE_GM.exec(mdxContent)) !== null) {
    headings.push({ pos: hm.index, text: stripInlineMarkdown(hm[1]) });
  }

  const seen = new Set<string>();
  const videos: EmbeddedVideo[] = [];

  YOUTUBE_TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = YOUTUBE_TAG_RE.exec(mdxContent)) !== null) {
    const attrs: Record<string, string> = {};
    JSX_ATTR_RE.lastIndex = 0;
    let am: RegExpExecArray | null;
    while ((am = JSX_ATTR_RE.exec(m[1])) !== null) attrs[am[1]] = am[2];

    // Detect bare boolean attributes (e.g. `external` with no `=value`).
    // Skip ones that already captured as key="value" above.
    const boolAttrs = new Set<string>();
    JSX_BOOL_ATTR_RE.lastIndex = 0;
    let bm: RegExpExecArray | null;
    while ((bm = JSX_BOOL_ATTR_RE.exec(m[1])) !== null) {
      if (!(bm[1] in attrs)) boolAttrs.add(bm[1]);
    }

    const id = attrs.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    let nearestHeading: string | undefined;
    for (const h of headings) {
      if (h.pos < m.index) nearestHeading = h.text;
      else break;
    }

    videos.push({
      id,
      title: attrs.title ?? nearestHeading,
      description: attrs.description,
      uploadDate: attrs.uploadDate,
      external:
        boolAttrs.has('external') || attrs.external === 'true' || undefined,
    });
  }

  return videos;
}

export type EmbeddedImage = {
  src: string;
  alt?: string;
  caption?: string;
  credit?: string;
  width?: number;
  height?: number;
};

// `[\s\S]*?` instead of `[^/>]*` so attribute values can contain `/`
// (e.g. `src="/path/to/file.webp"`). Non-greedy stops at the first `/>`.
const IMAGE_TAG_RE = /<Image\b([\s\S]*?)\/>/g;
// Captures both `key="string"` and `key={expr}` JSX attribute forms.
const JSX_ATTR_ANY_RE = /(\w+)\s*=\s*(?:"([^"]*)"|\{([^}]*)\})/g;

// Finds `<Image ... />` JSX in MDX and returns the showcase ones — entries
// that carry `caption` or `credit`. These are the deliberate editorial
// photos worth attributing in JSON-LD; plain inline markdown images stay
// markup-free so we don't dilute the graph with filler.
export function extractImages(mdxContent: string): EmbeddedImage[] {
  const images: EmbeddedImage[] = [];

  IMAGE_TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMAGE_TAG_RE.exec(mdxContent)) !== null) {
    const attrs: Record<string, string> = {};
    JSX_ATTR_ANY_RE.lastIndex = 0;
    let am: RegExpExecArray | null;
    while ((am = JSX_ATTR_ANY_RE.exec(m[1])) !== null) {
      const value = am[2] !== undefined ? am[2] : (am[3] ?? '').trim();
      attrs[am[1]] = value;
    }

    const src = attrs.src;
    if (!src) continue;
    if (!attrs.caption && !attrs.credit) continue;

    const w = Number(attrs.width);
    const h = Number(attrs.height);

    images.push({
      src,
      alt: attrs.alt,
      caption: attrs.caption,
      credit: attrs.credit,
      width: Number.isFinite(w) && w > 0 ? w : undefined,
      height: Number.isFinite(h) && h > 0 ? h : undefined,
    });
  }

  return images;
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
