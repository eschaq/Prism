import anthropic

client = anthropic.Anthropic()  # key from ANTHROPIC_API_KEY environment variable


def call_claude(system_prompt: str, user_message: str, temperature: float = 0.3) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


def load_prompt(filename: str) -> str:
    """Load a prompt template from backend/prompts/."""
    import os
    prompts_dir = os.path.join(os.path.dirname(__file__), "prompts")
    with open(os.path.join(prompts_dir, filename), "r") as f:
        return f.read()
