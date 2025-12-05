
import { defineSpec } from './utils';

// ============================================================================
// LEGACY LIFTER (Reverse Engineering)
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
// DOC TELEPORT (Bidirectional Specs)
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
// PROJECT TELEPORT (IO)
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

export const CORE_EXAMPLES = {
  "reverse-engineer": defineSpec("Legacy Lifter (Repo → HAPF)", CODE_LEGACY_LIFTER, INPUT_LEGACY_LIFTER),
  "doc-teleport": defineSpec("Doc Teleport (BRD ↔ HAPF)", CODE_DOC_TELEPORT, INPUT_DOC_TELEPORT),
  "project-teleport": defineSpec("Project Teleport (Git <-> HAPF)", CODE_PROJECT_TELEPORT, INPUT_PROJECT_TELEPORT),
};
