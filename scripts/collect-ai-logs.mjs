#!/usr/bin/env node
// Collects every Claude Code transcript that belongs to this repository into ai-logs/,
// renders a readable Markdown file per session, and writes ai-logs/INDEX.md.
// Safe to run any number of times.  Usage: node scripts/collect-ai-logs.mjs [repoRoot]
//
// Claude Code keeps transcripts in ~/.claude/projects/<project-slug>/<session-id>.jsonl
// (or under $CLAUDE_CONFIG_DIR). Sessions are matched by the `cwd` recorded inside them,
// so sessions started before the logging hooks existed are collected too.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(process.argv[2] || process.cwd());
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const projectsDir = path.join(configDir, 'projects');
const logDir = path.join(root, 'ai-logs');
const transcriptsDir = path.join(logDir, 'transcripts');
const sessionsDir = path.join(logDir, 'sessions');

const norm = (p) => {
  const r = path.resolve(p).replace(/\\/g, '/').replace(/\/+$/, '');
  return process.platform === 'win32' ? r.toLowerCase() : r;
};
const rootNorm = norm(root);

// Logs are published in a public repo: email addresses (e.g. from account context) are redacted.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const KEEP = new Set(['noreply@anthropic.com']);
const seenLocalParts = new Set();
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const redact = (text) => {
  let out = text.replace(EMAIL, (m, offset) => {
    // in JSON text "\nname@x.com" the "n" belongs to the escape sequence, not the address
    const keepFirst = offset > 0 && text[offset - 1] === '\\' && /[nrtbf]/.test(m[0]) ? m[0] : '';
    const addr = m.slice(keepFirst.length);
    if (KEEP.has(addr.toLowerCase())) return m;
    const local = addr.split('@')[0];
    if (local.length >= 5) seenLocalParts.add(local);
    return `${keepFirst}[email redacted]`;
  });
  // the user part of a redacted address can also appear on its own (for example in a search command)
  for (const local of seenLocalParts) out = out.replace(new RegExp(escapeRe(local), 'g'), '[redacted]');
  return out;
};
const copyRedacted = (from, to) => fs.writeFileSync(to, redact(fs.readFileSync(from, 'utf8')));

fs.mkdirSync(transcriptsDir, { recursive: true });
fs.mkdirSync(sessionsDir, { recursive: true });

if (!fs.existsSync(projectsDir)) {
  console.error(`No Claude Code projects folder at ${projectsDir}. Set CLAUDE_CONFIG_DIR if you moved it.`);
  process.exit(1);
}

const found = [];
for (const file of walk(projectsDir, 4)) {
  if (!file.endsWith('.jsonl')) continue;
  const cwd = firstCwd(file);
  if (!cwd) continue;
  const c = norm(cwd);
  if (c === rootNorm || c.startsWith(`${rootNorm}/`)) found.push(file);
}

const sessions = [];
for (const file of found) {
  const isSubagent = file.replace(/\\/g, '/').includes('/subagents/');
  const entries = readJsonl(file);
  const sessionId = entries.find((e) => e && e.sessionId)?.sessionId || path.basename(file, '.jsonl');
  if (isSubagent) {
    const dest = path.join(transcriptsDir, safe(sessionId), 'subagents', path.basename(file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    copyRedacted(file, dest);
    continue;
  }
  copyRedacted(file, path.join(transcriptsDir, `${safe(sessionId)}.jsonl`));
  const rendered = render(entries, sessionId);
  if (!rendered.prompts) continue;
  const stamp = rendered.start ? rendered.start.toISOString().slice(0, 16).replace(/[:T]/g, '-') : 'undated';
  const name = `${stamp}_${safe(sessionId).slice(0, 8)}.md`;
  fs.writeFileSync(path.join(sessionsDir, name), redact(rendered.markdown));
  sessions.push({ name, ...rendered, sessionId });
}

sessions.sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));
writeIndex(sessions);
console.log(`Collected ${found.length} transcript file(s); rendered ${sessions.length} session(s) into ai-logs/sessions/. See ai-logs/INDEX.md.`);

// ---------- rendering ----------

