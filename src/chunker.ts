// chunker.ts
export interface Chunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    heading: string;
    breadcrumb: string;
  };
}

// Remove HTML comments, which Node docs use for metadata
function cleanMarkdown(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '').trim();
}

// Operates on A SINGLE FILE, divides its content by chunks and returns an array with all of them
export function chunkMarkdown(text: string, source: string): Chunk[] {
  const lines = cleanMarkdown(text).split('\n');
  const chunks: Chunk[] = [];

  let currentHeading = 'Introduction';
  // We keep a stack of headings to build breadcrumbs (e.g. fs > readFile)
  let breadcrumbs: string[] = [currentHeading];
  let currentContent: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // Don't split inside code blocks
    if (line.trim().startsWith('```')) {
      // Can activate (entering block) or deactivate (exiting block)
      inCodeBlock = !inCodeBlock;
    }

    // Detect headings (only if not in code block)
    // This variable is an array with 3 capture groups
    const headingMatch = !inCodeBlock && line.match(/^(#{1,6})\s+(.*)/);

    if (headingMatch) {

      // 1. Save the previous section as a chunk
      if (currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        // Skip empty or very short sections
        if (content.length > 50) {
          chunks.push({
            id: `${source}-${chunks.length}`,
            // Inject breadcrumbs into content, for better embedding
            content: `${breadcrumbs.join(' > ')}\n\n${content}`,
            metadata: {
              source,
              heading: currentHeading,
              breadcrumb: breadcrumbs.join(' > '),
            },
          });
        }
      }

      // 2. Update state for new section
      // Index 0 is the complete line of the heading
      const level = (headingMatch[1] as string).length;
      const title = (headingMatch[2] as string).trim();

      currentHeading = title;

      // Update breadcrumb stack based on heading level
      if (level === 1) {
        breadcrumbs = [title];
      } else {
        // Truncate stack to current level and add new title
        breadcrumbs = breadcrumbs.slice(0, level - 1);
        breadcrumbs.push(title);
      }

      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Add the final chunk
  if (currentContent.length > 0) {
    chunks.push({
      id: `${source}-${chunks.length}`,
      content: `${breadcrumbs.join(' > ')}\n\n${currentContent.join('\n').trim()}`,
      metadata: { source, heading: currentHeading, breadcrumb: breadcrumbs.join(' > ') },
    });
  }

  return chunks;
}