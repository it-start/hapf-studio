import React from 'react';

export const INITIAL_HAPF_CODE = `package "chaos-writer-pro" {
  version: "1.0.0"
  standard: "HAPF-Core-v1.0"
  
  env: {
    model: "gemini-2.5-flash"
    determinism: "strict"
  }
}

type Insight struct {
  topic: Enum["Tech", "Life"]
  importance: Int(1..10)
}

module "ingest.thought_extractor" {
  contract: { input: String, output: List<Insight> }
  runtime: { strategy: "stream", concurrency: 3 }
  instructions: {
    system: "Extract valuable insights from noise."
  }
}

module "plan.architect" {
  contract: { input: List<Insight>, output: Outline }
  runtime: { strategy: "single-shot" }
}

module "write.section_expander" {
  contract: { input: List<SectionPlan>, output: List<String> }
  runtime: { strategy: "map-reduce" }
}

pipeline "chaos_to_article" {
  let raw = io.read("brain_dump.txt")
  let insights = run ingest.thought_extractor(raw)
  let outline = run plan.architect(insights)
  let chunks = run write.section_expander(outline)
  let full = util.join(chunks)
  run qa.critic(full)
}`;

export const DEFAULT_INPUT_TEXT = `Короче, HAPF это круто, потому что JSON schema рулит. Старые промпты — это прошлый век. 
Надо сказать про Map-Reduce, типа как мы большие файлы жуем. 
И еще про безопасность, типа XML теги. 
Ну и пример кода дай.
Gemini API 2.5 Flash is incredibly fast for this.
Strict typing prevents hallucinations.`;
