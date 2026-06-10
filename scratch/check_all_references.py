import os
import sys
from docx import Document

sys.stdout.reconfigure(encoding='utf-8')

def check_all_references(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    doc = Document(filepath)
    
    # We will list all authors from the references section
    references = [
        {"num": 159, "name": "Mitropoulos", "full": "Mitropoulos, L., Kortsari, A., & Ayfantopoulou, G. (2021)"},
        {"num": 160, "name": "Anagnostopoulos", "full": "Anagnostopoulos, T. (2021)"},
        {"num": 161, "name": "Anagnostopoulos", "full": "Anagnostopoulos, T., & Ramson, S. R. J. (2025)"},
        {"num": 162, "name": "Zafar", "full": "Zafar, F., Khattak, H. A., Aloqaily, M., & Hussain, R. (2022)"},
        {"num": 163, "name": "Makhdomi", "full": "Makhdomi, A. A., & Gillani, I. A. (2025)"},
        {"num": 164, "name": "Peng", "full": "Peng, Z., Wang, W., Wang, C., & Yu, B. (2026)"},
        {"num": 165, "name": "Cashore", "full": "Cashore, J. M., Frazier, P. I., & Tardos, E. (2022)"},
        {"num": 166, "name": "Makhdomi", "full": "Makhdomi, A. A., & Gillani, I. A. (2024)"},
        {"num": 167, "name": "Calacci", "full": "CALACCI, D., RAO, V. N., DALAL, S., DI, C., PUA, K.-W., SCHWARTZ, A., SPITZBERG, D., & MONROY-HERNANDEZ, A. (2026)"},
        {"num": 168, "name": "Sahebdel", "full": "SAHEBDEL, M., ZEYNALI, A., BASHIR, N., SHENOY, P., & HAJIESMAILI, M. (2025)"},
        {"num": 169, "name": "Psaraftis", "full": "Psaraftis, K., Ntalianis, K. S., & Mastorakis, N. E. (2024)"},
        {"num": 170, "name": "Li", "full": "Li, X., Gao, J., Wang, C., Huang, X., & Nie, Y. (2022)"},
        {"num": 171, "name": "Golightly", "full": "Golightly, D., Altobelli, E., Bassi, N., Buchníček, P., Consonni, C., Juránková, P., Mitropoulos, L., Rizzi, G., Rossi, M., Scrocca, M., Rutanen, E., Kortsari, A., & Niavis, H. (2024)"},
        {"num": 172, "name": "Rao", "full": "VARUN NAGARAJ RAO, SAMANTHA DALAL, EESHA AGARWAL, DANA CALACCI, & ANDRÉS MONROY-HERNÁNDEZ. (2025)"},
        {"num": 173, "name": "Seng", "full": "Seng, K. P., Ang, L.-M., Ngharamike, E., & Peter, E. (2023)"},
        {"num": 174, "name": "Hashikami", "full": "Hashikami, H., Kobayashi, R., Li, Y., Nakano, Y., & Shigeno, M. (2023)"},
        {"num": 175, "name": "Afsari", "full": "Afsari, M., Salehi, S., Miristice, L. M. B., & Gentile, G. (2026)"},
        {"num": 176, "name": "Shah", "full": "Shah, I., El Affendi, M., & Qureshi, B. (2020)"},
        {"num": 177, "name": "Gkartzonikas", "full": "Gkartzonikas, C., & Dimitriou, L. (2025)"},
        {"num": 178, "name": "Dastani", "full": "Dastani, Z., Koosha, H., Karimi, H., & Moghaddam, A. M. (2024)"}
    ]
    
    print("=== Searching for citations of each reference ===")
    for ref in references:
        found_in_text = []
        name_lower = ref["name"].lower()
        for idx, p in enumerate(doc.paragraphs):
            if idx >= 158:
                continue
            if name_lower in p.text.lower():
                found_in_text.append(idx)
        print(f"Ref {ref['num']} ({ref['name']}): found in paragraphs {found_in_text}")

if __name__ == "__main__":
    check_all_references("COMMUTE COMPANION Manuscript_Formatted.docx")
