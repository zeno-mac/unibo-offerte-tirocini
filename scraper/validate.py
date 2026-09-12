import json
import sys


def validate(file, keys):
    with open(file, "r") as f:
        items = json.load(f)
    for item in items:
        for k in keys:
            if item[k] is None:
                print(f"[ERROR] {item} is missing {k} field")
                sys.exit(1)
    print(f"Verificati correttamente: {len(items)} elementi in {file}")


if __name__ == "__main__":
    validate("files/log.json", ["Ragione Sociale:", "Indirizzo dell'offerta:"])
