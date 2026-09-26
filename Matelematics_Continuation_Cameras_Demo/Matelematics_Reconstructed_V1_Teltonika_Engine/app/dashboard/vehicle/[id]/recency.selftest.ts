import assert from "node:assert/strict";
import { isRecent, TRACKER_FRESHNESS_MS } from "./recency";

const now = Date.parse("2026-09-26T22:28:00Z");
assert.equal(isRecent("2026-09-11T15:22:18Z", now), false);
assert.equal(isRecent(new Date(now - TRACKER_FRESHNESS_MS).toISOString(), now), true);
assert.equal(isRecent(new Date(now - TRACKER_FRESHNESS_MS - 1).toISOString(), now), false);
assert.equal(isRecent(new Date(now + 1).toISOString(), now), false);
assert.equal(isRecent(null, now), false);
assert.equal(isRecent("incorrect", now), false);

console.log("PASS: état de connexion et fraîcheur GPS");
