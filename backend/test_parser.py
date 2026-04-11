"""
Test runner for the Resume Parser Agent.

Usage:
    cd backend
    python test_parser.py

Reads GROQ_API_KEY from ../.env (project root) automatically.
"""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (one level up from backend/)
load_dotenv(Path(__file__).parent.parent / ".env")

# Verify key is present before bothering with anything else
if not os.environ.get("GROQ_API_KEY"):
    print("❌  GROQ_API_KEY not found. Add it to .env at the project root.")
    print("    Example:  GROQ_API_KEY=gsk_...")
    raise SystemExit(1)

from agents.parser import ParserAgent


async def test_file(agent, resume_id, file_path, file_format, must_haves):
    print(f"\n--- Testing: {file_path} ---")
    try:
        result = await agent.run(
            resume_id=resume_id,
            file_path=file_path,
            file_format=file_format,
            must_haves=must_haves,
        )
        # Pretty-print result (exclude raw_skills for readability)
        output = {k: v for k, v in result.items() if k != "raw_skills"}
        print(json.dumps(output, indent=2, default=str))
        return result
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None


async def main():
    agent = ParserAgent()
    
    files_to_test = [
        ("a1-test", "../demo_data/resumes/a1.pdf", "pdf", ["Python", "Machine Learning"]),
        ("a2-test", "../demo_data/resumes/a2.pdf", "pdf", ["Java", "Spring Boot"]),
    ]
    
    for rid, path, fmt, mhs in files_to_test:
        await test_file(agent, rid, path, fmt, mhs)


if __name__ == "__main__":
    asyncio.run(main())
