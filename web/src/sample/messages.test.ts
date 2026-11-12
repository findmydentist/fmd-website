import assert from "node:assert/strict";
import { test } from "node:test";
import { openThread, send, threads } from "./messages.ts";

test("demo chats: newest first, read on open, one canned reply", async () => {
  const u = "u-msg";
  const list = await threads(u);
  assert.equal(list[0].id, "aditi-sharma");
  assert.equal(list[0].unread, true);
  await openThread(u, "aditi-sharma");
  assert.equal((await threads(u))[0].unread, false);

  await assert.rejects(send(u, "farah-khan", "   "), /Write a message/);
  const t = await send(u, "farah-khan", "Hello", Date.now() + 1000);
  assert.deepEqual(t.messages.slice(-2).map((m) => m.from), ["me", "them"]);
  assert.equal((await threads(u))[0].id, "farah-khan");
  const again = await send(u, "farah-khan", "Thanks", Date.now() + 5000);
  assert.equal(again.messages.at(-1)?.from, "me"); // no second canned reply
});
