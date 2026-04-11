import os
import sys
import json

# Add parent directory to sys.path to import agents
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.parser import ResumeParserAgent
from agents.taxonomy_agent import SkillTaxonomyAgent

def run_pipeline(resume_filename: str):
    # 1. Setup paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    upload_path = os.path.join(project_root, "uploads", resume_filename)
    
    if not os.path.exists(upload_path):
        print(f"Error: File not found at {upload_path}")
        return

    # 2. Initialize Agents
    print("\n[Step 1] Initializing Agents...")
    parser = ResumeParserAgent()
    taxonomy = SkillTaxonomyAgent(os.path.join(base_dir, "taxonomy.json"))

    # 3. Parse Resume
    print(f"\n[Step 2] Parsing Resume: {resume_filename}")
    try:
        resume_data = parser.parse_resume(upload_path)
        raw_skills = resume_data.skills
        print(f"Extracted Raw Skills ({len(raw_skills)}): {raw_skills}")
    except Exception as e:
        print(f"Parsing failed: {e}")
        return

    # 4. Process with Taxonomy Agent
    print("\n[Step 3] Normalizing and Inferring Skill Hierarchy...")
    normalized_skills = []
    unknown_skills = []
    
    for skill in raw_skills:
        canonical = taxonomy.normalize_skill(skill)
        if canonical:
            normalized_skills.append(canonical)
        else:
            unknown_skills.append(skill)
            taxonomy.handle_unknown_skill(skill)

    print(f"Normalized Skills: {normalized_skills}")
    if unknown_skills:
        print(f"Unknown Skills: {unknown_skills}")

    # 5. Infer Full Hierarchy
    print("\n[Step 4] Inferring Full Hierarchy (Implied Skills)...")
    full_hierarchy = taxonomy.infer_hierarchy(raw_skills)
    
    # Sort for display
    sorted_hierarchy = sorted(list(full_hierarchy))
    
    print("\n=== FINAL RESULTS ===")
    print(f"Candidate: {resume_data.name}")
    print(f"Summary: {resume_data.summary[:100]}...")
    print("\n--- SKILL TAXONOMY EXPANSION ---")
    print(f"Raw Count: {len(raw_skills)}")
    print(f"Expanded Count: {len(sorted_hierarchy)}")
    print("\nFull Skill Set (Projected):")
    # Pretty print in columns or just list
    for i in range(0, len(sorted_hierarchy), 3):
        print(" | ".join(sorted_hierarchy[i:i+3]))
    print("\n======================")

if __name__ == "__main__":
    # Get first file from uploads if none provided
    resume_file = None
    if len(sys.argv) > 1:
        resume_file = sys.argv[1]
    else:
        # Auto-pick a file from uploads
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        files = [f for f in os.listdir(uploads_dir) if f.endswith(('.pdf', '.docx', '.txt')) and not f.startswith('.')]
        if files:
            # Prefer the Junior Data Scientist one as it's likely to have many skills
            test_files = [f for f in files if "junior_datascientist" in f]
            resume_file = test_files[0] if test_files else files[0]
    
    if resume_file:
        run_pipeline(resume_file)
    else:
        print("No files found in uploads to test.")
