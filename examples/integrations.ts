
import { defineSpec } from './utils';

// ============================================================================
// N8N INTEGRATION (Workflows)
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
// SENTIMENT ANALYSIS (Stream)
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
// LEGAL AUDIT (Compliance)
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
// EDGE COMPUTING (Distributed)
// ============================================================================
const CODE_EDGE_COMPUTE = `
package "edge-fleet-ops" {
  version: "3.0.0"
  doc: "Distributed edge computing pipeline with local caching and mTLS security."
  env: {
    type: "distributed-edge"
    security: "mtls-enforced"
  }
}

type TelemetryData struct {
  sensor_id: String
  temp_c: Float
  vibration_hz: Float
  timestamp: Int
}

module "edge.sensor_ingest" {
  contract: {
    input: Stream<TelemetryData>
    output: TelemetryData
  }
  runtime: {
    locality: "edge-node"
    strategy: "real-time"
  }
}

module "edge.local_filter" {
  contract: {
    input: TelemetryData
    output: TelemetryData?
  }
  runtime: {
    locality: "edge-node"
    cache: "lru-100mb"
  }
  instructions: {
    system_template: "Filter out noise. If vibration < 0.5Hz, discard. Cache recent anomalies locally."
  }
}

module "cloud.aggregator" {
  contract: {
    input: List<TelemetryData>
    output: Bool
  }
  runtime: {
    locality: "cloud-region-us-east"
    security: {
      protocol: "mtls"
      enforce: true
      cert_path: "/etc/certs/edge-client.pem"
      key_path: "/etc/certs/edge-client.key"
      ca_path: "/etc/certs/root-ca.pem"
      cert_rotation: "24h"
    }
  }
}

pipeline "iot_edge_sync" {
  let stream = run edge.sensor_ingest(input.device_id)
  
  # Local Edge Processing (Low Latency)
  let clean_data = run edge.local_filter(stream)
  
  if (clean_data != null) {
    # Secure Sync to Cloud
    run cloud.aggregator([clean_data])
  }
}
`;

const INPUT_EDGE_COMPUTE = {
  device_id: "turbine-x99-sector-7",
  sample_rate_ms: 50
};

export const INTEGRATION_EXAMPLES = {
  "n8n-integration": defineSpec("n8n Integration (Webhook)", CODE_N8N, INPUT_N8N),
  "sentiment-analysis": defineSpec("Customer Sentiment", CODE_SENTIMENT, INPUT_SENTIMENT),
  "legal-audit": defineSpec("Legal Contract Audit", CODE_LEGAL_AUDIT, INPUT_LEGAL_AUDIT),
  "edge-compute": defineSpec("Distributed Edge Compute", CODE_EDGE_COMPUTE, INPUT_EDGE_COMPUTE),
};
