import json
import os

def load_config():
    """Input: None. Output: dict parsed from config.json (in the same
    directory as this file), keyed by dataset name (e.g.
    'extracurricular_internship', 'curricular_internship') with
    'file_path', 'keys' and 'sorting_key' entries for that dataset."""
    path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(path, "r") as f:
        return json.load(f)