// ============================================================================
// HAPF STUDIO CONSTANTS
// Principles: KISS, DRY, Single Source of Truth
// ============================================================================

/**
 * Helper to enforce structure and handle JSON formatting automatically.
 * @param name The display name of the pipeline.
 * @param code The raw HAPF source code.
 * @param input The raw JavaScript object to be stringified as JSON input.
 */
const defineSpec = (name: string, code: string, input: object) => ({
  name,
  code: code.trim(),
  input: JSON.stringify(input, null, 2)
});

// ============================================================================
// 1. LEGACY LIFTER (Reverse Engineering)
// ============================================================================
const CODE_LEGACY_LIFTER = `
package "legacy-lifter" {
  version: "1.0.0"
  standard: "HAPF-Core-v1.0"
  doc: "Reverse-engineers codebases into declarative HAPF specs."
  
  env: {
    target_languages: ["python", "typescript", "go", "java"]
    ignore_patterns: [".git", "node_modules", "__pycache__", "*.lock"]
  }
}

# --- Meta-Model Types ---
type SourceFile struct {
  path: String
  language: Enum["python", "js", "go", "other"]
  content: Blob
}

type DiscoveredModule struct {
  suggested_name: String
  intent_summary: String
  inputs: List<DataField>
  outputs: List<DataField>
  dependencies: List<String>
  complexity_score: Float
}

type SystemBlueprint struct {
  modules: List<DiscoveredModule>
  pipelines: List<String>
  types: List<String>
}

# --- Module 1: Repo Scanner ---
module "scan.git_walker" {
  contract: {
    input: String            # Path or Git URL
    output: List<SourceFile> # Stream of files
  }

  runtime: {
    strategy: "stream"       # Read one by one
    batch_size: 1            # Granularity
  }

  instructions: {
    system_template: "Traverse directory. Ignore binary/lock files. Pass source code."
  }
}

# --- Module 2: Semantic Lifter ---
module "analyze.semantic_lifter" {
  contract: {
    input: SourceFile
    output: DiscoveredModule?
  }

  runtime: {
    strategy: "map-reduce"   # Parallel analysis
    temperature: 0.0         # Strict
  }

  instructions: {
    system_template: "Analyze source code. Identify intent, inputs, outputs, and dependencies."
  }
}

# --- Module 3: System Linker ---
module "arch.linker" {
  contract: {
    input: List<DiscoveredModule>
    output: SystemBlueprint
  }

  instructions: {
    system_template: "Map dependencies. Create logical pipelines. Group related modules."
  }
}

# --- Module 4: HAPF Generator ---
module "codegen.hapf_writer" {
  contract: {
    input: SystemBlueprint
    output: String
  }

  runtime: {
    format: "text"
  }

  instructions: {
    system_template: "Convert System Blueprint into valid HAPF v1.0 specification code."
  }
}

# --- Pipeline ---
pipeline "reverse_engineer_repo" {
  
  # 1. Scan
  let files = run scan.git_walker(input.repo_path)
  
  # 2. Analyze (Map)
  let modules = run analyze.semantic_lifter(files)
  
  # 3. Link (Reduce)
  let blueprint = run arch.linker(modules)
  
  # 4. Generate
  let hapf_code = run codegen.hapf_writer(blueprint)
  
  io.write_file("reconstructed_spec.hapf", hapf_code)
}
`;

const INPUT_LEGACY_LIFTER = {
  repo_path: "./legacy-payment-system",
  files: [
    { path: "src/payment.py", content: "def process(req): ..." },
    { path: "src/utils.py", content: "def log(msg): ..." }
  ]
};

