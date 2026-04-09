"""Industry-to-subreddit mapping. Constants only — no logic."""

INDUSTRY_SUBREDDITS = {
    "Business Intelligence & Analytics": [
        "BusinessIntelligence", "tableau", "PowerBI", "analytics",
        "dataanalysis", "datascience", "dataengineering", "SQL",
    ],
    "Data Engineering & Infrastructure": [
        "dataengineering", "snowflake", "dbt", "bigquery", "aws",
        "googlecloud", "databricks", "datawarehousing", "ETL",
    ],
    "Marketing & Advertising": [
        "marketing", "PPC", "GoogleAnalytics", "SEO",
        "FacebookAds", "digital_marketing",
    ],
    "E-commerce & Retail": [
        "ecommerce", "shopify", "AmazonSeller", "EtsySellers",
        "WooCommerce", "Entrepreneur",
    ],
    "Finance & Accounting": [
        "financialmodeling", "FPandA", "Accounting", "CFO", "SaaS",
    ],
    "SaaS & Technology": [
        "SaaS", "startups", "aws", "googlecloud", "MachineLearning",
        "AIToolsForBusiness",
    ],
    "AI & Machine Learning": [
        "MachineLearning", "AIToolsForBusiness", "claudeai",
        "ChatGPT", "automation", "datascience",
    ],
    "Sales & Revenue Operations": [
        "sales", "SaaS", "Entrepreneur", "startups", "smallbusiness",
    ],
    "Supply Chain & Operations": [
        "operations", "projectmanagement", "smallbusiness", "Entrepreneur",
    ],
    "HR & People Analytics": [
        "humanresources", "analytics", "dataanalysis", "BusinessIntelligence",
    ],
    "Agency & Consulting": [
        "agency", "freelance", "consulting", "marketing", "PPC",
    ],
    "Small Business & Entrepreneurship": [
        "smallbusiness", "Entrepreneur", "sweatystartup",
        "ecommerce", "agency",
    ],
}

DEFAULT_SUBREDDITS = ["datascience", "analytics", "BusinessIntelligence"]
