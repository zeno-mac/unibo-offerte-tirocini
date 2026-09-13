import git
import os
import json
from typing import Optional
import sys
from config import load_config

def load_file(path2repo: str, path2file: str) -> Optional[list[dict]]:
    """Input: path2repo (str) path to the git repo root, path2file (str)
    path to a JSON file tracked in that repo, relative to path2repo.
    Output: the JSON content (list[dict]) of path2file as of the last
    commit (HEAD), or None if the working tree copy has no uncommitted
    changes relative to HEAD (i.e. nothing new to diff against)."""
    repo = git.Repo(path2repo)
    if repo.git.diff("--", path2file):
        content = repo.head.commit.tree[path2file]
        return json.load(content.data_stream)
    else:
        return None


def get_missing_items(old_data: list[dict], new_data: list[dict], keys: list[str]):
    """Input: old_data (list[dict]), new_data (list[dict]), keys (list[str])
    the fields to keep for each result. Output: list[dict]; the items of
    new_data not present (by full equality) in old_data, each reduced to
    just the given keys (missing keys are skipped with a [WARNING]).
    Called both ways round: (old, new) gives additions, (new, old) gives
    removals."""
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
    """Input: data (list[dict]). Output: str; every item rendered as
    "key value" lines (one per field), items separated by a blank line."""
    s = ""
    for item in data:
        for k in item.keys():
            s += k + " " + item[k]
            s += "\n"
        s += "\n"
    return s


def log_differences(data):
    """Input: data (dict | None) as returned by check_differences, with
    'len_diff', 'new_items' and 'lost_items'. Output: None; prints a
    human-readable summary to stdout and, via emit_output, writes a
    "summary" entry to $GITHUB_OUTPUT when running in CI. If data is None
    (no committed version to diff against) it just prints a no-op message."""
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
    """Input: path2repo (str), path2file (str) as in load_file; keys
    (list[str]) fields to keep when reporting new/lost items. Output:
    dict with 'len_diff' (int, new count - old count), 'new_items' and
    'lost_items' (list[dict]), or None if there is no last-committed
    version to compare the current path2file contents against."""
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
    """Input: name (str), value (str). Output: None; appends a
    `name=value` line (or a `name<<__EOF__ ... __EOF__` block for
    multi-line values) to the file at $GITHUB_OUTPUT. No-op outside CI,
    when that env var is not set."""
    gh_output = os.environ.get("GITHUB_OUTPUT")
    if not gh_output:
        return
    with open(gh_output, "a") as f:
        if "\n" in value:
            f.write(f"{name}<<__EOF__\n{value}\n__EOF__\n")
        else:
            f.write(f"{name}={value}\n")


def main():
    """Input: None. Output: None. Compares the committed vs. working-tree
    copy of the configured extracurricular_internship data file and logs
    the differences; exits with status 1 if the committed copy is not
    valid JSON."""
    config = load_config()
    try:

        diffs = check_differences("", config["extracurricular_internship"]["file_path"],
                                  config["extracurricular_internship"]["keys"])
    except json.JSONDecodeError as e:
        print(f"[ERROR] previous version is not valid JSON: {e}")
        sys.exit(1)
    log_differences(diffs)


if __name__ == "__main__":
    main()
