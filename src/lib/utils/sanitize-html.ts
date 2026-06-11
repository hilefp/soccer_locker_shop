import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize rich-text HTML (e.g. package descriptions authored in the inventory
 * admin) before rendering it with `dangerouslySetInnerHTML`. Allows only the
 * formatting tags/attributes the admin RichTextEditor produces.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "span",
      "br",
      "p",
      "ul",
      "ol",
      "li",
      "div",
    ],
    ALLOWED_ATTR: ["style"],
  });
}
