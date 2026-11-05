#!/usr/bin/env node
/**
 * Where the deploy workflow sends a push of one branch, from
 * scripts/cloudflare/project.mjs, as KEY=value lines for $GITHUB_OUTPUT.
 *
 *   node scripts/cloudflare/target.mjs <branch>
 *
 *   environment=production|preview
 *   alias=<the branch name the deployment is made as>
 *   production_branch=<PROJECT.productionBranch>
 */
import { PROJECT, deployTarget } from './project.mjs';

const branch = process.argv[2];
if (!branch) {
  console.error('usage: node scripts/cloudflare/target.mjs <branch>');
  process.exit(2);
}
const { environment, alias } = deployTarget(branch);
console.log([`environment=${environment}`, `alias=${alias}`, `production_branch=${PROJECT.productionBranch}`].join('\n'));
