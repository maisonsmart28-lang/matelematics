import assert from "node:assert/strict";
import { createUserWithProfile } from "./create-user-with-profile";

async function main() {
  const calls: string[] = [];
  const id = await createUserWithProfile({
    createAuth: async () => { calls.push("auth"); return "fixture"; },
    insertProfile: async () => { calls.push("profile"); },
    deleteAuth: async () => { calls.push("delete"); },
    onRollbackFailure: () => { calls.push("alert"); },
  });
  assert.equal(id, "fixture");
  assert.deepEqual(calls, ["auth", "profile"]);

  calls.length = 0;
  const profileError = new Error("profile unavailable");
  await assert.rejects(createUserWithProfile({
    createAuth: async () => { calls.push("auth"); return "fixture"; },
    insertProfile: async () => { calls.push("profile"); throw profileError; },
    deleteAuth: async () => { calls.push("delete"); },
    onRollbackFailure: () => { calls.push("alert"); },
  }), (error) => error === profileError);
  assert.deepEqual(calls, ["auth", "profile", "delete"]);

  calls.length = 0;
  const rollbackError = new Error("Auth deletion unavailable");
  await assert.rejects(createUserWithProfile({
    createAuth: async () => { calls.push("auth"); return "fixture"; },
    insertProfile: async () => { calls.push("profile"); throw profileError; },
    deleteAuth: async () => { calls.push("delete"); throw rollbackError; },
    onRollbackFailure: (userId, error) => {
      assert.equal(userId, "fixture");
      assert.equal(error, rollbackError);
      calls.push("alert");
    },
  }), /Auth cleanup failed/);
  assert.deepEqual(calls, ["auth", "profile", "delete", "alert"]);

  calls.length = 0;
  await assert.rejects(createUserWithProfile({
    createAuth: async () => { calls.push("auth"); throw new Error("Auth unavailable"); },
    insertProfile: async () => { calls.push("profile"); },
    deleteAuth: async () => { calls.push("delete"); },
    onRollbackFailure: () => { calls.push("alert"); },
  }), /Auth unavailable/);
  assert.deepEqual(calls, ["auth"]);
  console.log("Admin Auth/profile compensation self-test PASS");
}

main().catch((error) => {
  console.error("Admin Auth/profile compensation self-test FAIL", error);
  process.exitCode = 1;
});
