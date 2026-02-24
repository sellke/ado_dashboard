import { SyncControl } from './SyncControl';

export default {
  title: 'Dashboard/SyncControl',
  component: SyncControl,
};

const noop = () => {};

export const Idle = () => (
  <SyncControl onSync={noop} syncInProgress={false} syncError={null} syncPartialSuccess={false} />
);

export const SyncInProgress = () => (
  <SyncControl onSync={noop} syncInProgress syncError={null} syncPartialSuccess={false} />
);

export const SyncFailure = () => (
  <SyncControl
    onSync={noop}
    syncInProgress={false}
    syncError="ADO connection failed. Check your credentials and try again."
    syncPartialSuccess={false}
    onDismissError={noop}
  />
);

export const PartialSuccess = () => (
  <SyncControl onSync={noop} syncInProgress={false} syncError={null} syncPartialSuccess />
);
