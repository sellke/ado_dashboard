import { Box } from '@mantine/core';
import { RagBadge } from './RagBadge';

export default {
  title: 'Dashboard/RagBadge',
  component: RagBadge,
};

export const Green = () => <RagBadge rag="Green" />;

export const Amber = () => <RagBadge rag="Amber" />;

export const Red = () => <RagBadge rag="Red" />;

export const Null = () => (
  <Box p="md" style={{ border: '1px dashed var(--mantine-color-gray-4)' }}>
    <RagBadge rag={null} />
    <span style={{ marginLeft: 8, color: 'var(--mantine-color-dimmed)' }}>
      (RagBadge renders nothing when rag is null)
    </span>
  </Box>
);
