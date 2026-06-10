import os
from docx import Document

def update_home_screen_desc(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return False
        
    doc = Document(filepath)
    found = False
    
    for i, p in enumerate(doc.paragraphs):
        if "This home tab has five sections" in p.text:
            print(f"Found paragraph in {filepath} at index {i}:")
            print(p.text)
            
            # Replace the text of this paragraph
            p.text = (
                "The Home Screen serves as the primary navigation and search hub for commuters using the Commute Companion Mobile App. "
                "It consists of several key components. At the top of the screen, a search input field allows users to search for and input their desired destination ('Where are you going?') to set their routes. "
                "It also includes a history shortcut and a green microphone icon that triggers voice-activated commands. "
                "The central area features an interactive map displaying the user's current location, the chosen route, and pins for destination landmarks. "
                "Below the map, a summary card displays the current location (e.g., Bogo City), nearby rides status (e.g., '0 rides nearby'), and details of the set route from Poblacion to Bogo City Hall. "
                "Quick action buttons such as 'Set Route', 'Home', 'Work', and 'Saved' are available for rapid navigation setup. "
                "Finally, a bottom navigation bar allows users to toggle between the 'Home', 'Rides', 'Hub', 'Activity', and 'Profile' tabs."
            )
            
            # Format the text runs (Times New Roman, 12pt)
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = docx.shared.Pt(12)
            
            found = True
            
    if found:
        doc.save(filepath)
        print(f"Successfully updated and saved: {filepath}")
    else:
        print(f"Could not find the target text in: {filepath}")
    return found

if __name__ == "__main__":
    import docx # to import Pt
    
    # Run updates on both documents
    update_home_screen_desc("COMMUTE COMPANION Manuscript.docx")
    update_home_screen_desc("COMMUTE COMPANION Manuscript_Formatted.docx")
