import json
import csv
import os

def write_json(data: list[dict], path : str) -> None:
    """Input: data (list[dict]), path : str. Output: None; writes data as
    JSON to path (UTF-8, human-readable, 2-space indent)."""
    with open(path , "w") as f:
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
    """Input: data (list[dict]), path (str) output JSON file path, key (str)
    dict key to sort data by before writing (skipped if falsy). Output:
    None; creates the parent directory of path if needed, then writes data
    as JSON to path via write_json."""
    create_dir(path)
    if(key):
        data.sort(key = lambda x : x[key])
    write_json(data, path)
    return 
    