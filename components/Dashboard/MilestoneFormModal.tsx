'use client';

import { useEffect, useState } from 'react';
import { Button, Modal, NumberInput, Select, Stack, Textarea, TextInput } from '@mantine/core';
import type { ApiMilestone } from '@/lib/milestones/types';

const STATUS_OPTIONS = [
  { value: 'NotStarted', label: 'Not Started' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Done', label: 'Done' },
];

export interface WorkstreamOption {
  id: string;
  name: string;
}

export interface MilestoneFormModalProps {
  opened: boolean;
  onClose: () => void;
  workstreams: WorkstreamOption[];
  editing?: ApiMilestone | null;
  onSubmit: (data: {
    title: string;
    workstreamId: string;
    targetMonth: string;
    status: string;
    adoFeatureId?: number | null;
    notes?: string | null;
  }) => Promise<void>;
}

function toInputDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function MilestoneFormModal({
  opened,
  onClose,
  workstreams,
  editing = null,
  onSubmit,
}: MilestoneFormModalProps) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [workstreamId, setWorkstreamId] = useState(editing?.workstreamId ?? '');
  const [targetMonth, setTargetMonth] = useState(editing ? toInputDate(editing.targetMonth) : '');
  const [status, setStatus] = useState(editing?.status ?? 'NotStarted');
  const [adoFeatureId, setAdoFeatureId] = useState<number | ''>(editing?.adoFeatureId ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (opened) {
      if (editing) {
        setTitle(editing.title);
        setWorkstreamId(editing.workstreamId);
        setTargetMonth(toInputDate(editing.targetMonth));
        setStatus(editing.status);
        setAdoFeatureId(editing.adoFeatureId ?? '');
        setNotes(editing.notes ?? '');
      } else {
        setTitle('');
        setWorkstreamId('');
        setTargetMonth('');
        setStatus('NotStarted');
        setAdoFeatureId('');
        setNotes('');
      }
    }
  }, [opened, editing]);

  const reset = () => {
    if (editing) {
      setTitle(editing.title);
      setWorkstreamId(editing.workstreamId);
      setTargetMonth(toInputDate(editing.targetMonth));
      setStatus(editing.status);
      setAdoFeatureId(editing.adoFeatureId ?? '');
      setNotes(editing.notes ?? '');
    } else {
      setTitle('');
      setWorkstreamId('');
      setTargetMonth('');
      setStatus('NotStarted');
      setAdoFeatureId('');
      setNotes('');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !workstreamId || !targetMonth) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        workstreamId,
        targetMonth: `${targetMonth}-01T00:00:00.000Z`,
        status,
        adoFeatureId: adoFeatureId === '' ? null : adoFeatureId,
        notes: notes.trim() || null,
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const selectData = workstreams.map((w) => ({ value: w.id, label: w.name }));

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={editing ? 'Edit Milestone' : 'Add Milestone'}
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="Title"
          placeholder="Milestone title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
        />
        <Select
          label="Workstream"
          data={selectData}
          value={workstreamId}
          onChange={(v) => setWorkstreamId(v ?? '')}
          placeholder="Select workstream"
          required
        />
        <TextInput
          label="Target Month"
          type="month"
          placeholder="YYYY-MM"
          value={targetMonth}
          onChange={(e) => setTargetMonth(e.currentTarget.value)}
          required
        />
        <Select
          label="Status"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(v) => setStatus(v ?? 'NotStarted')}
        />
        <NumberInput
          label="ADO Feature ID"
          placeholder="Optional"
          value={adoFeatureId}
          onChange={(v) => setAdoFeatureId(v === '' ? '' : Number(v))}
          min={1}
        />
        <Textarea
          label="Notes"
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          rows={2}
        />
        <Button
          onClick={handleSubmit}
          loading={submitting}
          disabled={!title.trim() || !workstreamId || !targetMonth}
        >
          {editing ? 'Save' : 'Add'}
        </Button>
      </Stack>
    </Modal>
  );
}
