#!/usr/bin/env node
/**
 * Resolve skill root and key file paths (for agents/scripts discovery).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = dirname(scriptsDir);

console.log(
  JSON.stringify(
    {
      skill_root: skillRoot,
      scripts: {
        validate_config: join(scriptsDir, 'validate-config.mjs'),
        parse_test_cases: join(scriptsDir, 'parse-test-cases.mjs'),
        build_codegen_plan: join(scriptsDir, 'build-codegen-plan.mjs'),
        run: join(scriptsDir, 'run.mjs'),
      },
      references: {
        csv_guide: join(skillRoot, 'references', 'reviewed-csv-generation-guide.md'),
        csv_sample: join(skillRoot, 'references', 'reviewed-csv-sample.csv'),
        code_gen_guide: join(skillRoot, 'references', 'code-generation-guide.md'),
        orchestration_guide: join(skillRoot, 'references', 'test-package-orchestration-guide.md'),
        profile_python: join(skillRoot, 'references', 'python.md'),
        profile_java: join(skillRoot, 'references', 'java.md'),
        profile_js: join(skillRoot, 'references', 'js.md'),
        profile_shell: join(skillRoot, 'references', 'shell.md'),
      },
      templates: {
        test_package_readme: join(skillRoot, 'templates', 'test-package-readme.example.md'),
      },
      assets: {
        config_example: join(skillRoot, 'assets', 'e2e-code-gen.config.example.json'),
      },
    },
    null,
    2
  )
);
