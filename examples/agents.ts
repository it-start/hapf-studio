
import { defineSpec } from './utils';

// ============================================================================
// DEV AGENT (Autonomous)
// ============================================================================
const CODE_DEV_AGENT = `
package "autonomous-developer-github" {
  version: "2.2.0"
  doc: "An autonomous agent that manages GitHub Issues (CRUD) and implements features."
}

type GitHubIssue struct {
  number: Int
  title: String
  body: String
  state: Enum["open", "closed"]
  labels: List<String>
}

type CodeResult struct {
  files: Map<String, String>
  test_status: Enum["PASS", "FAIL"]
  logs: String
}

# --- GitHub CRUD Modules ---

module "github.issues.create" {
  contract: {
    input: { title: String, body: String, labels: List<String> }
    output: GitHubIssue
  }
  runtime: { tool: "github_api", scope: "repo" }
  instructions: { system_template: "Create a new issue in the repository." }
}

module "github.issues.get" {
  contract: {
    input: Int # Issue Number
    output: GitHubIssue
  }
  runtime: { tool: "github_api", scope: "repo" }
}

module "github.issues.update" {
  contract: {
    input: { number: Int, body: String?, state: String?, labels: List<String>? }
    output: GitHubIssue
  }
  runtime: { tool: "github_api", scope: "repo" }
  instructions: { system_template: "Update issue details or add comments." }
}

module "github.issues.delete" {
  contract: {
    input: Int # Issue Number
    output: Bool
  }
  doc: "Soft delete by closing and locking the issue."
  runtime: { tool: "github_api", scope: "admin" }
}

# --- AI Worker Modules ---

module "agent.architect" {
  contract: {
    input: GitHubIssue
    output: String # Implementation Plan
  }
  instructions: {
    system_template: "You are a Principal Engineer. Read the issue body. Create a step-by-step implementation plan."
  }
}

module "agent.coder" {
  contract: {
    input: { plan: String, feedback: String? }
    output: Map<String, String> # File content
  }
  runtime: { model: "gemini-2.5-pro-coder" }
  instructions: {
    system_template: "You are a Senior Developer. Write Clean Code. If feedback is present, fix the errors."
  }
}

module "env.sandbox_test" {
  contract: {
    input: Map<String, String>
    output: CodeResult
  }
  runtime: { tool: "docker_sandbox" }
  instructions: {
    system_template: "Mount files. Run 'npm test'. Return logs and status."
  }
}

module "git.create_pr" {
  contract: {
    input: { issue_number: Int, files: Map<String, String> }
    output: String # PR URL
  }
}

# --- Agentic Pipeline ---
pipeline "feature_implementation_loop" {
  let issue_number = input.issue_number
  
  # READ: Fetch the ticket
  let ticket = run github.issues.get(issue_number)
  
  # 1. Plan
  let plan = run agent.architect(ticket)
  
  let feedback = null
  let attempts = 0
  
  # 2. Code-Test-Fix Loop
  loop (attempts < 5) {
    attempts = attempts + 1
    
    # Write Code
    let source_files = run agent.coder({
      plan: plan,
      feedback: feedback
    })
    
    # Run Tests
    let result = run env.sandbox_test(source_files)
    
    if (result.test_status == "PASS") {
      # Success!
      let pr_url = run git.create_pr({
        issue_number: ticket.number,
        files: source_files
      })
      
      # UPDATE: Comment on the issue with PR link
      run github.issues.update({
        number: ticket.number,
        body: "✅ Feature implemented. PR created: " + pr_url
      })
      
      io.write_output("pull_request", pr_url)
      return
    }
    
    # Failure -> Loop back with logs
    feedback = "Tests Failed: " + result.logs
  }
  
  # UPDATE: Report failure on ticket
  run github.issues.update({
    number: ticket.number,
    body: "❌ Failed to implement after 5 attempts. See logs."
  })
}
`;

const INPUT_DEV_AGENT = {
  issue_number: 42,
  context: "Repository: hapf-lang/core"
};

// ============================================================================
// DEEP RESEARCH (Recursion)
// ============================================================================
const CODE_DEEP_RESEARCH = `
package "hapf-research-system" {
  version: "1.0.0"
  doc: "Autonomous agent for researching and evolving the HAPF Runtime Specification."
}

# --- Configuration ---
# depth: 3 (Standard), 5 (Deep), 7 (Exhaustive)

type Insight struct {
  source: String
  finding: String
  confidence: Float
}

module "research.planner" {
  contract: {
    input: { topic: String, iteration: Int }
    output: { sub_questions: List<String> }
  }
  runtime: { model: "gemini-2.5-pro-reasoning" }
  instructions: {
    system_template: "Generate targeted research questions for the HAPF Runtime based on current iteration."
  }
}

module "research.web_oracle" {
  contract: {
    input: { queries: List<String> }
    output: List<Insight>
  }
  runtime: { tool: "google_search" }
}

module "research.critic" {
  contract: {
    input: { insights: List<Insight> }
    output: { refined_insights: List<Insight>, gaps: List<String> }
  }
  runtime: { model: "gemini-2.5-pro-reasoning" }
  instructions: {
    system_template: "Critique findings. Identify contradictions or missing data in the runtime spec."
  }
}

module "research.synthesizer" {
  contract: {
    input: { all_insights: List<Insight> }
    output: String # Markdown Report
  }
  runtime: { model: "gemini-2.5-flash" }
}

pipeline "iterative_rfc_research" {
  let depth = input.depth # 3, 5, or 7
  let topic = input.topic
  let knowledge_base = []
  
  let i = 0

  # Research Loop
  loop (i < depth) {
    i = i + 1
    
    # 1. Plan
    let questions = run research.planner({ 
      topic: topic, 
      iteration: i 
    })

    # 2. Execute
    let raw_data = run research.web_oracle(questions.sub_questions)

    # 3. Critique
    let result = run research.critic(raw_data)

    knowledge_base.push(result.refined_insights)
    
    # Adaptive Refinement
    if (result.gaps.length > 0) {
       topic = "Investigate gaps: " + result.gaps.join(", ")
    }
  }

  # Final Report
  let rfc_draft = run research.synthesizer({
    all_insights: knowledge_base
  })
  
  io.write_output("HAPF_Runtime_RFC_Draft.md", rfc_draft)
}
`;

const INPUT_DEEP_RESEARCH = {
  topic: "Optimizing HAPF Runtime for Distributed Edge Computing",
  depth: 3
};

// ============================================================================
// SELF HEAL (Code Repair)
// ============================================================================
const CODE_SELF_HEAL = `
package "code-evolution-engine" {
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
  runtime: { 
    tool: "shell_exec"
    command: "apply_patch && run_tests" 
  }
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
}
`;

const INPUT_SELF_HEAL = {
  file: "math_lib.py",
  content: "def calc(a, b): return a / b",
  logs: "ZeroDivisionError: division by zero"
};

export const AGENT_EXAMPLES = {
  "dev-agent": defineSpec("Autonomous Dev Agent (AI)", CODE_DEV_AGENT, INPUT_DEV_AGENT),
  "deep-research": defineSpec("Deep Research (RFC Agent)", CODE_DEEP_RESEARCH, INPUT_DEEP_RESEARCH),
  "self-heal": defineSpec("Auto-Heal & Refactor", CODE_SELF_HEAL, INPUT_SELF_HEAL),
};
