#!/usr/bin/env node
// Seedsong AI logger: a Claude Code hook that records every prompt and every
// agent response in ai-logs/, as the Hub's Quest rules require.
//
//   node .claude/hooks/ai-log.mjs prompt         (UserPromptSubmit)
//   node .claude/hooks/ai-log.mjs stop           (Stop)
//   node .claude/hooks/ai-log.mjs subagent-stop  (SubagentStop)
//   node .claude/hooks/ai-log.mjs session-end    (SessionEnd)
//
// Rules: never write to stdout (UserPromptSubmit stdout would be injected into
// Claude's context), never throw, always exit 0 so logging can never block work.
// Problems are appended to ai-logs/.hook-errors.log instead.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MODE = process.argv[2] || 'unknown';
let LOG_DIR = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), 'ai-logs');

main()
  .catch((err) => recordError(err))
  .finally(() => process.exit(0));

async function main() {
  const raw = await readStdin(8000);
  let input = {};
  try {
    input = raw ? JSON.parse(raw) : {};
  } catch (err) {
    recordError(new Error(`bad hook JSON (${MODE}): ${String(err)}`));
  }

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  LOG_DIR = path.join(root, 'ai-logs');
  fs.mkdirSync(path.join(LOG_DIR, 'transcripts'), { recursive: true });

  const sid = String(input.session_id || 'unknown-session');
  const now = new Date();

  if (MODE === 'prompt') return onPrompt(input, sid, now);
  if (MODE === 'stop') return onStop(input, sid, now, root);
  if (MODE === 'subagent-stop') return onSubagentStop(input, sid, now);
  if (MODE === 'session-end') return onSessionEnd(input, sid, now);
  recordError(new Error(`unknown mode: ${MODE}`));
}

// ---------- events ----------

function onPrompt(input, sid, now) {
  let prompt = typeof input.prompt === 'string' ? input.prompt : '';
  if (!prompt) {
    recordError(new Error('UserPromptSubmit input had no "prompt" text; logged a placeholder. The raw transcript still has it.'));
    prompt = '(prompt text unavailable to the hook; see transcripts/ for the exact text)';
  }
  const n = withState((state) => {
    state.counter = (state.counter || 0) + 1;
    state.sessions = state.sessions || {};
    const s = (state.sessions[sid] = state.sessions[sid] || { firstSeen: now.toISOString(), prompts: 0 });
    s.prompts += 1;
    s.lastPrompt = state.counter;
    s.lastPromptAt = now.toISOString();
    return state.counter;
  });

  const meta = [`session \`${sid.slice(0, 8)}\``];
  if (input.permission_mode) meta.push(`mode: ${input.permission_mode}`);
  if (input.effort) meta.push(`effort: ${typeof input.effort === 'string' ? input.effort : JSON.stringify(input.effort)}`);
  if (prompt.trim().startsWith('/')) meta.push('slash command');

  const fence = fenceFor(prompt);
  appendMarkdown(
    [
      '',
      '---',
      '',
      `## Prompt ${n} · ${localStamp(now)}`,
      '',
      meta.join(' · '),
      '',
      `${fence}text`,
      prompt,
      fence,
      '',
    ].join('\n'),
  );
  appendJsonl({ type: 'prompt', n, at: now.toISOString(), session_id: sid, permission_mode: input.permission_mode, effort: input.effort, prompt });
}

function onStop(input, sid, now, root) {
  const state = readState();
  const session = (state.sessions || {})[sid] || {};
  const n = session.lastPrompt ?? '?';
  const startedAt = session.lastPromptAt ? new Date(session.lastPromptAt) : null;
  const elapsed = startedAt ? formatDuration(now - startedAt) : '';

  const transcriptPath = expandHome(input.transcript_path);
  const turn = summarizeTurn(transcriptPath, root);
  let message = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : '';
  if (!message && turn.text.length) message = turn.text.join('\n\n');
  if (!message) message = '(no text response; see the transcript for tool activity)';

  const lines = ['', `### Response to prompt ${n} · ${localStamp(now)}${elapsed ? ` · took ${elapsed}` : ''}`, '', blockquote(message), ''];
  if (turn.files.size) lines.push(`**Files changed:** ${[...turn.files].map((f) => `\`${f}\``).join(', ')}`, '');
  if (turn.commands.length) {
    const shown = turn.commands.slice(0, 12).map((c) => `\`${c.replace(/`/g, "'")}\``);
    const more = turn.commands.length > 12 ? ` and ${turn.commands.length - 12} more` : '';
    lines.push(`**Commands run:** ${shown.join(', ')}${more}`, '');
  }
  const toolSummary = Object.entries(turn.tools).map(([name, count]) => `${name} ×${count}`).join(', ');
  if (toolSummary) lines.push(`<sub>Tools: ${toolSummary}</sub>`, '');
  appendMarkdown(lines.join('\n'));

  appendJsonl({
    type: 'response',
    n,
    at: now.toISOString(),
    session_id: sid,
    elapsed_ms: startedAt ? now - startedAt : null,
    message,
    files_changed: [...turn.files],
    commands: turn.commands,
    tools: turn.tools,
  });
  copyTranscript(transcriptPath, sid);
}

