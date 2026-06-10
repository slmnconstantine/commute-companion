import os

def find_word_files():
    root_dir = r"c:\Users\iansa\Desktop\System\commute-companion"
    for root, dirs, files in os.walk(root_dir):
        if any(ignored in root for ignored in [".git", "node_modules", ".expo"]):
            continue
        for file in files:
            if file.lower().endswith((".docx", ".doc")):
                filepath = os.path.join(root, file)
                print(f"Found: {filepath} ({os.path.getsize(filepath)} bytes)")

if __name__ == "__main__":
    find_word_files()