// ============================================================================
// 2. DOC TELEPORT (Bidirectional Specs)
// ============================================================================
const CODE_DOC_TELEPORT = `
package "doc-teleport" {
  version: "1.0.0"
  doc: "Bidirectional transport between Business Orbitals (BRD/PRD) and Technical Orbitals (HAPF/TDD)."
}

# --- Types ---
type Requirement struct {
  id: String
  priority: Enum["P0", "P1", "P2"]
  description: String
  acceptance_criteria: List<String>
}

# --- Modules ---

module "orbitals.brd_parser" {
  contract: { input: String, output: List<Requirement> }
  instructions: { 
    system_template: "Extract structured requirements from unstructured Business Requirement Document (BRD) text." 
  }
}

module "orbitals.hapf_architect" {
  contract: { input: List<Requirement>, output: String } # Returns HAPF Source Code
  runtime: { model: "gemini-2.5-pro-reasoning" }
  instructions: { 
    system_template: """
      Act as a System Architect.
      Generate a full HAPF v1.0 specification that implements the provided requirements.
      Define necessary types, modules, and pipelines.
    """ 
  }
}

module "orbitals.tdd_generator" {
  contract: { input: String, output: String } # Input HAPF, Output Markdown TDD
  instructions: { 
    system_template: """
      Write a Technical Design Document (TDD) based on the provided HAPF specification.
      Include sections for: Data Schema, API Contracts, and Execution Flow.
      Format as Markdown.
    """ 
  }
}

# --- Pipelines ---

pipeline "brd_to_hapf_spec" {
  doc: "Transport: Business Orbital -> Code Orbital"
  
  # 1. Parse BRD
  let reqs = run orbitals.brd_parser(input.document_text)
  
  # 2. Architect Solution
  let spec = run orbitals.hapf_architect(reqs)
  
  io.write_output("generated_architecture.hapf", spec)
}

pipeline "hapf_to_tdd_doc" {
  doc: "Transport: Code Orbital -> Technical Orbital"
  
  # 1. Generate Docs
  let tdd = run orbitals.tdd_generator(input.hapf_code)
  
  io.write_output("technical_design_doc.md", tdd)
}
`;

const INPUT_DOC_TELEPORT = {
  document_text: "## Business Requirement: Loyalty Points System\n\nWe need a system where users earn points for purchases.\n- For every $1 spent, user gets 10 points.\n- Points can be redeemed for discounts (100 points = $1).\n- P0: Users must have a 'Tier' (Gold, Silver, Bronze) based on total spend.\n- P1: System must send an email notification when a user upgrades a tier.\n- P2: Admin dashboard to view top spenders.",
  hapf_code: null
};

// ============================================================================
// 3. N8N INTEGRATION (Workflows)
// ============================================================================
const CODE_N8N = `
package "n8n-automation" {
  version: "1.0.0"
  doc: "A HAPF workflow designed to be compiled into an n8n JSON workflow."
}

# --- Data Types ---
type WebhookPayload struct {
  user_email: String
  message: String
  timestamp: Int
}

type SentimentResult struct {
  score: Float
  label: Enum["POSITIVE", "NEGATIVE", "NEUTRAL"]
}

# --- Modules ---

module "ai.sentiment_analysis" {
  contract: {
    input: String
    output: SentimentResult
  }
  # This module will be compiled to an n8n 'AI Agent' or 'HTTP Request' node
  runtime: { 
    tool: "n8n_ai_agent"
    model: "gemini-pro"
  }
  instructions: {
    system_template: "Analyze the sentiment of the input text."
  }
}

module "slack.notify" {
  contract: {
    input: { channel: String, text: String }
    output: Bool
  }
  # This maps to the n8n 'Slack' node
  runtime: { tool: "n8n_slack" }
}

module "crm.add_note" {
  contract: {
    input: { email: String, note: String }
    output: Bool
  }
  runtime: { tool: "n8n_http_request" }
}

# --- Main Workflow ---
pipeline "customer_feedback_handler" {
  
  # 1. Trigger: Webhook
  # In n8n, this becomes the Start Node (Webhook)
  let payload = input.webhook_json
  
  # 2. Process: AI Analysis
  let sentiment = run ai.sentiment_analysis(payload.message)
  
  # 3. Logic: Branching
  if (sentiment.score < -0.5) {
    # Negative Feedback -> Alert Team
    run slack.notify({
      channel: "#customer-alerts",
      text: "🚨 Negative Feedback from " + payload.user_email + ": " + payload.message
    })
    
    # Add note to CRM
    run crm.add_note({
      email: payload.user_email,
      note: "Urgent: Customer reported negative experience."
    })
    
  } else {
    # Positive/Neutral -> Just log
    run slack.notify({
      channel: "#feedback-feed",
      text: "ℹ️ New feedback: " + payload.message
    })
  }
}
`;

const INPUT_N8N = {
  webhook_json: {
    user_email: "alice@example.com",
    message: "I am extremely frustrated with the downtime!",
    timestamp: 1715431200
  }
};

