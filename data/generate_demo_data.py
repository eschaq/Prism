"""Generate 15 realistic demo CSV files for Prism data analysis demos."""

import os
import numpy as np
import pandas as pd

np.random.seed(42)
OUT_DIR = os.path.join(os.path.dirname(__file__), "demo")
os.makedirs(OUT_DIR, exist_ok=True)

MONTHS = pd.date_range("2025-01", periods=12, freq="MS").strftime("%Y-%m").tolist()


def save(name, df):
    df.to_csv(os.path.join(OUT_DIR, name), index=False)
    print(f"  {name}: {df.shape[0]} rows, {df.shape[1]} cols")


# ---------------------------------------------------------------------------
# 1. Marketing Campaigns
# ---------------------------------------------------------------------------
def gen_marketing_campaigns():
    rows = []
    channels = {
        "Google Ads": {"base_spend": 45000, "base_roas": 3.2, "trend": 0.04},
        "Meta Ads": {"base_spend": 35000, "base_roas": 2.5, "trend": -0.01},
        "TikTok Ads": {"base_spend": 20000, "base_roas": 1.8, "trend": -0.06},
        "LinkedIn Ads": {"base_spend": 15000, "base_roas": 2.1, "trend": 0.03},
    }
    for i, m in enumerate(MONTHS):
        for ch, cfg in channels.items():
            spend = cfg["base_spend"] * (1 + cfg["trend"] * i) * np.random.uniform(0.9, 1.1)
            roas = cfg["base_roas"] * (1 + cfg["trend"] * i * 0.5) * np.random.uniform(0.85, 1.15)
            # Q3 anomaly spike for TikTok
            if ch == "TikTok Ads" and m in ("2025-07", "2025-08"):
                spend *= 1.8
                roas *= 0.6
            impressions = int(spend * np.random.uniform(18, 25))
            clicks = int(impressions * np.random.uniform(0.02, 0.05))
            conversions = int(clicks * np.random.uniform(0.03, 0.08))
            cpa = round(spend / max(conversions, 1), 2)
            rows.append([m, ch, round(spend), impressions, clicks, conversions, cpa, round(roas, 2)])
    save("marketing_campaigns.csv", pd.DataFrame(rows, columns=[
        "month", "channel", "spend", "impressions", "clicks", "conversions", "cpa", "roas"
    ]))


# ---------------------------------------------------------------------------
# 2. GA4 Traffic
# ---------------------------------------------------------------------------
def gen_ga4_traffic():
    rows = []
    sources = {
        "Organic Search": {"base": 28000, "trend": 0.05},
        "Paid Search": {"base": 22000, "trend": -0.02},
        "Direct": {"base": 15000, "trend": -0.03},
        "Referral": {"base": 5000, "trend": 0.02},
        "Social": {"base": 8000, "trend": 0.01},
    }
    for i, m in enumerate(MONTHS):
        for src, cfg in sources.items():
            sessions = int(cfg["base"] * (1 + cfg["trend"] * i) * np.random.uniform(0.9, 1.1))
            # Referral spike in June
            if src == "Referral" and m == "2025-06":
                sessions = int(sessions * 3.2)
            users = int(sessions * np.random.uniform(0.7, 0.85))
            bounce = round(np.random.uniform(0.35, 0.65), 3)
            duration = round(np.random.uniform(90, 240), 1)
            conv = int(sessions * np.random.uniform(0.02, 0.05))
            conv_rate = round(conv / max(sessions, 1) * 100, 2)
            rows.append([m, src, sessions, users, bounce, duration, conv, conv_rate])
    save("ga4_traffic.csv", pd.DataFrame(rows, columns=[
        "month", "source", "sessions", "users", "bounce_rate", "avg_session_duration_sec",
        "conversions", "conversion_rate_pct"
    ]))


