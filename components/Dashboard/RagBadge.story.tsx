import { Box } from '@mantine/core';
import { RagBadge } from './RagBadge';

export default {
  title: 'Dashboard/RagBadge',
  component: RagBadge,
};

export const Green = () => <RagBadge rag="Green" />;

export const Amber = () => <RagBadge rag="Amber" />;

export const Red = () => <RagBadge rag="Red" />;

export const WithTooltip = () => (
  <Box p="md">
    <RagBadge rag="Amber" ragTooltip="Green 0–30%, Amber 30.01–45%, Red above 45%." />
    <span style={{ marginLeft: 8, color: 'var(--mantine-color-dimmed)' }}>
      (hover or focus the badge to see the RAG threshold explanation)
    </span>
  </Box>
);

export const VelocityTrendTooltip = () => (
  <Box p="md">
    <RagBadge
      rag="Red"
      ragTooltip="Compared to the 4-sprint rolling average: Green at or above 100%, Amber 70–99%, Red below 70%."
    />
  </Box>
);

export const Null = () => (
  <Box p="md" style={{ border: '1px dashed var(--mantine-color-gray-4)' }}>
    <RagBadge rag={null} />
    <span style={{ marginLeft: 8, color: 'var(--mantine-color-dimmed)' }}>
      (RagBadge renders nothing when rag is null)
    </span>
  </Box>
);
