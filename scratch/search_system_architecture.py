import os
import sys
from docx import Document

sys.stdout.reconfigure(encoding='utf-8')

def find_system_arch_text(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    doc = Document(filepath)
    print("=== Searching for System Architecture Diagram in text ===")
    for idx, p in enumerate(doc.paragraphs):
        if any(term in p.text.lower() for term in ["figure 2", "system architecture"]):
            print(f"[{idx}]: {p.text}\n")

if __name__ == "__main__":
    find_system_arch_text("COMMUTE COMPANION Manuscript_Formatted.docx")