function onSubagentStop(input, sid, now) {
  const type = input.agent_type || 'subagent';
  const message = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : '';
  appendMarkdown(
    [
      '',
      `<details><summary>Subagent <code>${escapeHtml(type)}</code> finished · ${localStamp(now)}</summary>`,
      '',
      blockquote(message || '(no text)'),
      '',
      '</details>',
      '',
    ].join('\n'),
  );
  appendJsonl({ type: 'subagent', at: now.toISOString(), session_id: sid, agent_type: type, agent_id: input.agent_id, message });
  const agentTranscript = expandHome(input.agent_transcript_path);
  if (agentTranscript && fs.existsSync(agentTranscript)) {
    const dest = path.join(LOG_DIR, 'transcripts', sid, 'subagents', path.basename(agentTranscript));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(agentTranscript, dest);
  }
}

function onSessionEnd(input, sid, now) {
  copyTranscript(expandHome(input.transcript_path), sid);
  appendMarkdown(`\n_Session \`${sid.slice(0, 8)}\` ended (${input.reason || 'unknown'}) · ${localStamp(now)}_\n`);
  appendJsonl({ type: 'session-end', at: now.toISOString(), session_id: sid, reason: input.reason });
}

// ---------- transcript parsing ----------

function summarizeTurn(transcriptPath, root) {
  const out = { files: new Set(), commands: [], tools: {}, text: [] };
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return out;
  const entries = [];
  for (const line of fs.readFileSync(transcriptPath, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* partial line */
    }
  }
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isUserPrompt(entries[i])) {
      start = i + 1;
      break;
    }
  }
  for (const e of entries.slice(start)) {
    if (!e || e.type !== 'assistant' || e.isSidechain || !e.message) continue;
    const content = Array.isArray(e.message.content) ? e.message.content : [];
    for (const block of content) {
      if (!block) continue;
      if (block.type === 'tool_use') {
        out.tools[block.name] = (out.tools[block.name] || 0) + 1;
        const input = block.input || {};
        const file = input.file_path || input.notebook_path;
        if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(block.name) && file) out.files.add(relativeTo(root, file));
        if (/^(Bash|PowerShell)$/.test(block.name) && input.command) out.commands.push(oneLine(input.command, 140));
      } else if (block.type === 'text' && block.text) {
        out.text.push(block.text);
      }
    }
  }
  return out;
}

function isUserPrompt(e) {
  if (!e || e.type !== 'user' || e.isMeta || e.isSidechain || !e.message) return false;
  const c = e.message.content;
  if (typeof c === 'string') return c.trim().length > 0;
  if (Array.isArray(c)) return c.some((b) => b && b.type === 'text') && !c.some((b) => b && b.type === 'tool_result');
  return false;
}

// ---------- storage helpers ----------

function statePath() {
  return path.join(LOG_DIR, '.state.json');
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), 'utf8'));
  } catch {
    return { counter: 0, sessions: {} };
  }
}

function withState(mutate) {
  const lock = path.join(LOG_DIR, '.state.lock');
  let fd = null;
  for (let i = 0; i < 40 && fd === null; i++) {
    try {
      fd = fs.openSync(lock, 'wx');
    } catch {
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > 5000) fs.rmSync(lock, { force: true });
      } catch {
        /* ignore */
      }
      sleepMs(25);
    }
  }
  try {
    const state = readState();
    const result = mutate(state);
    const tmp = `${statePath()}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, statePath());
    return result;
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
      fs.rmSync(lock, { force: true });
    }
  }
}

function appendMarkdown(text) {
  const file = path.join(LOG_DIR, 'PROMPT_LOG.md');
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      [
        '# AI prompt log',
        '',
        'Every prompt sent to Claude Code in this repository and the agent\'s final response to it, recorded automatically by `.claude/hooks/ai-log.mjs` (UserPromptSubmit and Stop hooks).',
        'Full raw transcripts, including every tool call, are in `transcripts/`. Readable per-session transcripts and an index are generated by `npm run logs:collect`.',
        '',
      ].join('\n'),
    );
  }
  fs.appendFileSync(file, `${text}\n`);
}

function appendJsonl(obj) {
  fs.appendFileSync(path.join(LOG_DIR, 'prompt-log.jsonl'), `${JSON.stringify(obj)}\n`);
}

function copyTranscript(transcriptPath, sid) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return;
  fs.copyFileSync(transcriptPath, path.join(LOG_DIR, 'transcripts', `${safeName(sid)}.jsonl`));
}

function recordError(err) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, '.hook-errors.log'), `${new Date().toISOString()} [${MODE}] ${err && err.stack ? err.stack : String(err)}\n`);
  } catch {
    /* nothing else we can do */
  }
}

// ---------- small utilities ----------

function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    const chunks = [];
    const timer = setTimeout(() => resolve(Buffer.concat(chunks).toString('utf8')), timeoutMs);
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function expandHome(p) {
  if (!p || typeof p !== 'string') return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

function relativeTo(root, file) {
  const rel = path.relative(root, file);
  return (rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : file).split(path.sep).join('/');
}

function oneLine(s, max) {
  const flat = String(s).replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function fenceFor(text) {
  const longest = (String(text).match(/`+/g) || []).reduce((m, run) => Math.max(m, run.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}

function blockquote(text) {
  return String(text)
    .split(/\r?\n/)
    .map((l) => (l.length ? `> ${l}` : '>'))
    .join('\n');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}

function safeName(s) {
  return String(s).replace(/[^A-Za-z0-9._-]/g, '_');
}

function formatDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

function localStamp(d) {
  const pad = (v) => String(v).padStart(2, '0');
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} (UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)})`;
}
