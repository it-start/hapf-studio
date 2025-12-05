# HAPF v1.0 Studio

## Overview

The **Human–AI Program Format (HAPF)** Studio is a specialized Integrated Development Environment (IDE) designed to bridge the gap between human architectural intent and AI-driven execution.

This environment serves as the reference implementation for:
1.  **HAPF Language v1.0**: A declarative syntax for defining AI-agentic workflows and system architectures.
2.  **HAPF Runtime Simulator**: A Gemini-powered engine that simulates the execution of HAPF pipelines.
3.  **Project Teleport**: A protocol for serializing entire software repositories into portable, semantic HAPF Bundles.

## Core Features

-   **Reverse Engineering (Legacy Lifter)**: Connect to a GitHub repository to extract its semantic intent and generate a HAPF specification automatically.
-   **Pipeline Simulation**: Run complex agentic loops (e.g., "Self-Healing Code", "Deep Research", "Legal Audit") in a safe, simulated sandbox.
-   **Visualizers**:
    -   **Live Diagram**: React Flow-based real-time visualization of pipeline execution.
    -   **Artifact Viewer**: Rich rendering of outputs including Markdown, JSON trees, Images, and Generative Quantum Art.
-   **Project Teleport**: "Compile" a source code repository into a single `.hapf` file for transport, analysis, or backup, and "Decompile" it back to source.

## Getting Started

### Prerequisites
-   Node.js v18+
-   Google Gemini API Key (set as `API_KEY` in environment)

### Installation
```bash
npm install
npm start
```

## Documentation

For deep dives into the protocol and runtime requirements, please refer to the `docs/` directory:

-   [HAPF Language Specification](docs/HAPF_SPEC_v1.0.md)
-   [Runtime Implementation Guide](docs/RUNTIME_INTERFACE.md)
-   [Project Teleport Protocol](docs/PROJECT_TELEPORT.md)

---
*Built with React, TypeScript, Vite, Tailwind, and Gemini 2.5 Flash.*
