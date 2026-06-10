import os
import sys
from docx import Document

def extract_citations(filepath, output_path):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    doc = Document(filepath)
    search_terms = [
        "seng", "li", "golightly", "hashikami", "rao", "anagnostopoulos",
        "dastani", "psaraftis", "shah", "peng", "afsari", "gkartzonikas",
        "makhdomi", "zafar", "mitropoulos"
    ]
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("=== ALL CITATIONS IN DOCUMENT PARAGRAPHS ===\n\n")
        for idx, p in enumerate(doc.paragraphs):
            text_lower = p.text.lower()
            found = [term for term in search_terms if term in text_lower]
            if found:
                f.write(f"Paragraph {idx} (Found: {found}):\n")
                f.write(f"{p.text}\n\n")
                
    print(f"Extraction complete. Saved to {output_path}")

if __name__ == "__main__":
    extract_citations("COMMUTE COMPANION Manuscript_Formatted.docx", "scratch/extracted_paragraphs.txt")
