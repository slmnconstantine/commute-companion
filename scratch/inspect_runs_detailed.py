import os
import sys
from docx import Document

def inspect_runs_to_file(filepath, output_path):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    doc = Document(filepath)
    target_paras = [32, 33, 34, 35, 36, 42, 43, 44]
    
    with open(output_path, "w", encoding="utf-8") as f:
        for idx in target_paras:
            p = doc.paragraphs[idx]
            f.write(f"=== Paragraph {idx} runs ===\n")
            f.write(f"Full Text: {p.text}\n")
            for r_idx, r in enumerate(p.runs):
                f.write(f"  Run {r_idx}: '{r.text}' (bold={r.bold}, italic={r.italic}, font={r.font.name}, size={r.font.size})\n")
            f.write("\n")
            
    print(f"Inspection complete. Saved to {output_path}")

if __name__ == "__main__":
    inspect_runs_to_file("COMMUTE COMPANION Manuscript_Formatted.docx", "scratch/runs_detailed.txt")
