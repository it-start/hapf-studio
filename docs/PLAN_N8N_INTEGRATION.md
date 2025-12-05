# Plan: HAPF to n8n Integration

## Objective
Enable users to design high-level workflows in HAPF Studio and "compile" them into executable JSON workflows compatible with self-hosted n8n instances.

## Architecture

### 1. Configuration
We need a place to store n8n connection details.
- **Location**: Settings Modal -> New "Integrations" Section.
- **Fields**: 
  - `Instance URL` (e.g., `https://n8n.my-server.com`) - Used for generating webhook URLs.
  - `API Key` (Optional) - For future direct API pushing.

### 2. The Compiler (Service Layer)
A new service function `runCompileToN8n` in `geminiService.ts`.
- **Input**: HAPF Source Code.
- **Logic**: Use Gemini 2.5 Flash to transpile HAPF constructs to n8n JSON.
  - `pipeline` -> Main Workflow Canvas.
  - `input.stream` / `input.webhook` -> **Webhook Node**.
  - `run module` -> **Code Node** (JavaScript) or **HTTP Request Node**.
  - `if/else` -> **If Node**.
- **Output**: Valid n8n Workflow JSON object (`{ "nodes": [...], "connections": {...} }`).

### 3. Pipeline Example
A specific example `n8n-integration` in `constants.tsx` to demonstrate the capabilities.
- **Scenario**: "Incoming Webhook Processing".
- **HAPF Code**:
  ```hapf
  pipeline "webhook_handler" {
    let payload = input.webhook
    let sentiment = run ai.analyze(payload.text)
    if (sentiment.score < 0) {
       run slack.alert("Bad review!")
    }
  }
  ```

### 4. Artifact Viewer
Enhance `ArtifactViewer.tsx` to display the generated N8n Workflow.
- **Visuals**: List of generated nodes, Flow summary.
- **Actions**: "Download .json" button for import into n8n.

## Implementation Steps

1.  **Update `types.ts`**: Add `N8nConfig` and update `Artifacts`.
2.  **Update `constants.tsx`**: Add the `n8n-integration` pipeline.
3.  **Update `services/geminiService.ts`**: Implement the compiler prompt.
4.  **Update `App.tsx`**: 
    - Add Integration Settings UI.
    - Update execution logic to trigger compilation for n8n examples.
5.  **Update `components/ArtifactViewer.tsx`**: Add `N8nWorkflowViewer` component.

