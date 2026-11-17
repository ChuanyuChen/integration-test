#!/usr/bin/env node
/**
 * Target repo path resolution utilities (openan multi-repo).
 * Output conventions follow each language profile's directory layout.
 * Test code root is `e2e/<feature>/` (test-plan §11); java keeps the
 * Maven-enforced `src/test/java` layout (documented language exception).
 */
import { join } from 'node:path';

/**
 * Default output conventions per language_profile.
 * base_dir / file_pattern / test_layer support tokens:
 * {case_id} {case_id_slug} {module} {scenario} {scenario_pascal}.
 */
export const PROFILE_OUTPUT = {
  python: {
    base_dir: 'e2e/{module}',
    file_pattern: 'test_{module}_{scenario}.py',
    test_layer: 'e2e/{module}',
  },
  java: {
    base_dir: 'src/test/java',
    file_pattern: '{scenario_pascal}Test.java',
    test_layer: 'src/test/java',
  },
  js: {
    base_dir: 'e2e/{module}',
    file_pattern: '{module}.{scenario}.spec.ts',
    test_layer: 'e2e/{module}',
  },
  shell: {
    base_dir: 'e2e/{module}',
    file_pattern: '{module}.bats',
    test_layer: 'e2e/{module}',
  },
};

export function toKebabCase(name) {
  if (!name) return '';
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

export function toSnakeCase(name) {
  if (!name) return '';
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
}

export function toPascalCase(name) {
  if (!name) return '';
  return toSnakeCase(name)
    .split('_')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/** module column (e.g. registry-center) -> kebab-case token, also used as <feature> directory. */
export function moduleToken(module, fallback = 'feature') {
  const s = toKebabCase(module);
  return s || fallback;
}

export function scenarioToken(scenario) {
  const s = toSnakeCase(scenario || 'generic');
  return s || 'generic';
}

/** PascalCase scenario token for Java class naming (e.g. task_dispatch -> TaskDispatch). */
export function scenarioPascalToken(scenario) {
  const s = toPascalCase(scenario || 'generic');
  return s || 'Generic';
}

function substitute(pattern, tokens) {
  return pattern
    .replace(/\{case_id\}/g, tokens.case_id)
    .replace(/\{case_id_slug\}/g, tokens.case_id_slug)
    .replace(/\{module\}/g, tokens.module)
    .replace(/\{scenario_pascal\}/g, tokens.scenario_pascal)
    .replace(/\{scenario\}/g, tokens.scenario);
}

/**
 * Resolve the output file (repo-relative, forward slashes) for one case.
 * config.output.dir / config.output.file_pattern override profile defaults.
 */
export function resolveOutputPath(config, parsedCase) {
  const profile = parsedCase.language_profile;
  const defaults = PROFILE_OUTPUT[profile];
  if (!defaults) {
    return { output_file: null, error: `unknown language_profile: ${profile}` };
  }

  const tokens = {
    case_id: parsedCase.case_id,
    case_id_slug: parsedCase.case_id_slug,
    module: moduleToken(parsedCase.module),
    scenario: scenarioToken(parsedCase.scenario),
    scenario_pascal: scenarioPascalToken(parsedCase.scenario),
  };

  const baseDir = substitute(config.output?.dir ?? defaults.base_dir, tokens);
  const pattern = config.output?.file_pattern ?? defaults.file_pattern;
  const file = substitute(pattern, tokens);

  return {
    output_file: join(baseDir, file).replace(/\\/g, '/'),
    base_dir: baseDir,
    profile,
    test_layer: substitute(defaults.test_layer, tokens),
    scenario: tokens.scenario,
    scenario_pascal: tokens.scenario_pascal,
  };
}