# ---------------------------------------------------------------------------
# 3. Email Marketing
# ---------------------------------------------------------------------------
def gen_email_marketing():
    rows = []
    types = ["Promotional", "Nurture Sequence", "Product Update", "Newsletter"]
    for i, m in enumerate(MONTHS):
        for ct in types:
            sends = int(np.random.uniform(15000, 45000))
            if ct == "Nurture Sequence":
                open_r = np.random.uniform(0.35, 0.48)
                click_r = np.random.uniform(0.06, 0.12)
            elif ct == "Promotional":
                open_r = np.random.uniform(0.18, 0.28)
                click_r = np.random.uniform(0.02, 0.05)
            else:
                open_r = np.random.uniform(0.25, 0.38)
                click_r = np.random.uniform(0.03, 0.07)
            opens = int(sends * open_r)
            clicks = int(sends * click_r)
            unsubs = int(sends * (0.002 + 0.0003 * i) * np.random.uniform(0.8, 1.2))
            revenue = round(clicks * np.random.uniform(2.5, 8.0), 2)
            # Holiday spike in November/December
            if m in ("2025-11", "2025-12") and ct == "Promotional":
                revenue *= 2.5
                sends = int(sends * 1.5)
            rows.append([m, ct, sends, opens, clicks, unsubs, revenue,
                         round(open_r * 100, 1), round(click_r * 100, 1)])
    save("email_marketing.csv", pd.DataFrame(rows, columns=[
        "month", "campaign_type", "sends", "opens", "clicks", "unsubscribes",
        "revenue", "open_rate_pct", "click_rate_pct"
    ]))


# ---------------------------------------------------------------------------
# 4. Social Media
# ---------------------------------------------------------------------------
def gen_social_media():
    rows = []
    platforms = {
        "LinkedIn": {"base_followers": 12000, "growth": 0.06, "eng_rate": 0.04},
        "Twitter/X": {"base_followers": 25000, "growth": -0.015, "eng_rate": 0.015},
        "Instagram": {"base_followers": 18000, "growth": 0.03, "eng_rate": 0.035},
        "YouTube": {"base_followers": 4500, "growth": 0.04, "eng_rate": 0.025},
    }
    for i, m in enumerate(MONTHS):
        for plat, cfg in platforms.items():
            followers = int(cfg["base_followers"] * (1 + cfg["growth"] * i))
            impressions = int(followers * np.random.uniform(3, 8))
            eng_rate = cfg["eng_rate"] * np.random.uniform(0.8, 1.2)
            # Instagram engagement anomaly in September
            if plat == "Instagram" and m == "2025-09":
                eng_rate *= 2.8
            engagements = int(impressions * eng_rate)
            link_clicks = int(engagements * np.random.uniform(0.05, 0.15))
            mentions = int(np.random.uniform(20, 150))
            rows.append([m, plat, followers, impressions, engagements,
                         round(eng_rate * 100, 2), link_clicks, mentions])
    save("social_media.csv", pd.DataFrame(rows, columns=[
        "month", "platform", "followers", "impressions", "engagements",
        "engagement_rate_pct", "link_clicks", "mentions"
    ]))


# ---------------------------------------------------------------------------
# 5. Sales Pipeline
# ---------------------------------------------------------------------------
def gen_sales_pipeline():
    rows = []
    stages = ["Prospecting", "Discovery", "Proposal", "Negotiation", "Closed Won"]
    segments = {
        "Enterprise": {"base_deals": 8, "avg_size": 85000, "win_trend": -0.02},
        "Mid-Market": {"base_deals": 25, "avg_size": 22000, "win_trend": 0.03},
        "SMB": {"base_deals": 60, "avg_size": 4500, "win_trend": 0.01},
    }
    for i, m in enumerate(MONTHS):
        for seg, cfg in segments.items():
            for stage in stages:
                mult = {"Prospecting": 1.0, "Discovery": 0.7, "Proposal": 0.45,
                        "Negotiation": 0.3, "Closed Won": 0.2}[stage]
                deals = max(1, int(cfg["base_deals"] * mult * (1 + cfg["win_trend"] * i)
                                   * np.random.uniform(0.8, 1.2)))
                # Q3 pipeline gap for Enterprise
                if seg == "Enterprise" and m in ("2025-07", "2025-08", "2025-09"):
                    deals = max(1, int(deals * 0.5))
                avg_size = cfg["avg_size"] * np.random.uniform(0.85, 1.15)
                value = round(deals * avg_size)
                win_rate = round(mult * (1 + cfg["win_trend"] * i) * np.random.uniform(0.85, 1.15) * 100, 1)
                days = int(np.random.uniform(5, 45) / mult)
                rows.append([m, seg, stage, deals, value, round(avg_size), win_rate, days])
    save("sales_pipeline.csv", pd.DataFrame(rows, columns=[
        "month", "segment", "stage", "deals", "value", "avg_deal_size",
        "win_rate_pct", "days_in_stage"
    ]))


