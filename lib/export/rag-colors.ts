/**
 * RAG status → hex color mapping for pptxgenjs.
 * pptxgenjs expects hex strings without the leading '#'.
 */
export const RAG_COLORS = {
  Green: '2f9e44',
  Amber: 'e67700',
  Red: 'c92a2a',
  null: '868e96',
} as const;

type RagKey = keyof typeof RAG_COLORS;

export function ragColor(rag: string | null): string {
  if (rag === null) return RAG_COLORS.null;
  return (RAG_COLORS as Record<string, string>)[rag] ?? RAG_COLORS.null;
}
