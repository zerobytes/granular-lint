'use strict';

const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

function color(c, s, useColor = true) {
  if (!useColor) return s;
  return COLORS[c] + s + COLORS.reset;
}

function severitySymbol(severity, useColor) {
  if (severity === 'error') return color('red', 'error', useColor);
  if (severity === 'warning') return color('yellow', 'warn', useColor);
  return color('blue', 'info', useColor);
}

function relPath(filePath, cwd) {
  if (!filePath) return '<source>';
  try {
    return path.relative(cwd || process.cwd(), filePath) || filePath;
  } catch {
    return filePath;
  }
}

function formatStylish(results, opts = {}) {
  const useColor = opts.color !== false && process.stdout.isTTY;
  const cwd = opts.cwd || process.cwd();
  const out = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithIssues = 0;

  for (const result of results) {
    if (!result.messages.length) continue;
    filesWithIssues++;
    out.push('');
    out.push(color('bold', relPath(result.filePath, cwd), useColor));
    for (const m of result.messages) {
      if (m.severity === 'error') totalErrors++;
      else if (m.severity === 'warning') totalWarnings++;
      const loc = color('gray', `${m.line}:${m.column}`, useColor).padEnd(8 + (useColor ? 9 : 0));
      const sev = severitySymbol(m.severity, useColor).padEnd(5 + (useColor ? 9 : 0));
      const ruleId = color('dim', m.ruleId, useColor);
      out.push(`  ${loc}  ${sev}  ${m.message}  ${ruleId}`);
    }
  }

  out.push('');
  if (totalErrors === 0 && totalWarnings === 0) {
    out.push(color('green', '\u2713 No problems found.', useColor));
  } else {
    const summary = `${totalErrors} ${totalErrors === 1 ? 'error' : 'errors'}, ${totalWarnings} ${totalWarnings === 1 ? 'warning' : 'warnings'} in ${filesWithIssues} ${filesWithIssues === 1 ? 'file' : 'files'}`;
    out.push(color(totalErrors > 0 ? 'red' : 'yellow', summary, useColor));
  }
  return { text: out.join('\n'), totalErrors, totalWarnings, filesWithIssues };
}

function formatJson(results) {
  return JSON.stringify(results, null, 2);
}

module.exports = { formatStylish, formatJson };
