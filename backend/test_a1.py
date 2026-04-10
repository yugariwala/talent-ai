"""
Test runner for the Resume Parser Agent.
"""

import asyncio
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from agents.parser import ParserAgent

async def main():
    agent = ParserAgent()
    print("\n--- Breakdown: a1.pdf ---")
    result = await agent.run(
        resume_id="a1-test",
        file_path="../demo_data/resumes/a1.pdf",
        file_format="pdf",
        must_haves=["Python", "Machine Learning"],
    )
    output = {k: v for k, v in result.items() if k != "raw_skills"}
    print(json.dumps(output, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main())
