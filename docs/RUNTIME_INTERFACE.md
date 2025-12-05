# HAPF Runtime Implementation Guide

## Overview

A **HAPF Runtime** is any entity (Software Engine or Human Developer) capable of executing a HAPF specification. The runtime is responsible for parsing the code, managing the state, and executing modules according to their contracts.

## Execution Model

### 1. Ingestion
The runtime must parse the `.hapf` file.
-   **Validation**: Ensure all used `types` are defined.
-   **Resolution**: Resolve module dependencies.

### 2. Pipeline Orchestration
When a pipeline is triggered:
1.  Initialize the **Context** (scope) with `input` data.
2.  Execute steps sequentially (or parallel if independent).
3.  **Module Execution**:
    -   If the module has `instructions`, the Runtime (if AI) uses them as the System Prompt.
    -   If the module has `tool`, the Runtime invokes the external tool adapter.
4.  **State Management**: Store outputs of `let` assignments in the Context.

### 3. Simulation Protocol (The "HAPF Studio" approach)

If building a simulator (like the one in this repo), the Runtime acts as a **Meta-LLM**.

**Input Prompt:**
```text
You are the HAPF Runtime.
CODE: [HAPF Source]
INPUT: [JSON Data]
INSTRUCTION: Trace execution and simulate outputs.
```

**Output Format (JSON):**
```json
{
  "steps": [
    {
      "module": "module_name",
      "message": "Log of action taken",
      "data_preview": "Short snippet of result"
    }
  ],
  "output": { ...final_result... }
}
```

## Runtime Levels

| Level | Name | Capabilities |
| :--- | :--- | :--- |
| **L0** | **Linter** | Static analysis only. Checks syntax/types. |
| **L1** | **Simulator** | (Current Studio) Hallucinates plausible outputs based on logic. |
| **L2** | **Orchestrator** | Calls real APIs (Gemini, OpenAI) for modules but logic is external. |
| **L3** | **Native** | Fully integrated environment with File System, Shell, and Network access. |

## Error Handling

Runtimes must handle:
-   **Contract Violation**: Input/Output data does not match `type` definition.
-   **Runtime Panic**: Tool failure or 5xx API error.
-   **Loop Timeout**: Infinite loop protection in Agentic workflows.
