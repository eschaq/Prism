const DEMO_DATASETS = [
  { id: "marketing_campaigns", filename: "marketing_campaigns.csv", label: "Marketing Campaigns", description: "Channel spend, ROAS, CPA across 12 months" },
  { id: "ga4_traffic", filename: "ga4_traffic.csv", label: "GA4 Traffic", description: "Sessions, bounce rate, conversions by source" },
  { id: "email_marketing", filename: "email_marketing.csv", label: "Email Marketing", description: "Open rates, clicks, revenue by campaign type" },
  { id: "social_media", filename: "social_media.csv", label: "Social Media", description: "Followers, engagement, mentions by platform" },
  { id: "sales_pipeline", filename: "sales_pipeline.csv", label: "Sales Pipeline", description: "Deals, win rates, velocity by segment and stage" },
  { id: "mrr_metrics", filename: "mrr_metrics.csv", label: "MRR Metrics", description: "New, expansion, churn MRR over 12 months" },
  { id: "product_usage", filename: "product_usage.csv", label: "Product Usage", description: "DAU, MAU, API calls, errors by feature" },
  { id: "shopify_orders", filename: "shopify_orders.csv", label: "Shopify Orders", description: "Orders, AOV, refund and repeat rates by category" },
  { id: "customer_cohorts", filename: "customer_cohorts.csv", label: "Customer Cohorts", description: "Retention curves and revenue per user by cohort" },
  { id: "inventory", filename: "inventory.csv", label: "Inventory", description: "Stock levels, stockouts, carrying costs by SKU" },
  { id: "pnl_summary", filename: "pnl_summary.csv", label: "P&L Summary", description: "Revenue, COGS, OPEX, EBITDA, margins monthly" },
  { id: "budget_vs_actual", filename: "budget_vs_actual.csv", label: "Budget vs Actual", description: "Departmental budget variance tracking" },
  { id: "support_tickets", filename: "support_tickets.csv", label: "Support Tickets", description: "Volume, resolution time, CSAT by category" },
  { id: "headcount_attrition", filename: "headcount_attrition.csv", label: "Headcount & Attrition", description: "Hires, departures, time-to-fill by department" },
  { id: "employee_nps", filename: "employee_nps.csv", label: "Employee NPS", description: "eNPS scores, promoters, detractors by department" },
];

export default DEMO_DATASETS;
