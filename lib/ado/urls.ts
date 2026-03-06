/**
 * ADO (Azure DevOps) URL construction utilities.
 * Shared across sprint stories, overhead items, and any feature referencing ADO work items.
 */

const ADO_BASE_URL =
  'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform';

export function buildAdoWorkItemUrl(adoId: number): string {
  return `${ADO_BASE_URL}/_workitems/edit/${adoId}`;
}
