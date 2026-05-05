import os
import sys
import json
import subprocess

NOTEBOOK_ID = "27fdd704-1879-4191-acae-94be6cc9b245"
KNOWLEDGE_DIR = "knowledge"

def run_command(cmd):
    """Run a shell command and return its stdout as a string."""
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command '{cmd}': {e.stderr}")
        return None

def main():
    if not os.path.exists(KNOWLEDGE_DIR):
        os.makedirs(KNOWLEDGE_DIR)
        print(f"Created directory: {KNOWLEDGE_DIR}")

    print(f"Fetching source list for notebook {NOTEBOOK_ID}...")
    list_cmd = f"notebooklm source list -n {NOTEBOOK_ID} --json"
    output = run_command(list_cmd)
    if not output:
        print("Failed to fetch source list.")
        sys.exit(1)

    try:
        data = json.loads(output)
        sources = data.get("sources", [])
    except json.JSONDecodeError:
        print("Failed to parse JSON output.")
        sys.exit(1)

    print(f"Found {len(sources)} sources. Starting synchronization...")

    metadata = []

    for idx, source in enumerate(sources, 1):
        source_id = source.get("id")
        title = source.get("title", f"source_{source_id}")
        # Clean title for filename
        clean_title = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in title)
        filename = f"{clean_title}.txt"
        filepath = os.path.join(KNOWLEDGE_DIR, filename)

        print(f"[{idx}/{len(sources)}] Syncing: {title} ({source_id})")
        
        # Save to metadata list
        metadata.append({
            "id": source_id,
            "title": title,
            "filename": filename,
            "type": source.get("type", "unknown")
        })

        if os.path.exists(filepath):
            print(f"  -> Already exists, skipping: {filename}")
            continue

        cmd = f"notebooklm source fulltext {source_id} -n {NOTEBOOK_ID} -o {filepath}"
        res = run_command(cmd)
        if res is not None:
            print(f"  -> Saved to {filename}")
        else:
            print(f"  -> Failed to sync {title}")

    # Save metadata index
    meta_path = os.path.join(KNOWLEDGE_DIR, "metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"\nSync complete. Metadata saved to {meta_path}")

if __name__ == "__main__":
    main()
