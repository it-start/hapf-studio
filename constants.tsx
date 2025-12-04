import React from 'react';

export const INITIAL_HAPF_CODE = `package "finance-insight-generator" {
  version: "1.0.0"
  doc: "Generates financial insights from transaction data."
}

# --- Data Contract for Transactions ---
type Transaction {
  date: ISO8601
  description: String
  amount: Decimal
  currency: String
}

# --- Module: Ingest CSV ---
module "ingest.csv" {
  input: "CSVData"
  output: "List<Transaction>"

  ai.task: """
    Parse the CSV data and extract transactions. Ensure dates are ISO8601.
  """
  validation: """
    Each transaction must have a date, description, amount, and currency.
  """
  resources: { max_tokens: 2000 }
}

# --- Module: Categorize Transactions ---
module "categorize.transactions" {
  input: "List<Transaction>"
  output: "List<CategorizedTransaction>"

  ai.task: """
    Categorize each transaction into one of the following categories: 
    Food, Transport, Utilities, Entertainment, Other.
  """
  validation: """
    Each transaction must have exactly one category.
  """
}

type CategorizedTransaction {
  transaction: Transaction
  category: Enum["Food", "Transport", "Utilities", "Entertainment", "Other"]
}

# --- Module: Analyze Spending Patterns ---
module "analyze.spending" {
  input: "List<CategorizedTransaction>"
  output: "Insights"

  ai.task: """
    Calculate total spending per category. Identify the largest spending categories.
  """
}

type Insights {
  total_spending: Decimal
  spending_per_category: Map<String, Decimal>
  largest_category: String
}

# --- Module: Generate Summary ---
module "generate.summary" {
  input: "Insights"
  output: "SummaryText"

  ai.task: """
    Generate a concise summary of the financial insights. Keep it under 100 words.
  """
}

type SummaryText {
  text: String
}

# --- Pipeline: Financial Insight Generation ---
pipeline "financial-insight" {
  steps: [
    ingest.csv → categorize.transactions → analyze.spending → generate.summary
  ]
}`;

export const DEFAULT_INPUT_TEXT = `date,description,amount,currency
2023-10-01,Uber Ride,25.50,USD
2023-10-02,Grocery Store,120.00,USD
2023-10-03,Netflix Subscription,15.99,USD
2023-10-04,Electric Bill,85.20,USD
2023-10-05,Coffee Shop,4.50,USD
2023-10-06,Cinema Tickets,30.00,USD
2023-10-07,Gas Station,45.00,USD
2023-10-08,Restaurant Dinner,75.00,USD
2023-10-09,Spotify,9.99,USD
2023-10-10,Internet Bill,60.00,USD`;
