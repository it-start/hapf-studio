import React from 'react';

export const PIPELINE_EXAMPLES: Record<string, { name: string; code: string; input: string }> = {
  "reverse-engineer": {
    name: "Reverse Engineer Repo",
    code: `package "hapf-web-studio-self-reflection" {
  version: "1.0.0"
  doc: "Analyzes a synthetic project and generates a HAPF spec."
}

# --- Data Contract ---
type VirtualFile {
  path: String
  intent: String
  content_hint: String
}

type ProjectArchitecture {
  dependencies: List<String>
  store_keys: List<String>
  framework: String
}

# --- Module: Ingest Virtual FS ---
module "ingest.virtual_fs" {
  input: "JSON_Config"
  output: "List<VirtualFile>"
  
  ai.task: """
    Parse the input JSON configuration simulating a file system.
    Identify file intents and content hints.
  """
}

# --- Module: Analyze Architecture ---
module "analyze.architecture" {
  input: "List<VirtualFile>"
  output: "ProjectArchitecture"

  ai.task: """
    Analyze the virtual files. 
    1. Extract dependencies from package.json hints.
    2. Identify state keys from store files.
    3. Determine the primary framework (e.g., React, Vue).
  """
}

# --- Module: Generate HAPF Spec ---
module "generate.spec" {
  input: "ProjectArchitecture"
  output: "HAPF_Code"

  ai.task: """
    Generate a valid HAPF v1.0 specification that describes the 
    analyzed software architecture. Define Modules for the components found.
  """
}

# --- Pipeline: Reverse Engineer Repo ---
pipeline "reverse_engineer_repo" {
  steps: [
    ingest.virtual_fs → analyze.architecture → generate.spec
  ]
}`,
    input: `{
  "input_source": "synthetic_archetype",
  "virtual_files": [
    {
      "path": "package.json",
      "intent": "Dependencies",
      "content_hint": "deps: react, vite, bun, framer-motion; scripts: dev, build"
    },
    {
      "path": "vite.config.ts",
      "intent": "Build Config",
      "content_hint": "plugins: [react()], proxy setup, alias: @ -> src"
    },
    {
      "path": "src/store/hapfStore.ts",
      "intent": "State Management",
      "content_hint": "Store holding 'currentCode', 'logs', 'isRunning', 'artifacts'"
    },
    {
      "path": "src/engine/RuntimeCore.ts",
      "intent": "Business Logic",
      "content_hint": "Function parseHapf(code) -> AST; Function executeStep(step)"
    }
  ]
}`
  },
  "self-heal": {
    name: "Auto-Heal & Refactor",
    code: `package "code-evolution-engine" {
  version: "1.0.0"
  doc: "System that monitors a repository, fixes bugs automatically, and improves code quality."
}

type Issue struct {
  type: Enum["RuntimeError", "TestFailure", "CodeSmell"]
  file_path: String
  description: String
}

type Patch struct {
  target_file: String
  diff_content: String
}

# --- Module: Dr. House (Diagnostician) ---
module "audit.diagnostician" {
  contract: {
    input: { source_code: Blob, logs: String? }
    output: HealthReport
  }
  instructions: {
    system_template: "Perform Root Cause Analysis. Identify bugs or anti-patterns."
  }
}

# --- Module: The Strategist (Fixer) ---
module "plan.treatment" {
  contract: {
    input: { source_code: Blob, issue: Issue }
    output: Patch
  }
  instructions: {
    system_template: "Fix the identified issue with minimal impact. Explain WHY."
  }
}

# --- Module: The Auditor (Verifier) ---
module "verify.test_runner" {
  contract: {
    input: { original_code: Blob, patch: Patch }
    output: Bool
  }
  runtime: { tool: "shell_exec" }
}

# --- Pipeline: The Evolution Loop ---
pipeline "auto_heal_loop" {
  
  # 1. Diagnose
  let report = run audit.diagnostician({ 
    source_code: input.content,
    logs: io.read_logs() 
  })
  
  # 2. Check health
  if (report.issues.length == 0) {
    return
  }

  # 3. Heal Loop
  let critical_issue = report.issues[0]

  # Generate Patch
  let patch = run plan.treatment({
    source_code: input.content,
    issue: critical_issue
  })

  # Verify
  let success = run verify.test_runner({
    original_code: input.content,
    patch: patch
  })
}`,
    input: `{
  "file": "math_lib.py",
  "content": "def calc(a, b): return a / b",
  "logs": "ZeroDivisionError: division by zero"
}`
  },
  "sentiment-analysis": {
    name: "Customer Sentiment",
    code: `package "customer-insights" {
  version: "1.2.0"
  doc: "Real-time sentiment analysis pipeline for support tickets."
}

type Ticket struct {
  id: UUID
  text: String
  priority: Enum["LOW", "HIGH", "CRITICAL"]
}

type AnalysisResult struct {
  sentiment_score: Float(-1.0..1.0)
  intent: String
  suggested_action: String
}

module "ingest.ticket_stream" {
  contract: {
    input: Stream<JSON>
    output: Ticket
  }
}

module "ai.sentiment_classifier" {
  contract: {
    input: Ticket
    output: AnalysisResult
  }
  runtime: {
    strategy: "stream"
    model: "gemini-2.5-flash"
  }
  instructions: {
    system_template: """
      Analyze the support ticket text.
      1. Determine sentiment (-1.0 to 1.0).
      2. Classify intent (e.g., Refund, Technical Issue).
      3. Suggest next action.
    """
  }
}

module "crm.update" {
  contract: {
    input: AnalysisResult
    output: Bool
  }
}

pipeline "process_tickets" {
  let stream = run ingest.ticket_stream(input.kafka_topic)
  
  # Process in real-time
  let results = run ai.sentiment_classifier(stream)
  
  if (results.sentiment_score < -0.5) {
    run notify.supervisor(results)
  }
  
  run crm.update(results)
}`,
    input: `{
  "source": "kafka://support-tickets-prod",
  "consumer_group": "ai-processor-v1",
  "batch_size": 100
}`
  },
  "legal-audit": {
    name: "Legal Contract Audit",
    code: `package "legal-compliance" {
  version: "2.1.0"
  doc: "Automated review of vendor contracts for high-risk clauses."
}

type Clause struct {
  text: String
  category: String
  risk_level: Enum["LOW", "MEDIUM", "HIGH"]
}

module "ocr.extract_text" {
  input: Blob(PDF)
  output: String
  runtime: { strategy: "single-shot" }
}

module "legal.risk_analyzer" {
  input: String
  output: List<Clause>
  runtime: { 
    strategy: "map-reduce"
    temperature: 0.0
  }
  instructions: {
    system_template: """
      You are a Senior Legal Counsel.
      Review the contract text. Extract all clauses.
      Flag any clauses regarding 'Indemnification' or 'Unlimited Liability' as HIGH risk.
    """
  }
}

pipeline "vendor_contract_review" {
  let raw_text = run ocr.extract_text(input.document)
  let analysis = run legal.risk_analyzer(raw_text)
  
  if (analysis.any(c => c.risk_level == "HIGH")) {
    run approval.require_human_review(analysis)
  } else {
    run approval.auto_sign(input.document)
  }
}`,
    input: `{
  "document_url": "s3://legal-vault/contracts/2025/vendor_xyz_nda.pdf",
  "policy_version": "2025-Q1"
}`
  }
};

export const INITIAL_HAPF_CODE = PIPELINE_EXAMPLES["reverse-engineer"].code;
export const DEFAULT_INPUT_TEXT = PIPELINE_EXAMPLES["reverse-engineer"].input;