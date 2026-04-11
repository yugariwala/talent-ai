import json
import os
from typing import List, Set, Dict, Optional, Union

class SkillTaxonomyAgent:
    def __init__(self, taxonomy_path: str = "backend/taxonomy.json"):
        # If running from within agents subdir, path might need adjustment
        if not os.path.exists(taxonomy_path):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            possible_path = os.path.join(os.path.dirname(current_dir), "taxonomy.json")
            if os.path.exists(possible_path):
                taxonomy_path = possible_path
            else:
                # Fallback to root if needed
                possible_path = os.path.join(os.getcwd(), "backend", "taxonomy.json")
                if os.path.exists(possible_path):
                    taxonomy_path = possible_path

        self.taxonomy_path = taxonomy_path
        self.taxonomy: Dict[str, dict] = {}
        self.alias_map: Dict[str, str] = {}
        self._load_taxonomy()

    def _load_taxonomy(self):
        if not os.path.exists(self.taxonomy_path):
            raise FileNotFoundError(f"Taxonomy file not found at {self.taxonomy_path}")

        try:
            with open(self.taxonomy_path, 'r', encoding='utf-8') as f:
                self.taxonomy = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse taxonomy JSON: {e}")

        # Build alias map for fast lookup (case-insensitive)
        for canonical, data in self.taxonomy.items():
            self.alias_map[canonical.lower()] = canonical
            for alias in data.get("aliases", []):
                self.alias_map[alias.lower()] = canonical

    def normalize_skill(self, skill_name: str) -> Optional[str]:
        """Maps a raw skill string (or alias) to its canonical name."""
        if not skill_name:
            return None
        return self.alias_map.get(skill_name.strip().lower())

    def infer_hierarchy(self, skill_input: Union[List[str], Dict[str, str]]) -> Set[str]:
        """
        Given a list of skills OR a dictionary of {skill: proficiency}, 
        returns a full set of canonical skills including implied ones.
        """
        result_set = set()
        queue = []
        proficiency_data = {}

        if isinstance(skill_input, dict):
            for s, p in skill_input.items():
                canonical = self.normalize_skill(s)
                if canonical:
                    queue.append(canonical)
                    proficiency_data[canonical] = p
        else:
            for s in skill_input:
                canonical = self.normalize_skill(s)
                if canonical:
                    queue.append(canonical)

        visited = set()
        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)
            result_set.add(current)

            data = self.taxonomy.get(current)
            if not data:
                continue

            # 1. Add Parent
            if data.get("parent"):
                parent = self.normalize_skill(data["parent"])
                if parent: queue.append(parent)

            # 2. Add Grandparent
            if data.get("grandparent"):
                gp = self.normalize_skill(data["grandparent"])
                if gp: queue.append(gp)

            # 3. Add General Implies
            for implied in data.get("implies", []):
                normalized_implied = self.normalize_skill(implied)
                if normalized_implied:
                    queue.append(normalized_implied)
                else:
                    # Add as raw string if it's not in taxonomy
                    result_set.add(implied.strip())

            # 4. Add Proficiency-based Implies
            if current in proficiency_data:
                prof = proficiency_data[current]
                implies_prof = data.get("implies_at_proficiency", {})
                
                # If Expert, imply everything in Expert and Advanced
                if prof == "Expert":
                    levels = ["Expert", "Advanced"]
                elif prof == "Advanced":
                    levels = ["Advanced"]
                else:
                    levels = []

                for level in levels:
                    for s in implies_prof.get(level, []):
                        normalized = self.normalize_skill(s)
                        if normalized:
                            queue.append(normalized)
                        else:
                            result_set.add(s.strip())

        return result_set

    def handle_unknown_skill(self, skill_name: str):
        """Logs unknown skills for future taxonomy updates."""
        # Simple print for now, could be integrated with logging
        print(f"INFO: Unknown skill detected: '{skill_name}'")

if __name__ == "__main__":
    # Internal test block
    agent = SkillTaxonomyAgent()
    
    print("--- Testing Normalization ---")
    test_skills = ["py", "reactjs", "K8s", "docker-compose", "not_a_skill"]
    for s in test_skills:
        norm = agent.normalize_skill(s)
        print(f"'{s}' -> {norm}")
        if not norm:
            agent.handle_unknown_skill(s)

    print("\n--- Testing Hierarchy Inference (Basic) ---")
    input_skills = ["React", "FastAPI"]
    hierarchy = agent.infer_hierarchy(input_skills)
    print(f"Input: {input_skills}")
    print(f"Full Set: {sorted(list(hierarchy))}")

    print("\n--- Testing Proficiency-based Inference ---")
    prof_inputs = [
        ({"React": "Basic"}, "React Basic"),
        ({"React": "Advanced"}, "React Advanced"),
        ({"PyTorch": "Expert"}, "PyTorch Expert")
    ]
    for inp, label in prof_inputs:
        res = agent.infer_hierarchy(inp)
        print(f"{label} -> {sorted(list(res))}")
