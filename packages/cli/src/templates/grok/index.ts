/**
 * Grok Build templates
 *
 * Directory structure:
 *   grok/
 *   ├── agents/         # Sub-agent definitions (spawn_subagent roles)
 *   └── hooks/
 *       └── trellis.json  # Lifecycle hook configuration
 */

import { createTemplateReader, type AgentTemplate } from "../template-utils.js";
export type { AgentTemplate };

const { listMdAgents, getConfig } = createTemplateReader(import.meta.url);

export const getAllAgents = (): AgentTemplate[] => listMdAgents();
export const getHooksConfig = (): string => getConfig("hooks/trellis.json");
