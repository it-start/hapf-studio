import React from 'react';

export const PIPELINE_EXAMPLES: Record<string, { name: string; code: string; input: string }> = {
  "reverse-engineer": {
    name: "Legacy Lifter (Repo → HAPF)",
    code: `package "legacy-lifter" {
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
}`,
    input: `{
  "repo_path": "./legacy-payment-system",
  "files": [
    { "path": "src/payment.py", "content": "def process(req): ..." },
    { "path": "src/utils.py", "content": "def log(msg): ..." }
  ]
}`
  },
  "project-teleport": {
    name: "Project Teleport (Git <-> HAPF)",
    code: `package "project-teleport" {
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
}`,
    input: `{
  "mode": "pack",
  "repo_url": "https://github.com/hapf-lang/core-runtime",
  "bundle_data": null
}`
  },
  "deep-research": {
    name: "Deep Research (RFC Agent)",
    code: `package "hapf-research-system" {
  version: "0.9.0"
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
  instructions: {
    system_template: "Critique findings. Identify contradictions or missing data in the runtime spec."
  }
}

module "research.synthesizer" {
  contract: {
    input: { all_insights: List<Insight> }
    output: String # Markdown Report
  }
}

pipeline "iterative_rfc_research" {
  let depth = input.depth # 3, 5, or 7
  let topic = input.topic
  let knowledge_base = []

  # Research Loop
  loop (i < depth) {
    
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
}`,
    input: `{
  "topic": "Optimizing HAPF Runtime for Distributed Edge Computing",
  "depth": 3
}`
  },
  "quantum-synthesis": {
    name: "Quantum Ether Synthesis",
    code: `package "ether-arts" {
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
}`,
    input: `{
  "seed": "Nebula-X-77",
  "complexity": 0.85
}`
  },
  "biblionexus": {
    name: "BiblioNexus (Complex Arch)",
    code: `package "biblionexus-spec" {
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
}`,
    input: `{
  "analysis_data": { 
    "dataset": "Psalms", 
    "metrics": ["sentiment", "density", "etymology"] 
  },
  "user_query": "Explain the concept of Logos in John 1.",
  "image_prompt": "Moses parting the Red Sea, cinematic lighting, realistic style",
  "review_submission": { 
    "author": "User123", 
    "content_id": "Analysis-99",
    "comments": "Excellent visualization of the data."
  },
  "topic": "Free Will vs Predestination in Pauline Epistles"
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