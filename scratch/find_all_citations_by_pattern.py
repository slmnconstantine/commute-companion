import os
import re
import sys
from docx import Document

sys.stdout.reconfigure(encoding='utf-8')

def find_all_citations(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    doc = Document(filepath)
    
    # regex for:
    # 1. Narrative citation: Name(s) (Year) -> e.g. Seng et al. (2023) or Smith (1998)
    # 2. Parenthetical citation: (Names, Year) -> e.g. (Smit et al., 1998)
    pattern_narrative = re.compile(r'\b([A-Z][a-zA-Z\s\-\&,]+)\((\d{4})\)')
    pattern_parenthetical = re.compile(r'\(([^)]*,?\s*\d{4}[^)]*)\)')
    
    print("=== Scanning Paragraphs for Citation Patterns ===")
    for idx, p in enumerate(doc.paragraphs):
        if idx >= 158: # references
            continue
        text = p.text
        
        narrative_matches = pattern_narrative.findall(text)
        parenthetical_matches = pattern_parenthetical.findall(text)
        
        if narrative_matches or parenthetical_matches:
            print(f"Paragraph {idx}:")
            print(f"  Content: {text}")
            if narrative_matches:
                print(f"  Narrative Matches: {narrative_matches}")
            if parenthetical_matches:
                print(f"  Parenthetical Matches: {parenthetical_matches}")
            print()

if __name__ == "__main__":
    find_all_citations("COMMUTE COMPANION Manuscript_Formatted.docx")