// ============================================================================
// 4. DEV AGENT (Autonomous)
// ============================================================================
const CODE_DEV_AGENT = `
package "autonomous-developer" {
  version: "2.1.0"
  doc: "An autonomous agent that implements features from Jira tickets, runs tests, and iterates."
}

type Ticket struct {
  id: String
  title: String
  requirements: List<String>
}

type CodeResult struct {
  files: Map<String, String>
  test_status: Enum["PASS", "FAIL"]
  logs: String
}

# --- Modules ---

module "kanban.fetch_ticket" {
  contract: {
    input: String
    output: Ticket
  }
  runtime: { tool: "jira_api" }
}

module "agent.architect" {
  contract: {
    input: Ticket
    output: String # Implementation Plan
  }
  instructions: {
    system_template: "You are a Principal Engineer. Create a step-by-step implementation plan for the requirements."
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
    input: { ticket: String, files: Map<String, String> }
    output: String # PR URL
  }
}

# --- Agentic Pipeline ---
pipeline "feature_implementation_loop" {
  let ticket_id = input.ticket_id
  let ticket = run kanban.fetch_ticket(ticket_id)
  
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
        ticket: ticket.id,
        files: source_files
      })
      io.write_output("pull_request", pr_url)
      return
    }
    
    # Failure -> Loop back with logs
    feedback = "Tests Failed: " + result.logs
  }
  
  io.write_output("failure_report", "Unable to implement feature after 5 attempts.")
}
`;

const INPUT_DEV_AGENT = {
  ticket_id: "PROJ-1024",
  context: "Implement a distributed rate-limiter middleware for Express.js using Redis Lua scripts."
};

// ============================================================================
// 5. PROJECT TELEPORT (IO)
// ============================================================================
const CODE_PROJECT_TELEPORT = `
package "project-teleport" {
  version: "2.0.0"
  doc: "Compiles source code into HAPF Bundles and reconstructs them."
}

# --- Data Structures ---
type FileEntry struct {
  path: String
  permissions: String # "0644"
  encoding: Enum["utf-8", "base64"]
  content: Blob
  hash: String # SHA-256
}

type HapfBundle struct {
  id: UUID
  timestamp: Date
  source_origin: String
  total_files: Int
  manifest: List<FileEntry>
  compression_ratio: Float
}

# --- Modules ---

module "git.cloner" {
  contract: {
    input: { url: String, branch: String? }
    output: List<FileEntry>
  }
  runtime: { tool: "git_cli" }
}

module "archiver.compressor" {
  contract: {
    input: List<FileEntry>
    output: HapfBundle
  }
  instructions: {
    system_template: """
      Pack files into a HAPF Bundle.
      1. Minify code where safe.
      2. Deduplicate text blocks.
      3. Generate integrity hashes.
    """
  }
}

module "archiver.reconstructor" {
  contract: {
    input: HapfBundle
    output: List<FileEntry>
  }
  instructions: {
    system_template: """
      Hydrate source code from Bundle.
      Restores original directory structure and file permissions.
    """
  }
}

# --- Pipeline 1: Compile to Bundle (Pack) ---
pipeline "pack_repository" {
  if (input.mode == "pack") {
    let files = run git.cloner({ 
      url: input.repo_url 
    })
    
    let bundle = run archiver.compressor(files)
    
    io.write_output("project_snapshot.hapf_bundle", bundle)
  }
}

# --- Pipeline 2: Decompile to Source (Unpack) ---
pipeline "reconstruct_repository" {
  if (input.mode == "unpack") {
    let bundle = input.bundle_data
    
    let restored_files = run archiver.reconstructor(bundle)
    
    # Write to local disk (simulated)
    io.write_fs(restored_files)
  }
}
`;

const INPUT_PROJECT_TELEPORT = {
  mode: "pack",
  repo_url: "https://github.com/hapf-lang/core-runtime",
  bundle_data: null
};

