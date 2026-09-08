import json
import csv
import os

def write_csv(data: list[dict], path : str) -> None:
    """Input: file (list[dict]), path : str, one row for each company. Output: None; writes <path>.csv."""
    fieldnames = list(dict.fromkeys(key for info in data for key in info))
    with open(path + ".csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, restval="")
        writer.writeheader()
        writer.writerows(data)


def write_json(data: list[dict], path : str) -> None:
    """Input: file (list[dict]), path : str, one field for each company. Output: None; writes <path>json."""
    with open(path + ".json", "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_dir(path : str) -> str:
    """Input: path : str, may contain a directory plus a leading file. Output: str; cuts the leading string and return the directory"""
    l = [ind for ind, ch in enumerate(path) if ch == '/']
    if len(l)>0:
        n = l[-1]
        return path[0:n+1]
    else:
        return None
    
def create_dir(path : str) -> None:
    """"Input: path : str, Output: None; create path directory if not existing"""
    dir = get_dir(path)
    if dir and not os.path.isdir(dir):
        os.makedirs(dir)
        
    
def write(data: list[dict], path:str, key : str) -> None:
    """Input: file (list[dict]), path : str, key : str. Output: None; writes <path>json. and  <path>.csv with elements sorted by key"""
    create_dir(path)
    if(key):
        data.sort(key = lambda x : x[key])
    write_json(data, path)
    write_csv(data,path)
    return 
    