import json
import csv

def write_csv(file: list[dict], path : str) -> None:
    """Input: file (list[dict]), path : str, one row for each company. Output: None; writes <path>.csv."""
    fieldnames = list(dict.fromkeys(key for info in file for key in info))
    with open(path + ".csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, restval="")
        writer.writeheader()
        writer.writerows(file)


def write_json(file: list[dict], path : str) -> None:
    """Input: file (list[dict]), path : str, one field for each company. Output: None; writes <path>json."""
    with open(path + ".json", "w") as f:
        json.dump(file, f, ensure_ascii=False, indent=2)


def write(file: list[dict], path:str, key : str) -> None:
    """Input: file (list[dict]), path : str, key : str. Output: None; writes <path>json. and  <path>.csv with elements sorted by key"""
    if(key):
        file.sort(key = lambda x : x[key])
    write_json(file, path)
    write_csv(file,path)
    