import os
import re
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from environment


def call_claude(system_prompt: str, user_message: str, temperature: float = 0.3) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


def strip_code_fences(text: str) -> str:
    """Remove markdown code fences (```json ... ```) if present."""
    stripped = text.strip()
    match = re.match(r"^```\w*\s*\n(.*?)```\s*$", stripped, flags=re.DOTALL)
    if match:
        return match.group(1).strip()
    return stripped


def call_claude_with_search(system_prompt: str, user_message: str, temperature: float = 0.3) -> str:
    """Call Claude with the built-in web search tool enabled.

    Handles multi-block responses — extracts the final text block after tool use.
    """
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
        tools=[{"type": "web_search_20250305", "name": "web_search"}],
    )
    # Extract text from the response — may contain tool_use and text blocks
    text_parts = []
    for block in message.content:
        if hasattr(block, "text"):
            text_parts.append(block.text)
    return "\n".join(text_parts) if text_parts else ""


def load_prompt(filename: str) -> str:
    prompts_dir = os.path.join(os.path.dirname(__file__), "prompts")
    with open(os.path.join(prompts_dir, filename), "r") as f:
        return f.read()
