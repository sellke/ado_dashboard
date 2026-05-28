/**
 * RAG status → hex for pptxgenjs native shapes. Values follow MDT semantic colors in
 * `.cursor/skills/mdt_slides.md`. pptxgenjs expects hex **without** `#`.
 */
import { MDT_COLORS } from './mdt-theme';

export const RAG_COLORS = {
  Green: '2E7D4F',
  Amber: 'D19E00',
  Red: 'B3261E',
  null: MDT_COLORS.bodyMuted,
} as const;

type RagKey = keyof typeof RAG_COLORS;

export function ragColor(rag: string | null): string {
  if (rag === null) return RAG_COLORS.null;
  return (RAG_COLORS as Record<string, string>)[rag] ?? RAG_COLORS.null;
}