// ============================================================================
// 6. DEEP RESEARCH (Recursion)
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
// 7. QUANTUM SYNTHESIS (Generative Art)
// ============================================================================
const CODE_QUANTUM_SYNTHESIS = `
package "ether-arts" {
  version: "0.1.0-alpha"
  doc: "Generative pipeline for Quantum/Etheric artifacts."
}

type QuantumField struct {
  id: UUID
  coherence: Float
  entropy: Float
  particles: List<Particle>
}

type Particle struct {
  id: String
  x: Float   # 0-100
  y: Float   # 0-100
  size: Float
  energy: Float # 0.0 - 1.0 (Opacity/Glow)
  spin: Enum["UP", "DOWN", "STRANGE", "CHARM"]
  color: String # Hex
}

module "quantum.vacuum_fluctuation" {
  contract: {
    input: { seed: String, complexity: Float }
    output: QuantumField
  }
  runtime: {
    model: "mistral-large" # High creativity
    temperature: 0.9
  }
  instructions: {
    system_template: """
      Generate a STABLE quantum field from vacuum fluctuations.
      Create 15-30 particles with diverse positions (0-100), colors (neon palettes), and spins.
      Ensure high coherence (>0.8).
    """
  }
}

module "ether.harmonizer" {
  contract: {
    input: QuantumField
    output: QuantumField
  }
  runtime: {
    model: "cohere-command-r-plus" # High reasoning
  }
  instructions: {
    system_template: "Harmonize the field. Align spins to create visual patterns. Increase energy levels."
  }
}

pipeline "synthesize_ether_art" {
  let seed = input.seed
  
  # 1. Generate Raw Field
  let raw_field = run quantum.vacuum_fluctuation({ 
    seed: seed, 
    complexity: 0.9 
  })
  
  # 2. Harmonize & Stabilize
  let art_piece = run ether.harmonizer(raw_field)
  
  io.write_output("quantum_masterpiece", art_piece)
}
`;

const INPUT_QUANTUM_SYNTHESIS = {
  seed: "Nebula-X-77",
  complexity: 0.85
};

