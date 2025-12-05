

import { HapfExample } from './utils';
import { CORE_EXAMPLES } from './core';
import { AGENT_EXAMPLES } from './agents';
import { INTEGRATION_EXAMPLES } from './integrations';
import { CREATIVE_EXAMPLES } from './creative';

export type { HapfExample };

// SINGLE SOURCE OF TRUTH
export const PIPELINE_EXAMPLES: Record<string, HapfExample> = {
  ...CORE_EXAMPLES,
  ...AGENT_EXAMPLES,
  ...INTEGRATION_EXAMPLES,
  ...CREATIVE_EXAMPLES
};

export const INITIAL_HAPF_CODE = PIPELINE_EXAMPLES["reverse-engineer"].code;
export const DEFAULT_INPUT_TEXT = PIPELINE_EXAMPLES["reverse-engineer"].input;