# ---------------------------------------------------------------------------
# 6. MRR Metrics
# ---------------------------------------------------------------------------
def gen_mrr_metrics():
    rows = []
    total_mrr = 420000
    customers = 380
    for i, m in enumerate(MONTHS):
        new_mrr = int(np.random.uniform(18000, 32000) * (1 - 0.02 * i))
        expansion = int(np.random.uniform(12000, 25000) * (1 + 0.04 * i))
        contraction = int(np.random.uniform(3000, 8000))
        churn = int(np.random.uniform(5000, 12000))
        # Churn spike in March
        if m == "2025-03":
            churn = int(churn * 2.5)
        net_new = new_mrr + expansion - contraction - churn
        total_mrr += net_new
        customers += int((new_mrr / 1100) - (churn / 1100) * 0.8)
        rows.append([m, new_mrr, expansion, contraction, churn, net_new, total_mrr, customers])
    save("mrr_metrics.csv", pd.DataFrame(rows, columns=[
        "month", "new_mrr", "expansion_mrr", "contraction_mrr", "churn_mrr",
        "net_new_mrr", "total_mrr", "customers"
    ]))


# ---------------------------------------------------------------------------
# 7. Product Usage
# ---------------------------------------------------------------------------
def gen_product_usage():
    rows = []
    features = {
        "Dashboard": {"base_dau": 3200, "trend": -0.03},
        "API": {"base_dau": 1800, "trend": 0.07},
        "Reports": {"base_dau": 2500, "trend": 0.02},
        "Integrations": {"base_dau": 900, "trend": 0.05},
        "Mobile App": {"base_dau": 600, "trend": 0.08},
    }
    for i, m in enumerate(MONTHS):
        for feat, cfg in features.items():
            dau = int(cfg["base_dau"] * (1 + cfg["trend"] * i) * np.random.uniform(0.9, 1.1))
            mau = int(dau * np.random.uniform(3.5, 5.5))
            ratio = round(dau / max(mau, 1), 3)
            api_calls = int(dau * np.random.uniform(15, 45))
            error_rate = np.random.uniform(0.005, 0.02)
            # Error rate anomaly in August for API
            if feat == "API" and m == "2025-08":
                error_rate = 0.12
            errors = int(api_calls * error_rate)
            latency = round(np.random.uniform(80, 250), 1)
            rows.append([m, feat, dau, mau, ratio, api_calls, errors, latency])
    save("product_usage.csv", pd.DataFrame(rows, columns=[
        "month", "feature", "dau", "mau", "dau_mau_ratio", "api_calls", "errors", "avg_latency_ms"
    ]))


