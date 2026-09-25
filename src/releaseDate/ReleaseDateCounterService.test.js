import assert from "node:assert";
import test from "node:test";
import { ReleaseDateCounterService } from "./ReleaseDateCounterService.js";

test("Release date counter does not respond on inapplicable messages", () => {
  const service = new ReleaseDateCounterService();

  const result1 = service.shouldRespond("anyone", "63 years");
  const result2 = service.shouldRespond("hououlnkyouma", "aaaa 6");
  const result3 = service.shouldRespond("anyone", "youtu.be/67381376");

  assert.equal(result1, false);
  assert.equal(result2, false);
  assert.equal(result3, false);
});

test("Release date counter responds on applicable messages", () => {
  const service = new ReleaseDateCounterService();

  const result1 = service.shouldRespond("anyone", "dwadwa 6");
  const result2 = service.shouldRespond("anyone", "6 6 6 6 6 6");
  const result3 = service.shouldRespond("anyone", "6");

  assert.equal(result1, true);
  assert.equal(result2, true);
  assert.equal(result3, true);
});

test("Release date counter gives an accurate time left", () => {
  const releaseDate = new Date("November 19, 2026");
  const now = new Date("November 10, 2026");

  const service = new ReleaseDateCounterService(
    null,
    null,
    () => releaseDate,
    () => now,
    () => 0.06,
  );

  const result1 = service.formatChatMessage();

  assert.equal(result1.endsWith("1w 2d"), true);
});

test("Release date counter gives a rare link", () => {
  const releaseDate = new Date("November 19, 2026");
  const now = new Date("November 10, 2026");

  const service = new ReleaseDateCounterService(
    null,
    null,
    () => releaseDate,
    () => now,
    () => 0.02,
  );

  const result1 = service.formatChatMessage();

  assert.equal(result1.endsWith("rare link"), true);
});