// ============================================================================
// 8. BIBLIONEXUS (Architecture)
// ============================================================================
const CODE_BIBLIONEXUS = `
package "biblionexus-spec" {
  version: "1.0.0"
  standard: "HAPF-Core-v1.0"
  doc: "Reconstructed HAPF specification for BiblioNexus project."
  env: {
    target_languages: ["python", "typescript", "go", "java"]
    ignore_patterns: [".git", "node_modules", "__pycache__", "*.lock"]
  }
}

type String String
type Object Object
type List_String List<String>
type Map_String_String Map<String, String>
type ReactNode Blob # Represents a React UI element
type DOMElement Blob # Represents a DOM element for mounting

module "config.ProjectConfiguration" {
  contract: {
    output: {
      dependencies: List<String>
      scripts: Map<String, String>
    }
  }
  doc: "Manages project dependencies, scripts, and basic metadata. Integrates AI model clients and UI libraries."
}

module "config.TypeScriptConfiguration" {
  contract: {
    output: {
      compilerOptions: Object
    }
  }
  doc: "Defines TypeScript compiler options for strict type checking and module resolution."
}

module "config.ViteBuildConfiguration" {
  contract: {
    input: { mode: String }
    output: { config: Object }
  }
  doc: "Configures the Vite development server and build process, including environment variable loading and React plugin integration."
  dependencies: ["@vitejs/plugin-react", "react"]
}

module "app.RootApplication" {
  contract: {
    output: { ui_root: ReactNode }
  }
  doc: "The main application entry point, responsible for overall layout and potentially routing or state management."
  dependencies: ["react", "ui.AnalysisDashboardComponent", "ui.ApologeticsPanelComponent", "ai.ChatBotComponent", "ai.ImageGeneratorComponent", "ui.ParallelsGuideComponent", "ui.PeerReviewPanelComponent", "ai.TheCouncilComponent"]
}

module "ui.AnalysisDashboardComponent" {
  contract: {
    input: { analysisData: Object }
    output: { dashboardUI: ReactNode }
  }
  doc: "A core UI component displaying various analytical insights and integrating multiple visualization sub-components."
  dependencies: ["react", "vis.BiblicalAlgorithmVisualization", "vis.BiblicalMapVisualization", "vis.BioGeneticAnalysisVisualization", "vis.ChronoMapVisualization", "vis.DistributionChartVisualization", "vis.EtymologicalPrismVisualization", "vis.NetworkGraphVisualization", "vis.PatternClusterVisualization", "vis.PropheticArcsVisualization", "vis.ScriptureDNAVisualization", "vis.ThemeChartVisualization", "vis.TimelineChartVisualization"]
}

module "ui.ApologeticsPanelComponent" {
  contract: {
    input: { theologicalData: Object }
    output: { apologeticsUI: ReactNode }
  }
  doc: "Provides an interface for exploring apologetic arguments and theological discussions."
  dependencies: ["react"]
}

module "ai.ChatBotComponent" {
  contract: {
    input: { query: String }
    output: { chatUI: ReactNode, response: String }
  }
  doc: "Implements an interactive chatbot interface for user queries and AI responses."
  dependencies: ["react", "@google/genai", "@mistralai/mistralai", "cohere-ai"]
}

module "ai.ImageGeneratorComponent" {
  contract: {
    input: { prompt: String }
    output: { imageUI: ReactNode, imageUrl: String }
  }
  doc: "Facilitates generating images based on textual prompts using AI models."
  dependencies: ["react", "@google/genai"]
}

module "ui.ParallelsGuideComponent" {
  contract: {
    input: { passageId: String }
    output: { parallelsUI: ReactNode }
  }
  doc: "Displays parallel passages or thematic connections across different texts."
  dependencies: ["react"]
}

module "ui.PeerReviewPanelComponent" {
  contract: {
    input: { reviewData: Object }
    output: { reviewUI: ReactNode }
  }
  doc: "Allows users to submit or review analyses, fostering community collaboration."
  dependencies: ["react"]
}

module "ai.TheCouncilComponent" {
  contract: {
    input: { discussionTopic: String }
    output: { councilUI: ReactNode }
  }
  doc: "A discussion-oriented component, possibly for multi-agent AI debates or user collaboration."
  dependencies: ["react", "@mistralai/mistralai"]
}

module "vis.BiblicalAlgorithmVisualization" {
  contract: {
    input: { algorithmData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Visualizes complex biblical algorithms or logical structures."
  dependencies: ["react", "d3"]
}

module "vis.BiblicalMapVisualization" {
  contract: {
    input: { mapData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Renders geographical maps relevant to biblical events and locations."
  dependencies: ["react", "leaflet"]
}

module "vis.BioGeneticAnalysisVisualization" {
  contract: {
    input: { geneticData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Visualizes bio-theological sequencing and genetic metaphors of scripture."
  dependencies: ["react", "d3"]
}

module "vis.ChronoMapVisualization" {
  contract: {
    input: { timelineData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Visualizes chronological relationships and timelines of biblical events."
  dependencies: ["react", "d3"]
}

module "vis.DistributionChartVisualization" {
  contract: {
    input: { chartData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Displays data distributions, such as word frequencies or thematic prevalence."
  dependencies: ["react", "recharts"]
}

module "vis.EtymologicalPrismVisualization" {
  contract: {
    input: { wordData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Visualizes the etymological roots and semantic spectrum of words."
  dependencies: ["react", "d3"]
}

module "vis.NetworkGraphVisualization" {
  contract: {
    input: { graphData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Renders network graphs showing connections between concepts, characters, or verses."
  dependencies: ["react", "d3"]
}

module "vis.PatternClusterVisualization" {
  contract: {
    input: { clusterData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Identifies and visualizes recurring patterns or clusters in biblical texts."
  dependencies: ["react", "d3"]
}

module "vis.PropheticArcsVisualization" {
  contract: {
    input: { prophecyData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Visualizes prophetic timelines and their fulfillment arcs."
  dependencies: ["react", "d3"]
}

module "vis.ScriptureDNAVisualization" {
  contract: {
    input: { dnaData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Illustrates the 'genetic code' of scripture, representing core theological attributes."
  dependencies: ["react", "d3"]
}

module "vis.ThemeChartVisualization" {
  contract: {
    input: { themeData: Object }
    output: { visualization: ReactNode }
  }
  doc: "Charts the prevalence and evolution of themes across the biblical canon."
  dependencies: ["react", "recharts"]
}

module "vis.TimelineChartVisualization" {
  contract: {
    input: { timelineEvents: Object }
    output: { visualization: ReactNode }
  }
  doc: "Presents chronological timelines of events, persons, or books."
  dependencies: ["react", "recharts"]
}

module "app.ApplicationEntryPoint" {
  contract: {
    output: { domMount: DOMElement }
  }
  doc: "The primary entry point for the client-side React application, responsible for mounting the root component."
  dependencies: ["react-dom", "app.RootApplication"]
}

pipeline "ApplicationStartup" {
  doc: "Initializes and renders the main application UI."
  run app.ApplicationEntryPoint()
}

pipeline "DashboardRendering" {
  doc: "Processes data and renders the analytical dashboard with various visualizations."
  let analysisInput = input.analysis_data
  run app.RootApplication()
  run ui.AnalysisDashboardComponent(analysisInput)
}

pipeline "AI_Chat_Interaction" {
  doc: "Handles user chat queries and returns AI-generated responses."
  let userQuery = input.user_query
  let chatResponse = run ai.ChatBotComponent(query: userQuery)
  io.write_output(output_name: "chat_response", content: chatResponse.response)
}

pipeline "AI_Image_Generation" {
  doc: "Takes a text prompt and generates an image using AI."
  let imagePrompt = input.image_prompt
  let imageUrl = run ai.ImageGeneratorComponent(prompt: imagePrompt)
  io.write_output(output_name: "generated_image_url", content: imageUrl.imageUrl)
}

pipeline "Collaborative_Review_Process" {
  doc: "Manages the submission and review of user-generated analyses."
  let reviewData = input.review_submission
  run ui.PeerReviewPanelComponent(reviewData: reviewData)
}

pipeline "Theological_Debate_Simulation" {
  doc: "Orchestrates a multi-agent AI debate or user discussion on a theological topic."
  let discussionTopic = input.topic
  run ai.TheCouncilComponent(discussionTopic: discussionTopic)
}
`;

