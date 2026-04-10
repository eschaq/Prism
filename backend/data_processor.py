import io
import math
import pandas as pd
from claude_client import call_claude, load_prompt
from formatting import format_profile


def _json_safe(obj):
    """Recursively replace float NaN/Inf with None for JSON serialization."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    # Convert numpy int/float to Python native
    if hasattr(obj, "item"):
        return _json_safe(obj.item())
    return obj


def process_csvs(file_objs: list[io.BytesIO], profile: dict | None = None) -> dict:
    """Ingest one or more CSV files, merge, and produce a plain-English business summary via Claude."""
    dfs = [pd.read_csv(f) for f in file_objs]

    # Merge logic
    if len(dfs) == 1:
        df = dfs[0]
    else:
        all_col_sets = [set(d.columns) for d in dfs]
        common_cols = set.intersection(*all_col_sets)
        # Use outer join if common columns represent ≥50% of columns in each DataFrame
        use_merge = bool(common_cols) and all(
            len(common_cols) >= len(d.columns) * 0.5 for d in dfs
        )
        if use_merge:
            merge_keys = sorted(common_cols)
            df = dfs[0]
            for next_df in dfs[1:]:
                df = df.merge(next_df, on=merge_keys, how="outer")
        else:
            df = pd.concat(dfs, ignore_index=True)

    # Aggressive NaN/Inf cleanup on the entire DataFrame
    df = df.where(pd.notnull(df), None)

    shape = df.shape
    columns = df.columns.tolist()
    dtypes = df.dtypes.astype(str).to_dict()
    nulls = df.isnull().sum().to_dict()
    preview = df.head(5).to_csv(index=False)
    describe = df.describe(include="all").to_csv()

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    datetime_cols = df.select_dtypes(include="datetime").columns.tolist()

    system_prompt = load_prompt("data_analysis.txt")
    profile_section = f"COMPANY PROFILE:\n{format_profile(profile)}\n\n" if profile else ""
    files_line = f"Files merged: {len(file_objs)}\n" if len(file_objs) > 1 else ""
    user_message = (
        f"{profile_section}"
        f"{files_line}"
        f"Dataset shape: {shape[0]} rows × {shape[1]} columns\n"
        f"Columns: {columns}\n"
        f"Data types: {dtypes}\n"
        f"Numeric columns: {numeric_cols}\n"
        f"Categorical columns: {categorical_cols}\n"
        f"Datetime columns: {datetime_cols}\n"
        f"Null counts: {nulls}\n\n"
        f"Preview (first 5 rows):\n{preview}\n\n"
        f"Statistical summary:\n{describe}"
    )

    summary = call_claude(system_prompt, user_message)

    result = {
        "summary": summary,
        "shape": {"rows": int(shape[0]), "columns": int(shape[1])},
        "columns": columns,
        "preview": df.head(5).to_dict(orient="records"),
        "file_count": len(file_objs),
    }

    return _json_safe(result)
