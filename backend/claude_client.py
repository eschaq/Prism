import os
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from environment


def call_claude(system_prompt: str, user_message: str, temperature: float = 0.3) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


def load_prompt(filename: str) -> str:
    prompts_dir = os.path.join(os.path.dirname(__file__), "prompts")
    with open(os.path.join(prompts_dir, filename), "r") as f:
        return f.read()
