import git
import os
import json
from typing import Optional
import sys


def load_file(path2repo: str, path2file: str) -> Optional[list[dict]]:
    """Input: path2repo (str), path2file (str), payload (dict), page_num (int).
    Output: Optional[list[dict]] returns the last version of path2file in the repo if it has uncommitted differences"""
    repo = git.Repo(path2repo)
    if repo.git.diff("--", path2file):
        content = repo.head.commit.tree[path2file]
        return json.load(content.data_stream)
    else:
        return None


def get_missing_items(old_data: list[dict], new_data: list[dict], keys: list[str]):
    list = []
    for item in new_data:
        if item not in old_data:
            n = {}
            for k in keys:
                try:
                    n[k] = item[k]
                except KeyError as e:
                    print(f"[WARNING] Missing key: {e}")
            list.append(n)
    return list


def list_fields(data):
    s = ""
    for item in data:
        for k in item.keys():
            s += k + " " + item[k]
            s += "\n"
        s += "\n"
    return s


def log_differences(data):
    if not data:
        print("No difference in files since last commit")
        return
    print(
        f"Change in data: \n{"+" if data["len_diff"] > 0 else ""}{data["len_diff"]} total items")
    print(f"{(len(data["lost_items"]))} deleted items: ")
    print("")
    print(list_fields(data["lost_items"]))

    print(f"{(len(data["new_items"]))} new items:")
    print("")
    print(list_fields(data["new_items"]))

    summary = (
        f"{"+" if data["len_diff"] > 0 else ""}{data["len_diff"]} total items\n"
        f"{len(data['new_items'])} new items:\n"
        f"{list_fields(data["new_items"])}"
        f"{len(data['lost_items'])} deleted items:\n"
        f"{list_fields(data["lost_items"])}")
    emit_output("summary", summary)


def check_differences(path2repo: str, path2file: str, keys: list[str]) -> dict:
    old_data = load_file(path2repo, path2file)
    if old_data is None:
        return None
    with open(path2file, "r") as f:
        new_data = json.load(f)
    len_diff = len(new_data) - len(old_data)
    new_items = get_missing_items(old_data, new_data, keys)
    lost_items = get_missing_items(new_data, old_data, keys)
    return {
        "len_diff": len_diff,
        "new_items": new_items,
        "lost_items": lost_items,
    }


def emit_output(name, value):
    gh_output = os.environ.get("GITHUB_OUTPUT")
    if not gh_output:
        return
    with open(gh_output, "a") as f:
        if "\n" in value:
            f.write(f"{name}<<__EOF__\n{value}\n__EOF__\n")
        else:
            f.write(f"{name}={value}\n")


def main():
    try:
        diffs = check_differences("", "files/log.json",
                                  ["Indirizzo dell'offerta:", "Ragione Sociale:"])
    except json.JSONDecodeError as e:
        print(f"[ERROR] previous version is not valid JSON: {e}")
        sys.exit(1)
    log_differences(diffs)


if __name__ == "__main__":
    main()
