import json
import sys
from config import load_config

def validate(file, keys):
    """Input: file (str) path to a JSON file containing a list of dicts,
    keys (list[str]) fields each item must have a non-None value for.
    Output: None; prints a per-item [ERROR] and exits with status 1 on the
    first item missing one of keys, otherwise prints a success summary."""
    with open(file, "r") as f:
        items = json.load(f)
    for item in items:
        for k in keys:
            if item[k] is None:
                print(f"[ERROR] {item} is missing {k} field")
                sys.exit(1)
    print(f"Verificati correttamente: {len(items)} elementi in {file}")


if __name__ == "__main__":
    config =load_config()
    validate(config["extracurricular_internship"]["file_path"], config["extracurricular_internship"]["keys"])