# ---------------------------------------------------------------------------
# 8. Shopify Orders
# ---------------------------------------------------------------------------
def gen_shopify_orders():
    rows = []
    categories = {
        "Premium Analytics": {"base_orders": 180, "base_aov": 299, "trend": 0.05},
        "Basic Dashboard": {"base_orders": 450, "base_aov": 49, "trend": -0.02},
        "Data Connectors": {"base_orders": 320, "base_aov": 89, "trend": 0.03},
        "Training Courses": {"base_orders": 90, "base_aov": 199, "trend": 0.01},
    }
    for i, m in enumerate(MONTHS):
        for cat, cfg in categories.items():
            orders = int(cfg["base_orders"] * (1 + cfg["trend"] * i) * np.random.uniform(0.85, 1.15))
            aov = round(cfg["base_aov"] * np.random.uniform(0.9, 1.1), 2)
            # Holiday surge
            if m in ("2025-11", "2025-12"):
                orders = int(orders * np.random.uniform(1.6, 2.2))
            revenue = round(orders * aov, 2)
            refund_rate = round(np.random.uniform(0.02, 0.08), 3)
            repeat_rate = round(np.random.uniform(0.15, 0.45), 3)
            rows.append([m, cat, orders, revenue, aov, refund_rate, repeat_rate])
    save("shopify_orders.csv", pd.DataFrame(rows, columns=[
        "month", "product_category", "orders", "revenue", "avg_order_value",
        "refund_rate", "repeat_rate"
    ]))


# ---------------------------------------------------------------------------
# 9. Customer Cohorts
# ---------------------------------------------------------------------------
def gen_customer_cohorts():
    rows = []
    cohorts = MONTHS[:9]  # Jan-Sep cohorts, tracking through Dec
    for ci, cohort in enumerate(cohorts):
        initial = int(np.random.uniform(120, 250) * (1 + 0.03 * ci))
        for months_since in range(12 - ci):
            if months_since == 0:
                retained = initial
            else:
                # M1 drop, M3 problem, then stabilize
                base_retention = 0.85 ** months_since
                if months_since == 3:
                    base_retention *= 0.7  # M3 drop-off
                # Recent cohorts retain better
                cohort_bonus = 1 + 0.02 * ci
                retained = int(initial * base_retention * cohort_bonus * np.random.uniform(0.9, 1.1))
                retained = max(retained, 1)
            retention_rate = round(retained / initial, 3)
            rev_per_user = round(np.random.uniform(45, 85) * (1 + 0.01 * ci + 0.005 * months_since), 2)
            rows.append([cohort, months_since, retained, initial, retention_rate, rev_per_user])
    save("customer_cohorts.csv", pd.DataFrame(rows, columns=[
        "cohort_month", "months_since_signup", "retained_users", "initial_users",
        "retention_rate", "revenue_per_user"
    ]))


# ---------------------------------------------------------------------------
# 10. Inventory
# ---------------------------------------------------------------------------
def gen_inventory():
    rows = []
    categories = {
        "Analytics Sensors": {"base_stock": 2500, "base_sold": 400, "reorder": 800},
        "Dashboard Kits": {"base_stock": 1200, "base_sold": 350, "reorder": 500},
        "Connector Modules": {"base_stock": 3500, "base_sold": 200, "reorder": 600},
        "Premium Bundles": {"base_stock": 400, "base_sold": 180, "reorder": 200},
    }
    for i, m in enumerate(MONTHS):
        for cat, cfg in categories.items():
            sold = int(cfg["base_sold"] * np.random.uniform(0.8, 1.3))
            # Seasonal demand mismatch
            if m in ("2025-10", "2025-11", "2025-12"):
                sold = int(sold * 1.6)
            on_hand = max(0, int(cfg["base_stock"] - sold * np.random.uniform(0.3, 0.8)))
            # Dashboard Kits chronically understocked
            if cat == "Dashboard Kits":
                on_hand = int(on_hand * 0.4)
            # Connector Modules overstocked
            if cat == "Connector Modules":
                on_hand = int(on_hand * 2.2)
            stockout_days = max(0, int((cfg["reorder"] - on_hand) / max(sold / 30, 1)))
            if on_hand > cfg["reorder"]:
                stockout_days = 0
            carrying = round(on_hand * np.random.uniform(1.2, 2.5), 2)
            rows.append([m, cat, on_hand, sold, cfg["reorder"], stockout_days, carrying])
    save("inventory.csv", pd.DataFrame(rows, columns=[
        "month", "sku_category", "units_on_hand", "units_sold", "reorder_point",
        "stockout_days", "carrying_cost"
    ]))


