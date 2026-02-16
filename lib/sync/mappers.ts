/**
 * ADO → Prisma field mappings for work items (Story 3).
 *
 * - Type mapping from ADO display names to Prisma WorkItemType enum
 * - Approved-type filter (Feature, User Story, Bug, Spike, Support)
 * - Full field extraction from raw ADO work item response
 */

import type { WorkItemType } from '@prisma/client';

/** Map of accepted ADO work item type display names to Prisma enum values. */
const ADO_TYPE_MAP: Record<string, WorkItemType> = {
  Feature: 'Feature',
  'User Story': 'UserStory',
  Bug: 'Bug',
  Spike: 'Spike',
  Support: 'Support',
};

/** ADO work item type strings that are approved for sync. */
export const APPROVED_TYPES = Object.keys(ADO_TYPE_MAP);

/**
 * Map an ADO work item type string to the Prisma WorkItemType enum.
 * Returns undefined if the type is not approved for sync.
 */
export function mapAdoWorkItemType(adoType: string): WorkItemType | undefined {
  return ADO_TYPE_MAP[adoType];
}

/**
 * Check if an ADO work item type is approved for sync.
 */
export function isApprovedType(adoType: string): boolean {
  return adoType in ADO_TYPE_MAP;
}

/** Raw ADO work item fields from the REST API response. */
export interface AdoWorkItemFields {
  'System.Id'?: number;
  'System.Rev'?: number;
  'System.WorkItemType'?: string;
  'System.Title'?: string;
  'System.State'?: string;
  'Microsoft.VSTS.Scheduling.StoryPoints'?: number;
  'Microsoft.VSTS.Scheduling.OriginalEstimate'?: number;
  'Microsoft.VSTS.Scheduling.CompletedWork'?: number;
  'Microsoft.VSTS.Scheduling.RemainingWork'?: number;
  'System.AreaPath'?: string;
  'System.IterationPath'?: string;
  'System.Parent'?: number;
  'System.AssignedTo'?: string | { displayName?: string; uniqueName?: string };
  'System.Tags'?: string;
  'System.CreatedDate'?: string;
  'System.ChangedDate'?: string;
}

/** Raw ADO work item object from the batch API response. */
export interface AdoWorkItemRaw {
  id: number;
  rev: number;
  fields: AdoWorkItemFields;
}

/** Mapped work item ready for Prisma upsert. */
export interface MappedWorkItem {
  adoId: number;
  adoRevision: number;
  type: WorkItemType;
  title: string;
  state: string;
  storyPoints: number | null;
  originalEstimate: number | null;
  completedWork: number | null;
  remainingWork: number | null;
  areaPath: string;
  iterationPath: string;
  parentAdoId: number | null;
  assignedTo: string | null;
  tags: string | null;
  adoCreatedDate: Date | null;
  adoChangedDate: Date | null;
}

/**
 * Extract the display name from an ADO AssignedTo field.
 * The field can be a plain string or an identity object with displayName/uniqueName.
 */
function extractAssignedTo(
  raw: string | { displayName?: string; uniqueName?: string } | undefined | null
): string | null {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string') {
    return raw || null;
  }
  if (typeof raw === 'object') {
    return raw.displayName || raw.uniqueName || null;
  }
  return null;
}

/**
 * Map raw ADO work item fields to a MappedWorkItem.
 * Returns null if the work item type is not approved or required fields are missing.
 */
export function mapAdoWorkItem(fields: AdoWorkItemFields): MappedWorkItem | null {
  const adoType = fields['System.WorkItemType'];
  if (!adoType) {
    return null;
  }

  const type = mapAdoWorkItemType(adoType);
  if (!type) {
    return null;
  }

  const adoId = fields['System.Id'];
  const title = fields['System.Title'];
  if (adoId == null || !title) {
    return null;
  }

  return {
    adoId,
    adoRevision: fields['System.Rev'] ?? 0,
    type,
    title,
    state: fields['System.State'] ?? 'Unknown',
    storyPoints: fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? null,
    originalEstimate: fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] ?? null,
    completedWork: fields['Microsoft.VSTS.Scheduling.CompletedWork'] ?? null,
    remainingWork: fields['Microsoft.VSTS.Scheduling.RemainingWork'] ?? null,
    areaPath: fields['System.AreaPath'] ?? '',
    iterationPath: fields['System.IterationPath'] ?? '',
    parentAdoId: fields['System.Parent'] ?? null,
    assignedTo: extractAssignedTo(fields['System.AssignedTo']),
    tags: fields['System.Tags'] || null,
    adoCreatedDate: fields['System.CreatedDate'] ? new Date(fields['System.CreatedDate']) : null,
    adoChangedDate: fields['System.ChangedDate'] ? new Date(fields['System.ChangedDate']) : null,
  };
}
