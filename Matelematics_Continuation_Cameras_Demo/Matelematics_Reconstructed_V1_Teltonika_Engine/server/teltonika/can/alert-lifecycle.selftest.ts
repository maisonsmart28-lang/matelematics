import assert from "node:assert/strict";

import {
  decideAlertLifecycle,
  type ExistingAlertLifecycle,
} from "./alert-lifecycle";

const ACTIVE: ExistingAlertLifecycle = {
  id: "alert-active",
  status: "active",
  triggeredAt: "2026-09-11T18:00:00.000Z",
  resolvedAt: null,
};

const RESOLVED: ExistingAlertLifecycle = {
  id: "alert-resolved",
  status: "resolved",
  triggeredAt: "2026-09-11T18:00:00.000Z",
  resolvedAt: "2026-09-11T18:05:00.000Z",
};

assert.deepEqual(
  decideAlertLifecycle({
    candidateActive: true,
    recordedAt: "2026-09-11T18:00:00.000Z",
    latest: null,
  }),
  { action: "create" },
);

assert.deepEqual(
  decideAlertLifecycle({
    candidateActive: false,
    recordedAt: "2026-09-11T18:00:00.000Z",
    latest: null,
  }),
  { action: "noop" },
);

assert.deepEqual(
  decideAlertLifecycle({
    candidateActive: true,
    recordedAt: "2026-09-11T18:01:00.000Z",
    latest: ACTIVE,
  }),
  {
    action: "keep_active",
    alertId: "alert-active",
  },
);

assert.deepEqual(
  decideAlertLifecycle({
    candidateActive: false,
    recordedAt: "2026-09-11T18:01:00.000Z",
    latest: ACTIVE,
  }),
  {
    action: "resolve",
    alertId: "alert-active",
  },
);

assert.equal(
  decideAlertLifecycle({
    candidateActive: false,
    recordedAt: "2026-09-11T17:59:59.000Z",
    latest: ACTIVE,
  }).action,
  "ignore_stale",
);

assert.deepEqual(
  decideAlertLifecycle({
    candidateActive: false,
    recordedAt: "2026-09-11T18:06:00.000Z",
    latest: RESOLVED,
  }),
  { action: "noop" },
);

assert.equal(
  decideAlertLifecycle({
    candidateActive: true,
    recordedAt: "2026-09-11T18:04:59.000Z",
    latest: RESOLVED,
  }).action,
  "ignore_stale",
);

assert.equal(
  decideAlertLifecycle({
    candidateActive: true,
    recordedAt: "2026-09-11T18:05:00.000Z",
    latest: RESOLVED,
  }).action,
  "ignore_stale",
);

assert.deepEqual(
  decideAlertLifecycle({
    candidateActive: true,
    recordedAt: "2026-09-11T18:05:00.001Z",
    latest: RESOLVED,
  }),
  { action: "create" },
);

assert.equal(
  decideAlertLifecycle({
    candidateActive: true,
    recordedAt: "not-a-date",
    latest: ACTIVE,
  }).action,
  "ignore_stale",
);

console.log("Teltonika Step 6B alert lifecycle self-test PASS");