# ---------------------------------------------------------------------------
# 11. P&L Summary
# ---------------------------------------------------------------------------
def gen_pnl():
    rows = []
    base_rev = 580000
    for i, m in enumerate(MONTHS):
        revenue = int(base_rev * (1 + 0.03 * i) * np.random.uniform(0.95, 1.05))
        cogs = int(revenue * np.random.uniform(0.28, 0.35))
        gross = revenue - cogs
        opex = int(280000 * (1 + 0.04 * i) * np.random.uniform(0.95, 1.05))
        # One-time Q2 charge
        if m == "2025-05":
            opex += 120000
        ebitda = gross - opex
        net = int(ebitda * np.random.uniform(0.7, 0.9))
        margin = round(gross / revenue * 100, 1)
        rows.append([m, revenue, cogs, gross, opex, ebitda, net, margin])
    save("pnl_summary.csv", pd.DataFrame(rows, columns=[
        "month", "revenue", "cogs", "gross_profit", "opex", "ebitda", "net_income",
        "gross_margin_pct"
    ]))


# ---------------------------------------------------------------------------
# 12. Budget vs Actual
# ---------------------------------------------------------------------------
def gen_budget_vs_actual():
    rows = []
    depts = {
        "Engineering": {"budget": 185000, "bias": 1.08},
        "Marketing": {"budget": 95000, "h1_bias": 0.85, "h2_bias": 1.18},
        "Sales": {"budget": 120000, "bias": 1.01},
        "Operations": {"budget": 65000, "bias": 0.97},
        "G&A": {"budget": 45000, "bias": 1.03},
    }
    for i, m in enumerate(MONTHS):
        for dept, cfg in depts.items():
            budgeted = int(cfg["budget"] * np.random.uniform(0.98, 1.02))
            if dept == "Marketing":
                bias = cfg["h1_bias"] if i < 6 else cfg["h2_bias"]
            else:
                bias = cfg["bias"]
            actual = int(budgeted * bias * np.random.uniform(0.93, 1.07))
            variance = actual - budgeted
            variance_pct = round(variance / budgeted * 100, 1)
            rows.append([m, dept, budgeted, actual, variance, variance_pct])
    save("budget_vs_actual.csv", pd.DataFrame(rows, columns=[
        "month", "department", "budgeted", "actual", "variance", "variance_pct"
    ]))


# ---------------------------------------------------------------------------
# 13. Support Tickets
# ---------------------------------------------------------------------------
def gen_support_tickets():
    rows = []
    categories = {
        "Billing": {"base": 120, "trend": 0.06},
        "Technical": {"base": 200, "trend": 0.01},
        "Integrations": {"base": 80, "trend": 0.04},
        "Onboarding": {"base": 60, "trend": -0.02},
        "Feature Request": {"base": 40, "trend": 0.03},
    }
    for i, m in enumerate(MONTHS):
        for cat, cfg in categories.items():
            opened = int(cfg["base"] * (1 + cfg["trend"] * i) * np.random.uniform(0.85, 1.15))
            resolved = int(opened * np.random.uniform(0.85, 1.0))
            avg_hours = round(np.random.uniform(4, 24) * (0.95 ** i), 1)
            # Integrations resolution time not improving
            if cat == "Integrations":
                avg_hours = round(np.random.uniform(18, 36), 1)
            csat = round(np.random.uniform(3.8, 4.6) - (0.02 * i if cat == "Billing" else 0), 1)
            escalations = int(opened * np.random.uniform(0.03, 0.1))
            rows.append([m, cat, opened, resolved, avg_hours, csat, escalations])
    save("support_tickets.csv", pd.DataFrame(rows, columns=[
        "month", "category", "tickets_opened", "tickets_resolved",
        "avg_resolution_hours", "csat_score", "escalations"
    ]))


