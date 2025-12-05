# HAPF v1.0 Language Specification

**Status:** Draft / Active
**Version:** 1.0.0

## Abstract

HAPF (Human-AI Program Format) is a domain-specific language (DSL) designed to describe software systems, data pipelines, and AI agent workflows at a high level of abstraction. It focuses on **Intent** (what should happen) rather than **Implementation** (how it happens), making it an ideal intermediate format between human architects and AI coding agents.

## Core Concepts

### 1. Package
The root declaration of a HAPF file. Defines the scope and environment.

```hapf
package "my-system" {
  version: "1.0.0"
  env: {
    target: "python"
  }
}
```

### 2. Types
Strongly typed data structures used to enforce contracts between modules.

```hapf
type User struct {
  id: UUID
  email: String
  role: Enum["ADMIN", "USER"]
}
```

### 3. Modules
Functional units of logic. A module defines a **Contract** (I/O) and **Instructions** (Natural Language prompt for the AI Runtime).

```hapf
module "auth.login" {
  contract: {
    input: { creds: Credentials }
    output: { token: String }
  }
  instructions: {
    system_template: "Validate credentials and issue JWT."
  }
  runtime: {
    strategy: "single-shot"
  }
}
```

### 4. Pipelines
The orchestration layer. Pipelines define the flow of data between modules.

```hapf
pipeline "user_onboarding" {
  let user = run auth.signup(input.data)
  run email.send_welcome(user.email)
}
```

## Syntax Grammar

### Primitive Types
-   `String`, `Int`, `Float`, `Bool`
-   `Blob` (Binary data, files)
-   `Date`, `UUID`

### Collections
-   `List<T>`
-   `Map<K, V>`
-   `Stream<T>`

### Control Flow
-   `run <module>(<args>)`: Execute a module.
-   `let <var> = ...`: Assign output to variable.
-   `if (<condition>) { ... } else { ... }`: Conditional logic.
-   `loop (<condition>) { ... }`: Iterative logic (useful for Agentic loops).

## Runtime Blocks

Modules can define a `runtime` block to hint execution strategies:

-   `tool`: Specifies an external tool capability (e.g., `git_cli`, `shell_exec`, `google_search`).
-   `strategy`:
    -   `single-shot`: Standard LLM call.
    -   `chain-of-thought`: Reasoning required before output.
    -   `map-reduce`: Parallel processing for lists/streams.
    -   `stream`: Real-time processing.
