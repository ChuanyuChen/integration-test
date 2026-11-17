#!/usr/bin/env node
/**
 * CSV parser for the openan test case CSV (fixed 16-column, verbatim English header).
 * Header matches the authoritative template (openan-itest docs/templates/testcases-template.csv).
 * Orchestration keys (language_profile / protocol_primitive /
 * execution_strategy / environment / dfx_type) are carried as `key:value` pairs inside the Notes column.
 * Case ID is wrapped in square brackets in the CSV and stripped here.
 * Reads the file as UTF-8 (BOM, if present, is stripped by callers or
 * tolerated here since the first header key is trimmed).
 */
export const FORMAT_OPENAN = 'openan';

export const CASE_HEADERS = [
  'Milestone',
  'Case Name',
  'Case ID',
  'Module',
  'Component Deps',
  'Requirement Link',
  'Case Type',
  'Priority',
  'Precondition',
  'Steps',
  'Expected Result',
  'Automatable',
  'Automated Test',
  'Dev Owner',
  'Test Owner',
  'Notes',
];

export const LANGUAGE_PROFILES = ['python', 'java', 'js', 'shell'];

export const DFX_TYPES = ['DFT', 'DFD', 'DFS', 'DFR', 'DFP', 'DFNS', 'DFC'];

export const FIT_TYPES = ['Functional Test', 'Exception Test', 'Protocol Test'];

export const EXECUTION_STRATEGIES = ['smoke', 'full', 'slow'];

/** Case Type (English enum) -> DFX short-code mapping (for DFX rows, the Notes dfx_type key takes precedence). */
const DFX_TYPE_MAP = {
  'Functional Test': 'DFT',
  'Deployment Test': 'DFS',
  'Stability Test': 'DFR',
  'Performance Test': 'DFP',
  'Stress Test': 'DFP',
  'Security Test': 'DFNS',
  'Compatibility Test': 'DFC',
};

export function detectCsvFormat(headers) {
  const h = headers.map((x) => x.replace(/^\uFEFF/, '').trim());
  const ok = h.length === CASE_HEADERS.length && CASE_HEADERS.every((col, i) => h[i] === col);
  return ok ? FORMAT_OPENAN : 'unknown';
}

export function normalizeCaseId(raw) {
  // In the CSV the Case ID is wrapped in square brackets (e.g. [FIT-registry-center-agentcard-001]);
  // strip them here. Docstrings / @DisplayName / test titles in generated code use the bare ID.
  return (raw || '').trim().replace(/^\[+|\]+$/g, '');
}

export function extractCaseIdSlug(caseId) {
  return (caseId || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

export function inferOpenanScenario(row) {
  // body = case body (Case Name/Steps/Expected Result/Notes); all also includes Precondition.
  // Patterns are checked top-down, more specific scenarios first, to avoid false hits
  // from Precondition wording such as "already registered".
  const body = [row['Case Name'], row['Steps'], row['Expected Result'], row['Notes']].join(' ');
  const all = `${body} ${row['Precondition']}`;

  if (/\btask dispatch\b|task-dispatch|Task-T/i.test(all)) return 'task_dispatch';
  if (/negotiation|Negotiation-T|Authorization-T/i.test(all)) return 'protocol_negotiation';
  if (/restart/i.test(all)) return 'service_restart';
  if (/boundary|length limit/i.test(body)) return 'boundary';
  if (/concurrent|concurrency|idempotent|duplicate/i.test(body)) return 'concurrency';
  if (/PUT |DELETE |update|deregister/i.test(body)) return 'agent_update_delete';
  if (/invalid|reject|not exist|non-existent|400|422|404/i.test(body)) return 'invalid_input';
  if (/docker compose up|service startup|health|deploy/i.test(body)) return 'service_startup';
  if (/POST \/v1\/agents|register agent|registration/i.test(body)) return 'agent_register';
  if (/GET |query|pagination|list/i.test(body)) return 'agent_query';
  return 'generic';
}

/**
 * Normalize one CSV row. Internal field names stay downstream-compatible
 * (case_id/type/module/...); values come from the fixed 16-column English header;
 * orchestration keys are parsed from the Notes column:
 * language_profile / protocol_primitive / execution_strategy / environment / dfx_type.
 * type derivation: FIT types (Functional/Exception/Protocol Test) -> 'FIT';
 * DFX rows prefer the Notes dfx_type key (uppercased), else the Case Type mapping,
 * else the raw value.
 */
export function normalizeRow(row) {
  const notes = parseNotes(row['Notes'] || '');
  const caseType = (row['Case Type'] || '').trim();
  const dfxKey = (notes['dfx_type'] || '').trim().toUpperCase();
  let type = caseType;
  if (DFX_TYPES.includes(dfxKey)) type = dfxKey;
  else if (FIT_TYPES.includes(caseType)) type = 'FIT';
  else if (DFX_TYPE_MAP[caseType]) type = DFX_TYPE_MAP[caseType];

  const caseId = normalizeCaseId(row['Case ID']);
  return {
    _raw: row,
    case_id: caseId,
    case_id_slug: extractCaseIdSlug(caseId),
    type,
    case_type: caseType,
    module: (row['Module'] || '').trim(),
    name: (row['Case Name'] || '').trim(),
    priority: (row['Priority'] || '').trim(),
    milestone: (row['Milestone'] || '').trim(),
    requirement_link: (row['Requirement Link'] || '').trim(),
    automatable: (row['Automatable'] || '').trim(),
    auto_case_ref: (row['Automated Test'] || '').trim(),
    language_profile: (notes['language_profile'] || '').trim(),
    component_deps: (row['Component Deps'] || '').trim(),
    protocol_primitive: (notes['protocol_primitive'] || '').trim(),
    execution_strategy: (notes['execution_strategy'] || '').trim(),
    environment: (notes['environment'] || '').trim(),
    dfx_type: dfxKey,
    preconditions: (row['Precondition'] || '').trim(),
    steps: (row['Steps'] || '').trim(),
    expected: (row['Expected Result'] || '').trim(),
    notes_text: (row['Notes'] || '').trim(),
    notes,
    scenario: inferOpenanScenario(row),
  };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r' && text[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 2;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? '').trim();
      });
      return obj;
    });
}

/** Parse `key:value` pairs from the Notes column; multiple keys are separated by `；` or `;`. */
export function parseNotes(notes) {
  const out = {};
  for (const part of (notes || '').split(/[;；]/)) {
    const [k, ...rest] = part.split(/[:：]/);
    if (k && rest.length) out[k.trim()] = rest.join(':').trim();
  }
  return out;
}

export function inferEntryType(row) {
  const steps = row.steps || row['Steps'] || '';
  const primitive = row.protocol_primitive || row['protocol_primitive'] || '';
  if (primitive && primitive !== 'none') return 'A2A-T';
  if (/console|page|login|browser|UI/i.test(steps)) return 'UI';
  if (/docker compose|container|service startup/i.test(steps)) return 'Compose';
  if (/api|http|curl|rest|GET |POST |PUT |DELETE /i.test(steps)) return 'API';
  return 'API';
}

export function shouldIncludeRow(normalized) {
  const type = normalized.type || '';
  if (!type) return true;
  return type === 'FIT' || DFX_TYPES.includes(type);
}

export function isValidLanguageProfile(value) {
  return LANGUAGE_PROFILES.includes((value || '').trim());
}

export function isValidExecutionStrategy(value) {
  return EXECUTION_STRATEGIES.includes((value || '').trim());
}
