import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";
import { countWords, slugify } from "../../lib/format";
import type { QueueRecord } from "../../types";

interface BlogPreviewProps {
  record: QueueRecord;
}

export default function BlogPreview({ record }: BlogPreviewProps) {
  const html = useMemo(() => {
    if (!record.content) {
      return '<p class="cite">No draft content on this record.</p>';
    }
    const raw = marked.parse(record.content, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [record.content]);

  const words = useMemo(() => countWords(record.content), [record.content]);

  return (
    <>
      <div className="blog">
        <div className="blog-chrome">
          <i />
          <i />
          <i />
          <span className="blog-url">blog/{slugify(record.title)}/</span>
        </div>
        <div
          className="blog-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <div className="wc">word_count: {words}</div>
    </>
  );
}
