#!/usr/bin/env node
// V1 helper for file-based hypothesis/evidence tracking inside workspace.
// Usage:
//   node .v1/helpers.js add-hypothesis '{"description":"...","evidence":["file:line"],"confidence":0.8,"files":["src/foo.ts"]}'
//   node .v1/helpers.js select-hypothesis <id>
//   node .v1/helpers.js add-evidence '{"type":"file_inspection","description":"...","source":"src/foo.ts","result":"supports"}'
//   node .v1/helpers.js add-file-inspected src/foo.ts
//   node .v1/helpers.js add-command '{"command":"npm test","exitCode":0,"stdout":"..."}'
//   node .v1/helpers.js add-verification '{"method":"vitest","command":"vitest run","passed":true,"output":"..."}'
//   node .v1/helpers.js status
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";

const STATE_PATH = join(process.cwd(), ".v1/state.json");

function load() {
  if (!existsSync(STATE_PATH)) {
    console.error("No .v1/state.json found at", STATE_PATH);
    process.exit(1);
  }
  const raw = readFileSync(STATE_PATH, "utf-8");
  return JSON.parse(raw);
}
function save(s) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2), "utf-8");
}

const cmd = process.argv[2];
if (!cmd || cmd === "help" || cmd === "--help") {
  console.log("Usage: node .v1/helpers.js <add-hypothesis|select-hypothesis|add-evidence|add-file-inspected|add-command|add-verification|status>");
  process.exit(0);
}
if (cmd === "status") {
  const s = load();
  console.log(JSON.stringify(s, null, 2));
  process.exit(0);
}
if (cmd === "add-hypothesis") {
  const arg = process.argv[3];
  if (!arg) { console.error("need JSON arg"); process.exit(1); }
  let payload;
  try { payload = JSON.parse(arg); } catch { payload = { description: arg, evidence: [] }; }
  const s = load();
  const h = {
    id: payload.id ?? `hyp-${randomUUID().slice(0, 8)}`,
    description: payload.description ?? "hypothesis",
    evidence: payload.evidence ?? [],
    confidence: payload.confidence ?? 0.5,
    status: payload.status ?? "active",
    files: payload.files,
  };
  s.hypotheses = s.hypotheses ?? [];
  s.hypotheses.push(h);
  // also push evidence entry for diagnosis
  s.evidence = s.evidence ?? [];
  s.evidence.push({ id: `ev-${randomUUID().slice(0, 8)}`, type: "other", description: `Hypothesis: ${h.description}`, source: h.files?.[0], result: "neutral", timestamp: new Date().toISOString(), phase: s.phase });
  save(s);
  console.log(h.id);
  process.exit(0);
}
if (cmd === "select-hypothesis") {
  const id = process.argv[3];
  if (!id) { console.error("need id"); process.exit(1); }
  const s = load();
  let found = false;
  for (const hyp of s.hypotheses) {
    if (hyp.id === id) { hyp.status = "selected"; s.selectedHypothesis = id; found = true; }
    else if (hyp.status === "selected") hyp.status = "active";
  }
  if (!found) { console.error("hypothesis not found", id); process.exit(1); }
  save(s);
  console.log("selected", id);
  process.exit(0);
}
if (cmd === "add-evidence") {
  const arg = process.argv[3];
  let payload;
  try { payload = JSON.parse(arg); } catch { payload = { description: arg }; }
  const s = load();
  s.evidence = s.evidence ?? [];
  s.evidence.push({ id: `ev-${randomUUID().slice(0, 8)}`, type: payload.type ?? "other", description: payload.description ?? arg, source: payload.source, result: payload.result ?? "neutral", timestamp: new Date().toISOString(), phase: payload.phase ?? s.phase });
  save(s);
  console.log("evidence added");
  process.exit(0);
}
if (cmd === "add-file-inspected") {
  const p = process.argv[3];
  const s = load();
  s.filesInspected = s.filesInspected ?? [];
  if (!s.filesInspected.includes(p)) s.filesInspected.push(p);
  save(s);
  console.log("file recorded", p);
  process.exit(0);
}
if (cmd === "add-command") {
  // raw json {command, exitCode, stdout, stderr, durationMs}
  const arg = process.argv.slice(3).join(" ");
  let payload;
  try { payload = JSON.parse(arg); } catch { payload = { command: arg }; }
  const s = load();
  s.commandsExecuted = s.commandsExecuted ?? [];
  s.commandsExecuted.push({ command: payload.command ?? arg, exitCode: payload.exitCode ?? null, stdout: payload.stdout ?? "", stderr: payload.stderr ?? "", durationMs: payload.durationMs ?? 0, phase: s.phase, timestamp: new Date().toISOString() });
  save(s);
  console.log("command recorded");
  process.exit(0);
}
if (cmd === "add-verification") {
  const arg = process.argv.slice(3).join(" ");
  let payload;
  try { payload = JSON.parse(arg); } catch { payload = { method: arg, output: arg }; }
  const s = load();
  s.verificationAttempts = s.verificationAttempts ?? [];
  s.verificationAttempts.push({ id: `ver-${randomUUID().slice(0, 8)}`, iteration: s.iteration, method: payload.method ?? "manual", command: payload.command, passed: payload.passed ?? null, output: payload.output ?? JSON.stringify(payload), timestamp: new Date().toISOString(), phase: s.phase });
  if (payload.passed !== undefined || payload.output) {
    s.evidence = s.evidence ?? [];
    s.evidence.push({ id: `ev-${randomUUID().slice(0, 8)}`, type: payload.type ?? "test_result", description: `Verification: ${payload.method ?? payload.command ?? "check"}`, source: payload.command, result: payload.passed ? "supports" : payload.passed === false ? "contradicts" : "neutral", timestamp: new Date().toISOString(), phase: s.phase });
  }
  save(s);
  console.log("verification recorded");
  process.exit(0);
}
console.error("unknown command", cmd);
process.exit(1);
