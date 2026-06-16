import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getAllAgents } from "../../src/templates/grok/index.js";
import { collectGrokTemplates } from "../../src/configurators/grok.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

const EXPECTED_AGENT_NAMES = [
  "trellis-check",
  "trellis-implement",
  "trellis-research",
];

describe("grok getAllAgents", () => {
  it("returns the expected agent set", () => {
    const agents = getAllAgents();
    const names = agents.map((a) => a.name).sort();
    expect(names).toEqual(EXPECTED_AGENT_NAMES);
  });
});

describe("grok agent files", () => {
  for (const name of EXPECTED_AGENT_NAMES) {
    it(`${name}.md has a name frontmatter field`, () => {
      const filePath = path.join(
        repoRoot,
        "packages/cli/src/templates/grok/agents",
        `${name}.md`,
      );
      const content = fs.readFileSync(filePath, "utf-8");
      const fm = content.split("---\n")[1] ?? "";
      const nameMatch = fm.match(/^name:\s*(.+)$/m);
      expect(nameMatch?.[1]?.trim()).toBe(name);
    });
  }
});

describe("collectGrokTemplates", () => {
  it("writes sub-agent roles and agent prompts under .grok/", () => {
    const files = collectGrokTemplates();
    for (const name of EXPECTED_AGENT_NAMES) {
      expect(files.has(`.grok/agents/${name}.md`)).toBe(true);
      expect(files.has(`.grok/roles/${name}.toml`)).toBe(true);
    }
  });

  it("writes lifecycle hooks and hook scripts", () => {
    const files = collectGrokTemplates();
    expect(files.has(".grok/hooks/trellis.json")).toBe(true);
    expect(files.has(".grok/hooks/session-start.py")).toBe(true);
    expect(files.has(".grok/hooks/inject-subagent-context.py")).toBe(true);
    expect(files.has(".grok/hooks/inject-workflow-state.py")).toBe(true);
    expect(files.has(".grok/hooks/inject-shell-session-context.py")).toBe(true);
  });

  it("does not duplicate trellis-check as a workflow skill", () => {
    const files = collectGrokTemplates();
    const checkPaths = [...files.keys()].filter((p) =>
      p.endsWith("/trellis-check/SKILL.md"),
    );
    expect(checkPaths).toHaveLength(0);
  });

  it("role toml files reference matching agent prompt files", () => {
    const files = collectGrokTemplates();
    for (const name of EXPECTED_AGENT_NAMES) {
      const role = files.get(`.grok/roles/${name}.toml`);
      expect(role).toContain(`prompt_file = ".grok/agents/${name}.md"`);
    }
  });
});