function render(entries, sessionId) {
  const out = [];
  let prompts = 0;
  let start = null;
  let end = null;
  let firstPrompt = '';
  for (const e of entries) {
    if (!e || e.isSidechain) continue;
    const t = e.timestamp ? new Date(e.timestamp) : null;
    if (t && !Number.isNaN(t.getTime())) {
      start = start || t;
      end = t;
    }
    if (e.type === 'summary' && e.summary) {
      out.push(`> _Context summary: ${oneLine(e.summary, 300)}_`, '');
      continue;
    }
    if (e.type === 'system' && e.subtype === 'compact_boundary') {
      out.push('> _Conversation compacted here._', '');
      continue;
    }
    if (e.type === 'user' && e.message && !e.isMeta) {
      const text = userText(e.message.content);
      if (text === null) continue;
      prompts += 1;
      if (!firstPrompt) firstPrompt = text;
      const fence = fenceFor(text);
      out.push('---', '', `## Prompt ${prompts}${t ? ` · ${t.toISOString()}` : ''}`, '', `${fence}text`, text, fence, '');
      continue;
    }
    if (e.type === 'assistant' && e.message && Array.isArray(e.message.content)) {
      for (const b of e.message.content) {
        if (!b) continue;
        if (b.type === 'text' && b.text && b.text.trim()) {
          out.push('**Claude:**', '', quote(b.text), '');
        } else if (b.type === 'tool_use') {
          out.push(`- tool \`${b.name}\`${toolDetail(b)}`);
        }
      }
      out.push('');
    }
  }
  const header = [
    `# Claude Code session ${sessionId}`,
    '',
    `- Started: ${start ? start.toISOString() : 'unknown'}`,
    `- Ended: ${end ? end.toISOString() : 'unknown'}`,
    `- Prompts: ${prompts}`,
    `- Raw transcript: [../transcripts/${safe(sessionId)}.jsonl](../transcripts/${safe(sessionId)}.jsonl)`,
    '',
  ];
  return { markdown: [...header, ...out].join('\n'), prompts, start, end, firstPrompt };
}

function userText(content) {
  if (typeof content === 'string') return content.trim() ? content : null;
  if (!Array.isArray(content)) return null;
  if (content.some((b) => b && b.type === 'tool_result')) return null;
  const parts = content.filter((b) => b && b.type === 'text').map((b) => b.text);
  const images = content.filter((b) => b && b.type === 'image').length;
  if (!parts.length && !images) return null;
  return [...parts, ...(images ? [`[${images} image(s) attached]`] : [])].join('\n\n');
}

function toolDetail(b) {
  const i = b.input || {};
  if (i.file_path) return `: ${rel(i.file_path)}`;
  if (i.command) return `: \`${oneLine(i.command, 120).replace(/`/g, "'")}\``;
  if (i.pattern) return `: ${oneLine(i.pattern, 80)}`;
  if (i.url) return `: ${i.url}`;
  if (i.description) return `: ${oneLine(i.description, 100)}`;
  return '';
}

function writeIndex(list) {
  const rows = list.map(
    (s, i) =>
      `| ${i + 1} | ${s.start ? s.start.toISOString().replace('T', ' ').slice(0, 16) : '?'} | ${s.prompts} | ${escapePipes(oneLine(s.firstPrompt, 70).replace(/`/g, "'"))} | [read](sessions/${s.name}) · [raw](transcripts/${safe(s.sessionId)}.jsonl) |`,
  );
  const total = list.reduce((sum, s) => sum + s.prompts, 0);
  const md = [
    '# AI usage logs',
    '',
    'This project was built with Claude Code. Every prompt and every agent response is recorded here, as the Hub\'s Quest rules require.',
    '',
    '- `PROMPT_LOG.md`: the prompt chain in order, with each final response, files changed and commands run (written live by hooks).',
    '- `sessions/`: a readable transcript of every Claude Code session (generated by `npm run logs:collect`).',
    '- `transcripts/`: the raw JSONL transcripts exactly as Claude Code stored them, including subagents.',
    '- `00-planning/`: the planning conversation that produced the spec and this workflow.',
    '',
    `Sessions: ${list.length} · prompts: ${total} · generated ${new Date().toISOString()}`,
    '',
    '| # | Started (UTC) | Prompts | First prompt | Links |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(logDir, 'INDEX.md'), md);
}

// ---------- helpers ----------

function* walk(dir, depth) {
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory() && depth > 0) yield* walk(full, depth - 1);
    else if (it.isFile()) yield full;
  }
}

function firstCwd(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(256 * 1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    for (const line of buf.toString('utf8', 0, n).split(/\r?\n/)) {
      if (!line.includes('"cwd"')) continue;
      try {
        const e = JSON.parse(line);
        if (e && typeof e.cwd === 'string') return e.cwd;
      } catch {
        /* partial line at the buffer edge */
      }
    }
  } catch {
    /* unreadable */
  }
  return null;
}

function readJsonl(file) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip */
    }
  }
  return out;
}

function rel(p) {
  const r = path.relative(root, p);
  return (r && !r.startsWith('..') && !path.isAbsolute(r) ? r : p).split(path.sep).join('/');
}
function safe(s) {
  return String(s).replace(/[^A-Za-z0-9._-]/g, '_');
}
function oneLine(s, max) {
  const flat = String(s || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
function escapePipes(s) {
  return s.replace(/\|/g, '\\|');
}
function fenceFor(text) {
  const longest = (String(text).match(/`+/g) || []).reduce((m, r) => Math.max(m, r.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}
function quote(text) {
  return String(text)
    .split(/\r?\n/)
    .map((l) => (l.length ? `> ${l}` : '>'))
    .join('\n');
}
