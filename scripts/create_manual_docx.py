import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_manual_docx():
    doc = Document()

    # Page setup - 1 inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    # Color Palette
    PRIMARY = RGBColor(0, 87, 255)      # #0057FF Blue
    DARK_BLUE = RGBColor(10, 30, 74)    # #0A1E4A
    TEXT_MAIN = RGBColor(15, 23, 42)    # #0F172A
    TEXT_MUTED = RGBColor(71, 85, 105)  # #475569
    SUCCESS = RGBColor(22, 163, 74)     # #16A34A
    AMBER = RGBColor(217, 119, 6)       # #D97706
    GRAY_BORDER = "CBD5E1"
    GRAY_BG = "F1F5F9"
    PRIMARY_SUBTLE_HEX = "EFF4FF"
    CALLOUT_BG_HEX = "FFFBEB"
    CALLOUT_BORDER_HEX = "FDE68A"
    VOICE_BG_HEX = "F5F3FF"
    VOICE_BORDER_HEX = "DDD6FE"

    # Base Normal Style
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Arial'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = TEXT_MAIN
    normal_style.paragraph_format.line_spacing = 1.2
    normal_style.paragraph_format.space_after = Pt(4)

    # Helper: set cell background
    def set_cell_bg(cell, hex_color):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    # Helper: set cell padding
    def set_cell_padding(cell, top=120, bottom=120, left=180, right=180):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    # Helper: add callout box
    def add_callout(text_prefix, text_body, bg_hex, border_hex, icon="💡"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.8)
        set_cell_bg(cell, bg_hex)
        set_cell_padding(cell, top=120, bottom=120, left=200, right=200)

        # border
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="{border_hex}"/>
                <w:left w:val="single" w:sz="18" w:space="0" w:color="{border_hex}"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{border_hex}"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="{border_hex}"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)

        cp = cell.paragraphs[0]
        cp.paragraph_format.space_before = Pt(0)
        cp.paragraph_format.space_after = Pt(0)
        cp.paragraph_format.line_spacing = 1.15
        
        run_icon = cp.add_run(f"{icon} {text_prefix} ")
        run_icon.bold = True
        run_icon.font.name = 'Arial'
        run_icon.font.size = Pt(10)
        run_icon.font.color.rgb = DARK_BLUE

        run_body = cp.add_run(text_body)
        run_body.font.name = 'Arial'
        run_body.font.size = Pt(10)
        run_body.font.color.rgb = TEXT_MAIN

        p_after = doc.add_paragraph()
        p_after.paragraph_format.space_before = Pt(0)
        p_after.paragraph_format.space_after = Pt(4)

    # ── Header Banner ──
    banner_tbl = doc.add_table(rows=1, cols=1)
    banner_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    banner_tbl.autofit = False
    bcell = banner_tbl.cell(0, 0)
    bcell.width = Inches(6.8)
    set_cell_bg(bcell, "0A1E4A")
    set_cell_padding(bcell, top=260, bottom=260, left=300, right=300)

    bp = bcell.paragraphs[0]
    bp.paragraph_format.space_before = Pt(0)
    bp.paragraph_format.space_after = Pt(2)
    run_tag = bp.add_run("OFFICIAL OPERATIONAL & TESTING MANUAL")
    run_tag.bold = True
    run_tag.font.name = 'Arial'
    run_tag.font.size = Pt(8.5)
    run_tag.font.color.rgb = RGBColor(191, 219, 254)

    bp2 = bcell.add_paragraph()
    bp2.paragraph_format.space_before = Pt(4)
    bp2.paragraph_format.space_after = Pt(6)
    run_title = bp2.add_run("Commute Companion")
    run_title.bold = True
    run_title.font.name = 'Arial'
    run_title.font.size = Pt(24)
    run_title.font.color.rgb = RGBColor(255, 255, 255)

    bp3 = bcell.add_paragraph()
    bp3.paragraph_format.space_before = Pt(0)
    bp3.paragraph_format.space_after = Pt(8)
    run_sub = bp3.add_run("Complete End-to-End User Flow Manual for Commuters and Drivers, Realtime Tracking, Voice AI Assistants, and Demo Overrides.")
    run_sub.font.name = 'Arial'
    run_sub.font.size = Pt(11)
    run_sub.font.color.rgb = RGBColor(226, 232, 240)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(6)
    p_spacer.paragraph_format.space_after = Pt(6)

    # ── Prerequisites Box ──
    add_callout(
        "Prerequisites & System Permissions:",
        "Ensure device permissions are granted on first launch: Foreground Location (for GPS map positioning and route broadcasting), Camera (for Government ID and Live Face Capture), and Microphone (for Voice AI Assistant).",
        GRAY_BG,
        GRAY_BORDER,
        icon="⚙️"
    )

    # ── Section 1: Commuter Flow ──
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    h1.paragraph_format.keep_with_next = True
    r_h1 = h1.add_run("Part 1: Commuter User Flow")
    r_h1.bold = True
    r_h1.font.name = 'Arial'
    r_h1.font.size = Pt(16)
    r_h1.font.color.rgb = PRIMARY

    commuter_steps = [
        (
            "1. Register Account",
            "Welcome Screen → 'Get Started' / 'Sign Up'",
            "Fill out registration form: Full Name (e.g., Maria Santos), Email Address (e.g., maria.commuter@example.com), 11-digit Phone Number (e.g., 09171234567), and Password (minimum 8 characters). Tap 'Create Account'."
        ),
        (
            "2. Verify Account in Email",
            "User Email Inbox",
            "Open your registered email inbox. Look for the Supabase confirmation email from Commute Companion (Subject: Confirm Your Signup) and click 'Confirm your email'. Return to the app."
        ),
        (
            "3. Sign In",
            "Sign In Screen",
            "Enter your registered email and password. Tap 'Sign In'. You will land on the Home screen displaying the interactive map centered on your GPS position."
        ),
        (
            "4. Set Commute Route",
            "Home Screen → 'Set Route' Pill",
            "Tap the blue 'Set Route' pill on the Home bottom card (or go to Rides tab → tap 'Pin Route on Map').\n• Origin / Pickup: Select or tap map (e.g., Sudlonon / San Remigio).\n• Destination / Drop-off: Select destination (e.g., Bogo City Hall / Bogo).\nReview the connected road polyline with distance and estimated duration, then tap 'Save Commute Corridor'."
        ),
        (
            "5. Post in Community Hub (Voice AI)",
            "Floating Blue Mic FAB → Hub Tab",
            "Tap the floating blue Microphone FAB at the bottom right to open the Voice Assistant Sheet. Speak: \"Good morning, fellow commuters\" (or type it in the assistant text prompt). Review the AI post preview and tap 'Confirm'. Switch to the Hub tab to see your post live in the Route Community feed."
        ),
        (
            "6. Back to Home Page and Broadcast Location",
            "Home Map Screen",
            "Return to the Home tab. Locate the floating action buttons on the right side of the map. Tap the Eye icon button (routeVisible toggle). When active (highlighted blue), your device streams live GPS coordinates to other commuters along the corridor via Supabase Realtime presence."
        ),
        (
            "7. Mention User in Community Hub",
            "Hub Tab → Author Profile Card",
            "Tap the Hub tab. Find any post authored by another user. Tap the user's Avatar to open their Profile Card Modal. Tap 'Mention in Community Hub'. Type your message (e.g., \"@Juan Are you heading to Bogo this afternoon?\") and tap 'Post'. The mentioned user instantly receives an in-app notification."
        ),
        (
            "8. Verify Account in Profile Page (With Demo Override)",
            "Profile Tab → Identity Verification",
            "Tap Profile tab → tap 'Identity Verification'. Standard flow uploads ID and selfie. For demo testing: scroll to the bottom and tap 'Demo: Instantly Verify Me (Override) ⚡' to immediately gain the verified checkmark badge."
        ),
        (
            "9. Post a Ride Request in Rides Tab",
            "Rides Tab → Search Rides",
            "Under the Search Rides segment with your active route set, tap 'Post \"Looking for a Ride\" Request' (megaphone icon). Specify seats needed (e.g., 1 Seat), desired departure date and time, and tap 'Submit Request'."
        ),
        (
            "10. Book Requested Ride with Live Face Capture",
            "Rides Tab → Trip Details → Book",
            "Browse open matching rides in the Rides tab. Tap on an available trip card to open Trip Details. Tap 'Request to Join Ride'. In the Live Face Capture modal, position your face in the oval frame and tap 'Take Live Photo'. Confirm the capture and tap 'Confirm & Request Booking'."
        ),
        (
            "11. Send Messages in Ride Group Chat",
            "Trip Screen → Trip Chat",
            "Inside the Trip screen (/ride/[id]), tap 'Open Trip Chat'. Type coordination messages (e.g., \"Hi driver, I am waiting at the corner in a blue jacket\"). Messages synchronize in real time across the driver and all passengers."
        ),
        (
            "12. Leave a Rating for Driver",
            "Post-Trip Rating Screen",
            "Once the driver completes the ride, the Rate Your Trip modal opens. Select a star rating (1–5 stars), choose compliment tags (Safe Driver, Punctual, Clean Vehicle), write optional review comments, and tap 'Submit Rating'."
        ),
        (
            "13. View Activity Tab to Check Past Rides",
            "Activity Tab",
            "Tap the Activity tab. Review completed trips, dates, and total fare paid. Tap any past ride card to inspect the comprehensive Trip Summary breakdown (base fare, platform fee, driver details)."
        ),
        (
            "14. Explore Profile Screen",
            "Profile Tab",
            "Explore your commuter statistics, verification badge, ICE Emergency Contacts, and toggle between Dark Mode and Light Mode."
        ),
        (
            "15. Logout",
            "Profile Tab → Bottom",
            "Scroll to the bottom of the Profile tab. Tap red 'Sign Out' and confirm in the dialog to safely return to the Welcome screen."
        )
    ]

    for step_title, nav_path, body_text in commuter_steps:
        p_step = doc.add_paragraph()
        p_step.paragraph_format.space_before = Pt(8)
        p_step.paragraph_format.space_after = Pt(2)
        p_step.paragraph_format.keep_with_next = True
        
        r_title = p_step.add_run(step_title)
        r_title.bold = True
        r_title.font.name = 'Arial'
        r_title.font.size = Pt(12)
        r_title.font.color.rgb = DARK_BLUE

        r_nav = p_step.add_run(f"  [{nav_path}]")
        r_nav.font.name = 'Arial'
        r_nav.font.size = Pt(9.5)
        r_nav.font.color.rgb = PRIMARY

        p_desc = doc.add_paragraph()
        p_desc.paragraph_format.space_before = Pt(0)
        p_desc.paragraph_format.space_after = Pt(6)
        r_desc = p_desc.add_run(body_text)
        r_desc.font.name = 'Arial'
        r_desc.font.size = Pt(10)
        r_desc.font.color.rgb = TEXT_MUTED

    # ── Section 2: Driver Flow ──
    doc.add_page_break()

    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(16)
    h2.paragraph_format.space_after = Pt(6)
    h2.paragraph_format.keep_with_next = True
    r_h2 = h2.add_run("Part 2: Driver User Flow")
    r_h2.bold = True
    r_h2.font.name = 'Arial'
    r_h2.font.size = Pt(16)
    r_h2.font.color.rgb = PRIMARY

    driver_steps = [
        (
            "1. Register Account",
            "Welcome Screen → Sign Up",
            "Register a driver candidate account with Full Name, Email, Phone Number, and Password. Tap 'Create Account'."
        ),
        (
            "2. Verify Account in Email",
            "Driver Email Inbox",
            "Open confirmation email and click 'Confirm your email'. Return to app."
        ),
        (
            "3. Sign In",
            "Sign In Screen",
            "Sign in with the driver credentials to access the interactive Home map."
        ),
        (
            "4. Set Commute Route",
            "Home Screen → Set Route",
            "Tap 'Set Route' on the bottom card. Pin the driver regular corridor (e.g., Sudlonon → Bogo City Hall) and tap 'Save Commute Corridor'."
        ),
        (
            "5. Post in Community Hub (Voice AI)",
            "Floating Blue Mic FAB",
            "Tap the floating blue Microphone FAB on the Home screen. Speak: \"How is the road today?\". The assistant automatically tags the post under road condition / traffic. Review preview and tap 'Confirm'."
        ),
        (
            "6. Become a Driver (With Demo Override)",
            "Profile Tab → Become a Driver",
            "Tap Profile → 'Become a Driver'. Scroll to the bottom and tap 'Override Verification (Demo)'. Select Tricycle (TODA) [3 seats], Sedan (Private) [4 seats], or Motorcycle [1 seat]. System instantly registers vehicle and upgrades role to driver with verified badge."
        ),
        (
            "7. Offer Ride to Commuter Request with Live Face Capture",
            "Rides Tab → Post a Ride",
            "Switch to 'Post a Ride' segment. Specify available seats, departure time, and passenger contribution (e.g., ₱50). Under Live Face Verification, tap 'Capture Live Verification Photo', align face, and snap photo. Tap 'Create & Offer Trip'."
        ),
        (
            "8. Send Messages in Ride Group Chat",
            "Trip Screen → Trip Chat",
            "Open created trip → tap 'Trip Chat'. Send passenger announcements: \"Leaving in 10 minutes from town terminal\"."
        ),
        (
            "9. Start the Ride",
            "Trip Management Screen (/ride/[id])",
            "In DriverBookingsList, review passenger requests and live face capture photos. Tap 'Accept'. When departing, tap the green 'Start Trip' button. High-accuracy GPS broadcasting begins moving your vehicle marker live along the route polyline."
        ),
        (
            "10. Complete Ride",
            "Ongoing Trip Screen",
            "Upon arrival at destination, tap 'Complete Trip' and confirm. System marks passengers arrived, credits net driver payout, and accrues the 10% platform fee balance."
        ),
        (
            "11. View Activity Tab to Check Past Rides",
            "Activity Tab",
            "Open Activity tab to review driver gross revenue, completed trip counter, average star rating, and passenger fare receipts."
        ),
        (
            "12. Simulate Payment of Platform Fees",
            "Profile Tab → Outstanding Fees → Pay",
            "In Profile tab, locate 'Outstanding Platform Fees' tile (shows accrued 10% fee, e.g., ₱15.00). Tap 'Pay' → tap 'Pay Full Balance' → tap 'Authorize Simulated Test Payment'. The built-in simulator authorizes and deducts the fee in Supabase, resetting balance to ₱0.00."
        ),
        (
            "13. Explore Profile Screen",
            "Profile Tab",
            "Inspect My Vehicle details, driver rating breakdown, Transaction Summary, and appearance settings."
        ),
        (
            "14. Logout",
            "Profile Tab → Bottom",
            "Scroll to bottom of Profile tab → tap red 'Sign Out' to complete testing."
        )
    ]

    for step_title, nav_path, body_text in driver_steps:
        p_step = doc.add_paragraph()
        p_step.paragraph_format.space_before = Pt(8)
        p_step.paragraph_format.space_after = Pt(2)
        p_step.paragraph_format.keep_with_next = True
        
        r_title = p_step.add_run(step_title)
        r_title.bold = True
        r_title.font.name = 'Arial'
        r_title.font.size = Pt(12)
        r_title.font.color.rgb = DARK_BLUE

        r_nav = p_step.add_run(f"  [{nav_path}]")
        r_nav.font.name = 'Arial'
        r_nav.font.size = Pt(9.5)
        r_nav.font.color.rgb = PRIMARY

        p_desc = doc.add_paragraph()
        p_desc.paragraph_format.space_before = Pt(0)
        p_desc.paragraph_format.space_after = Pt(6)
        r_desc = p_desc.add_run(body_text)
        r_desc.font.name = 'Arial'
        r_desc.font.size = Pt(10)
        r_desc.font.color.rgb = TEXT_MUTED

    # ── Section 3: Quick Reference Table ──
    doc.add_page_break()

    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(16)
    h3.paragraph_format.space_after = Pt(8)
    h3.paragraph_format.keep_with_next = True
    r_h3 = h3.add_run("Quick Reference: Demo Shortcuts & Overrides")
    r_h3.bold = True
    r_h3.font.name = 'Arial'
    r_h3.font.size = Pt(15)
    r_h3.font.color.rgb = PRIMARY

    table_data = [
        ("Action", "How to Trigger", "System Result"),
        ("Instant Commuter Verification", "Profile → Verification → Tap 'Demo: Instantly Verify Me (Override) ⚡'", "Bypasses manual government document review; sets verified badge immediately."),
        ("Instant Driver Setup", "Profile → Become a Driver → Tap 'Override Verification (Demo)'", "Select Tricycle / Sedan / Motorcycle; registers vehicle and enables driver status."),
        ("Simulate Platform Fee Payment", "Profile → Outstanding Platform Fees → Pay → Tap 'Authorize Simulated Test Payment'", "Deducts platform fee balance in database without requiring real bank/e-wallet credentials."),
        ("Voice AI Post to Hub", "Tap Floating Blue Mic FAB → Speak phrase → Tap 'Confirm'", "Parses audio transcript, formats post preview, and publishes directly to Route Community feed."),
        ("Broadcast Presence", "Home → Tap Eye icon FAB on right edge of map", "Streams high-accuracy GPS coordinates to all commuters along the corridor."),
        ("Live Face Capture", "Ride Booking or Create Trip → Tap 'Capture Live Verification Photo'", "Snaps live selfie with face detection for commuter / driver verification.")
    ]

    ref_tbl = doc.add_table(rows=len(table_data), cols=3)
    ref_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    ref_tbl.autofit = False

    col_widths = [Inches(1.8), Inches(2.2), Inches(2.8)]

    for row_idx, row in enumerate(ref_tbl.rows):
        for col_idx, cell in enumerate(row.cells):
            cell.width = col_widths[col_idx]
            set_cell_padding(cell, top=100, bottom=100, left=140, right=140)
            text = table_data[row_idx][col_idx]
            cp = cell.paragraphs[0]
            cp.paragraph_format.space_before = Pt(0)
            cp.paragraph_format.space_after = Pt(0)
            run = cp.add_run(text)
            run.font.name = 'Arial'
            run.font.size = Pt(9.5)

            if row_idx == 0:
                set_cell_bg(cell, "0A1E4A")
                run.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
            else:
                if row_idx % 2 == 1:
                    set_cell_bg(cell, "F8FAFC")
                else:
                    set_cell_bg(cell, "FFFFFF")
                
                if col_idx == 0:
                    run.bold = True
                    run.font.color.rgb = DARK_BLUE
                else:
                    run.font.color.rgb = TEXT_MUTED

            # Add borders
            tcPr = cell._tc.get_or_add_tcPr()
            tcBorders = parse_xml(f'''
                <w:tcBorders {nsdecls("w")}>
                    <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                    <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                    <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                </w:tcBorders>
            ''')
            tcPr.append(tcBorders)

    # Footer note
    p_footer = doc.add_paragraph()
    p_footer.paragraph_format.space_before = Pt(24)
    p_footer.paragraph_format.space_after = Pt(0)
    p_footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_foot = p_footer.add_run("Commute Companion • Operational & Testing Manual • Editable Document (.docx)")
    r_foot.font.name = 'Arial'
    r_foot.font.size = Pt(8.5)
    r_foot.font.color.rgb = RGBColor(148, 163, 184)

    output_path = r"c:\Users\iansa\Desktop\System\commute-companion\USER_FLOW_MANUAL.docx"
    doc.save(output_path)
    print(f"Successfully generated DOCX at {output_path} (Size: {os.path.getsize(output_path)} bytes)")

if __name__ == "__main__":
    create_manual_docx()
