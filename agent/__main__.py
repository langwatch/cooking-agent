"""CLI: `python -m agent chat "give me a 30-min pasta"`."""

from __future__ import annotations

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown

from agent.cooking_agent import build_agent
from agent.flags import load as load_flags
from agent.telemetry import setup as setup_telemetry

load_dotenv()

app = typer.Typer(add_completion=False, help="Cooking agent CLI.")
console = Console()


@app.command()
def chat(
    message: str = typer.Argument(..., help="Your cooking question."),
    tier: str = typer.Option("mid", help="Model tier: cheap | mid | premium"),
):
    """Ask the cooking agent one question."""
    setup_telemetry()
    flags = load_flags()
    if not flags.cooking_agent_enabled:
        console.print("[yellow]cooking_agent_enabled flag is OFF. Exiting.[/yellow]")
        raise typer.Exit(code=2)

    agent = build_agent(tier=tier)
    reply = agent.chat(message)
    console.print(Markdown(reply))


if __name__ == "__main__":
    app()
