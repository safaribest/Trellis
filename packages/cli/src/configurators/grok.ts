/**
 * Grok Build configurator.
 *
 * Grok Build (xAI CLI) stores skills as `.grok/skills/<name>/SKILL.md`,
 * sub-agent roles as `.grok/roles/<name>.toml`, agent prompts as
 * `.grok/agents/<name>.md`, and lifecycle hooks as `.grok/hooks/*.json`.
 * Slash commands are skills (`/trellis-finish-work`, etc.).
 */

import path from "node:path";
import { AI_TOOLS } from "../types/ai-tools.js";
import { ensureDir, writeFile } from "../utils/file-writer.js";
import { getAllAgents, getHooksConfig } from "../templates/grok/index.js";
import { getSharedHookScriptsForPlatform } from "../templates/shared-hooks/index.js";
import {
  collectSkillTemplates,
  resolveAllAsSkills,
  resolveBundledSkills,
  resolvePlaceholders,
  writeAgents,
  writeSharedHooks,
  writeSkills,
} from "./shared.js";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  "trellis-implement": "Trellis implementation sub-agent",
  "trellis-check": "Trellis verification sub-agent",
  "trellis-research": "Trellis research sub-agent",
};

function roleToml(roleName: string, promptFile: string): string {
  const description =
    ROLE_DESCRIPTIONS[roleName] ?? `Trellis ${roleName} sub-agent`;
  return `description = "${description}"\nprompt_file = "${promptFile}"\n`;
}

/**
 * Collect all Grok template files for `trellis update` diff tracking.
 * Must stay in sync with `configureGrok`.
 */
export function collectGrokTemplates(): Map<string, string> {
  const config = AI_TOOLS.grok;
  const ctx = config.templateContext;
  const files = new Map<string, string>();

  const agentNames = new Set(getAllAgents().map((a) => a.name));
  const skills = resolveAllAsSkills(ctx).filter((s) => !agentNames.has(s.name));

  for (const [filePath, content] of collectSkillTemplates(
    ".grok/skills",
    skills,
    resolveBundledSkills(ctx),
  )) {
    files.set(filePath, content);
  }

  for (const agent of getAllAgents()) {
    files.set(`.grok/agents/${agent.name}.md`, agent.content);
    files.set(
      `.grok/roles/${agent.name}.toml`,
      roleToml(agent.name, `.grok/agents/${agent.name}.md`),
    );
  }

  for (const hook of getSharedHookScriptsForPlatform("grok")) {
    files.set(`.grok/hooks/${hook.name}`, hook.content);
  }

  files.set(".grok/hooks/trellis.json", resolvePlaceholders(getHooksConfig()));

  return files;
}

/**
 * Configure Grok Build at init time.
 */
export async function configureGrok(cwd: string): Promise<void> {
  const config = AI_TOOLS.grok;
  const ctx = config.templateContext;
  const configRoot = path.join(cwd, config.configDir);

  const agentNames = new Set(getAllAgents().map((a) => a.name));
  const skills = resolveAllAsSkills(ctx).filter((s) => !agentNames.has(s.name));

  await writeSkills(
    path.join(configRoot, "skills"),
    skills,
    resolveBundledSkills(ctx),
  );

  await writeAgents(path.join(configRoot, "agents"), getAllAgents());

  const rolesDir = path.join(configRoot, "roles");
  ensureDir(rolesDir);
  for (const agent of getAllAgents()) {
    await writeFile(
      path.join(rolesDir, `${agent.name}.toml`),
      roleToml(agent.name, `.grok/agents/${agent.name}.md`),
    );
  }

  await writeSharedHooks(path.join(configRoot, "hooks"), "grok");

  await writeFile(
    path.join(configRoot, "hooks", "trellis.json"),
    resolvePlaceholders(getHooksConfig()),
  );
}
