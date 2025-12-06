# HAPF Studio: Architectural Review & Refactoring Plan

**Status:** DRAFT
**Date:** 2024-05-22
**Focus:** Code Deduplication, Separation of Concerns, Scalability

## 1. Executive Summary

This document outlines the architectural analysis of the HAPF Studio codebase. The primary goal is to eliminate code duplication ("doubling code"), enforce strict separation between Data, Logic, and UI, and prepare the application for complex agentic workflows without bloating the main component tree.

## 2. Recent Optimizations (Implemented)

The following high-impact refactors have already been applied to the codebase:

### A. Generic Service Layer (`geminiService.ts`)
*   **Problem:** Multiple functions (`runIngestFiles`, `runAnalyzeArchitecture`, `runGenerateSpec`) contained identical boilerplate for initializing the Gemini model, configuring schemas, and parsing JSON responses.
*   **Solution:** Implemented a generic `generateStructured<T>` helper function.
*   **Impact:** Reduced service layer code by ~40%. New API modules can be added with 1 line of code instead of 15.

### B. Centralized Artifact Registry (`src/examples/`)
*   **Problem:** Pipeline examples were defined in a monolithic `constants.tsx` or scattered across files, leading to circular dependencies and multiple "sources of truth".
*   **Solution:** 
    *   Created a modular directory structure: `core.ts`, `agents.ts`, `integrations.ts`, `creative.ts`.
    *   Implemented a Unified Registry in `index.ts`.
    *   Removed data re-exports from `constants.tsx`.
*   **Impact:** easier contribution workflow for new examples; zero chance of import cycles.

## 3. Deep Architectural Analysis (Aggressive Refactoring Targets)

To further "avoid doubling code" and improve the developer experience, the following areas have been identified for the next phase of refactoring.

### Target 1: The Monolithic `App.tsx`
*   **Current State:** `App.tsx` is ~650 lines long. It handles:
    *   Global State (logs, artifacts, metrics).
    *   UI Layout (Split panes, Tabs, Header).
    *   Business Logic (`handleRun` simulation pipeline).
    *   Modal Rendering (Settings, GitHub).
*   **Risk:** High coupling. Changing the Simulation logic risks breaking the UI layout.
*   **Plan:**
    1.  **Extract Hook:** `useHapfRuntime()`
        *   Move `logs`, `pipelineStatus`, `artifacts`, `runMetrics` into this hook.
        *   Expose `executePipeline(code, input)` method.
    2.  **Extract Layout Components:**
        *   `LayoutHeader.tsx`
        *   `SettingsModal.tsx`
        *   `GithubConnectionModal.tsx`
    3.  **Result:** `App.tsx` becomes a purely compositional layer (~100 lines).

### Target 2: Visualizer Logic Duplication
*   **Current State:** `Console.tsx` and `HapfDiagram.tsx` both contain heuristic logic to determine "Provider Icons" (Gemini vs Mistral vs Cohere) and "Status Colors".
*   **Risk:** Inconsistent UI. If we add a new provider (e.g., Anthropic), we must update multiple files.
*   **Plan:**
    *   Create `src/theme/providers.ts`: Centralize color maps and icon resolvers.
    *   Create `src/utils/parsing.ts`: Centralize logic for parsing HAPF code (used by Editor, Diagram, and Simulator).

### Target 3: Hardcoded Simulation Heuristics
*   **Current State:** The "Simulation" logic inside `App.tsx` (looping through steps, adding delays) is tightly coupled to the React render cycle.
*   **Plan:**
    *   Abstract the `SimulationEngine` into a class or independent module that emits events (`onStep`, `onComplete`).
    *   This allows running simulations in a Web Worker in the future to prevent UI freezing during heavy "Deep Research" loops.

## 4. Proposed Folder Structure (Post-Refactor)

```text
src/
├── services/           # API Clients (Gemini, GitHub)
├── runtime/            # Core Logic
│   ├── engine.ts       # Simulation Event Loop
│   ├── parser.ts       # HAPF Syntax Parser
│   └── hooks/
│       └── useHapfRuntime.ts
├── data/               # Static Data
│   └── examples/       # HAPF Registry
├── components/
│   ├── layout/         # Header, Modals, Panes
│   ├── editors/        # Monaco, Input
│   ├── visualization/  # Diagram, Console, Artifacts
│   └── common/         # Buttons, Icons, Badges
├── types/              # TS Interfaces
└── App.tsx             # Composition Root
```

## 5. Conclusion

The codebase is currently stable and functional. The implemented Generic Service Layer has significantly reduced duplication in the backend integration. The next phase should prioritize extracting the complex state management from `App.tsx` into a custom hook to ensure scalability as the HAPF language features grow.
