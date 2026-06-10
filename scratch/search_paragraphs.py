import os
from docx import Document

def find_substring(filepath, sub):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return
    doc = Document(filepath)
    print(f"--- Searching in {filepath} for '{sub}' ---")
    count = 0
    for i, p in enumerate(doc.paragraphs):
        if sub.lower() in p.text.lower():
            print(f"Index {i}: {p.text}")
            count += 1
    print(f"Found {count} paragraphs.")

if __name__ == "__main__":
    find_substring("COMMUTE COMPANION Manuscript.docx", "Figure 6")
    find_substring("COMMUTE COMPANION Manuscript.docx", "Figure")
    find_substring("COMMUTE COMPANION Manuscript.docx", "Companion")