# ---------------------------------------------------------------------------
# 14. Headcount & Attrition
# ---------------------------------------------------------------------------
def gen_headcount():
    rows = []
    depts = {
        "Engineering": {"hc": 85, "base_attrition": 0.03},
        "Sales": {"hc": 42, "base_attrition": 0.04},
        "Marketing": {"hc": 18, "base_attrition": 0.025},
        "Support": {"hc": 24, "base_attrition": 0.035},
        "Operations": {"hc": 12, "base_attrition": 0.02},
    }
    for i, m in enumerate(MONTHS):
        for dept, cfg in depts.items():
            attrition = cfg["base_attrition"]
            # Engineering attrition spike Q2
            if dept == "Engineering" and m in ("2025-04", "2025-05", "2025-06"):
                attrition = 0.08
            departures = max(0, int(cfg["hc"] * attrition * np.random.uniform(0.5, 1.5)))
            hires = max(0, int(np.random.uniform(1, 6) * (1 + 0.02 * i)))
            if dept == "Sales":
                hires = max(hires, 2)
            cfg["hc"] = cfg["hc"] + hires - departures
            open_roles = max(0, int(np.random.uniform(2, 8) + 0.3 * i))
            ttf = round(np.random.uniform(25, 55) + 1.5 * i, 0)
            att_rate = round(departures / max(cfg["hc"], 1) * 100, 1)
            rows.append([m, dept, cfg["hc"], hires, departures, att_rate, open_roles, int(ttf)])
    save("headcount_attrition.csv", pd.DataFrame(rows, columns=[
        "month", "department", "headcount", "hires", "departures",
        "attrition_rate_pct", "open_roles", "time_to_fill_days"
    ]))


# ---------------------------------------------------------------------------
# 15. Employee NPS
# ---------------------------------------------------------------------------
def gen_employee_nps():
    rows = []
    depts = {
        "Engineering": {"base_enps": 42, "trend": 0.5},
        "Sales": {"base_enps": 35, "trend": 0.2},
        "Marketing": {"base_enps": 48, "trend": -0.3},
        "Support": {"base_enps": 30, "trend": -1.5},
        "Operations": {"base_enps": 38, "trend": 0.1},
    }
    for i, m in enumerate(MONTHS):
        for dept, cfg in depts.items():
            responses = int(np.random.uniform(15, 40))
            enps = cfg["base_enps"] + cfg["trend"] * i
            # Company-wide Q3 dip
            if m in ("2025-07", "2025-08", "2025-09"):
                enps -= 12
            # Engineering recovering after
            if dept == "Engineering" and m in ("2025-10", "2025-11", "2025-12"):
                enps += 8
            enps = max(-100, min(100, enps + np.random.uniform(-5, 5)))
            enps = round(enps, 0)
            # Derive promoters/passives/detractors from eNPS
            promoter_pct = max(0.1, min(0.7, 0.4 + enps / 200))
            detractor_pct = max(0.05, min(0.5, 0.2 - enps / 250))
            passive_pct = 1 - promoter_pct - detractor_pct
            promoters = int(responses * promoter_pct)
            detractors = int(responses * detractor_pct)
            passives = responses - promoters - detractors
            rows.append([m, dept, responses, promoters, passives, detractors, int(enps)])
    save("employee_nps.csv", pd.DataFrame(rows, columns=[
        "month", "department", "responses", "promoters", "passives", "detractors", "enps_score"
    ]))


if __name__ == "__main__":
    print("Generating demo data...")
    gen_marketing_campaigns()
    gen_ga4_traffic()
    gen_email_marketing()
    gen_social_media()
    gen_sales_pipeline()
    gen_mrr_metrics()
    gen_product_usage()
    gen_shopify_orders()
    gen_customer_cohorts()
    gen_inventory()
    gen_pnl()
    gen_budget_vs_actual()
    gen_support_tickets()
    gen_headcount()
    gen_employee_nps()
    print("Done!")
