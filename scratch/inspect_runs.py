import os
import sys
from docx import Document

sys.stdout.reconfigure(encoding='utf-8')

def inspect_runs(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    doc = Document(filepath)
    target_paras = [32, 33, 34, 35, 36, 42, 43, 44]
    
    for idx in target_paras:
        p = doc.paragraphs[idx]
        print(f"=== Paragraph {idx} runs ===")
        for r_idx, r in enumerate(p.runs):
            print(f"  Run {r_idx}: '{r.text}' (bold={r.bold}, italic={r.italic})")
        print()

if __name__ == "__main__":
    inspect_runs("COMMUTE COMPANION Manuscript_Formatted.docx")