const INPUT_BIBLIONEXUS = {
  analysis_data: { 
    dataset: "Psalms", 
    metrics: ["sentiment", "density", "etymology"] 
  },
  user_query: "Explain the concept of Logos in John 1.",
  image_prompt: "Moses parting the Red Sea, cinematic lighting, realistic style",
  review_submission: { 
    author: "User123", 
    content_id: "Analysis-99",
    comments: "Excellent visualization of the data."
  },
  topic: "Free Will vs Predestination in Pauline Epistles"
};

// ============================================================================
// 9. SELF HEAL (Code Repair)
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

// ============================================================================
// 10. SENTIMENT ANALYSIS (Stream)
// ============================================================================
const CODE_SENTIMENT = `
package "customer-insights" {
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
}
`;

const INPUT_SENTIMENT = {
  source: "kafka://support-tickets-prod",
  consumer_group: "ai-processor-v1",
  batch_size: 100
};

// ============================================================================
// 11. LEGAL AUDIT (Compliance)
// ============================================================================
const CODE_LEGAL_AUDIT = `
package "legal-compliance" {
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
}
`;

const INPUT_LEGAL_AUDIT = {
  document_url: "s3://legal-vault/contracts/2025/vendor_xyz_nda.pdf",
  policy_version: "2025-Q1"
};

// ============================================================================
// EXPORT: SINGLE SOURCE OF TRUTH
// ============================================================================

export const PIPELINE_EXAMPLES: Record<string, { name: string; code: string; input: string }> = {
  "reverse-engineer":   defineSpec("Legacy Lifter (Repo → HAPF)", CODE_LEGACY_LIFTER, INPUT_LEGACY_LIFTER),
  "doc-teleport":       defineSpec("Doc Teleport (BRD ↔ HAPF)", CODE_DOC_TELEPORT, INPUT_DOC_TELEPORT),
  "n8n-integration":    defineSpec("n8n Integration (Webhook)", CODE_N8N, INPUT_N8N),
  "dev-agent":          defineSpec("Autonomous Dev Agent (AI)", CODE_DEV_AGENT, INPUT_DEV_AGENT),
  "project-teleport":   defineSpec("Project Teleport (Git <-> HAPF)", CODE_PROJECT_TELEPORT, INPUT_PROJECT_TELEPORT),
  "deep-research":      defineSpec("Deep Research (RFC Agent)", CODE_DEEP_RESEARCH, INPUT_DEEP_RESEARCH),
  "quantum-synthesis":  defineSpec("Quantum Ether Synthesis", CODE_QUANTUM_SYNTHESIS, INPUT_QUANTUM_SYNTHESIS),
  "biblionexus":        defineSpec("BiblioNexus (Complex Arch)", CODE_BIBLIONEXUS, INPUT_BIBLIONEXUS),
  "self-heal":          defineSpec("Auto-Heal & Refactor", CODE_SELF_HEAL, INPUT_SELF_HEAL),
  "sentiment-analysis": defineSpec("Customer Sentiment", CODE_SENTIMENT, INPUT_SENTIMENT),
  "legal-audit":        defineSpec("Legal Contract Audit", CODE_LEGAL_AUDIT, INPUT_LEGAL_AUDIT),
};

export const INITIAL_HAPF_CODE = PIPELINE_EXAMPLES["reverse-engineer"].code;
export const DEFAULT_INPUT_TEXT = PIPELINE_EXAMPLES["reverse-engineer"].input;
