import io
import pandas as pd
from claude_client import call_claude, load_prompt
from formatting import format_profile


def process_csv(file_obj: io.BytesIO, profile: dict | None = None) -> dict:
    """Ingest a CSV file and produce a plain-English business summary via Claude."""
    df = pd.read_csv(file_obj)

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
    user_message = (
        f"{profile_section}"
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

    return {
        "summary": summary,
        "shape": {"rows": shape[0], "columns": shape[1]},
        "columns": columns,
        "preview": df.head(5).to_dict(orient="records"),
    }
