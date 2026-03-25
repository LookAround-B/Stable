#!/usr/bin/env python3
"""
EFM Stable - Tab-wise Fields & Components Documentation Generator
Generates a comprehensive PDF documenting all pages, tabs, fields, and components
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime

# Document setup
OUTPUT_FILE = "EFM_Stable_APP_DOCUMENTATION.pdf"
doc = SimpleDocTemplate(OUTPUT_FILE, pagesize=A4, rightMargin=0.5*inch, leftMargin=0.5*inch,
                        topMargin=0.75*inch, bottomMargin=0.75*inch)

# Styles
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#1f2937'),
    spaceAfter=6,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold'
)

heading1_style = ParagraphStyle(
    'CustomHeading1',
    parent=styles['Heading1'],
    fontSize=16,
    textColor=colors.HexColor('#1f2937'),
    spaceAfter=12,
    spaceBefore=12,
    fontName='Helvetica-Bold',
    borderColor=colors.HexColor('#3b82f6'),
    borderWidth=2,
    borderPadding=6,
    borderRadius=4
)

heading2_style = ParagraphStyle(
    'CustomHeading2',
    parent=styles['Heading2'],
    fontSize=13,
    textColor=colors.HexColor('#374151'),
    spaceAfter=8,
    spaceBefore=8,
    fontName='Helvetica-Bold'
)

heading3_style = ParagraphStyle(
    'CustomHeading3',
    parent=styles['Heading3'],
    fontSize=11,
    textColor=colors.HexColor('#4b5563'),
    spaceAfter=6,
    fontName='Helvetica-Bold'
)

normal_style = ParagraphStyle(
    'CustomNormal',
    parent=styles['Normal'],
    fontSize=9,
    textColor=colors.HexColor('#1f2937'),
    alignment=TA_JUSTIFY
)

tab_name_style = ParagraphStyle(
    'TabName',
    parent=styles['Normal'],
    fontSize=10,
    textColor=colors.HexColor('#065f46'),
    fontName='Helvetica-Bold'
)

field_style = ParagraphStyle(
    'FieldStyle',
    parent=styles['Normal'],
    fontSize=9,
    textColor=colors.HexColor('#374151'),
    leftIndent=12
)

elements = []

# Title Page
elements.append(Spacer(1, 0.5*inch))
elements.append(Paragraph("EFM STABLE", title_style))
elements.append(Spacer(1, 0.1*inch))
elements.append(Paragraph("Comprehensive App Documentation", 
                         ParagraphStyle('subtitle', parent=styles['Normal'], 
                                      fontSize=14, alignment=TA_CENTER, 
                                      textColor=colors.HexColor('#6b7280'))))
elements.append(Spacer(1, 0.1*inch))
elements.append(Paragraph(f"Tab-wise Fields & Components", 
                         ParagraphStyle('subtitle2', parent=styles['Normal'], 
                                      fontSize=12, alignment=TA_CENTER, 
                                      textColor=colors.HexColor('#9ca3af'))))
elements.append(Spacer(1, 0.2*inch))
elements.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", 
                         ParagraphStyle('date', parent=styles['Normal'], 
                                      fontSize=10, alignment=TA_CENTER, 
                                      textColor=colors.HexColor('#d1d5db'))))
elements.append(PageBreak())

# Table of Contents
elements.append(Paragraph("TABLE OF CONTENTS", heading1_style))
elements.append(Spacer(1, 0.15*inch))

toc_items = [
    "1. Approval & Task Management",
    "2. Attendance & Time Tracking",
    "3. Horse & Staff Management",
    "4. Health & Medical Records",
    "5. Equipment & Inventory",
    "6. Work Records & Reporting",
    "7. Financial Records",
    "8. Common Features & Components",
]

for item in toc_items:
    elements.append(Paragraph(item, normal_style))
    elements.append(Spacer(1, 0.08*inch))

elements.append(PageBreak())

# SECTION 1: APPROVAL & TASK MANAGEMENT
elements.append(Paragraph("1. APPROVAL & TASK MANAGEMENT", heading1_style))

# ApprovalTasksPage
elements.append(Paragraph("ApprovalTasksPage", heading2_style))
elements.append(Paragraph("<b>Tabs:</b>", normal_style))
elements.append(Spacer(1, 0.05*inch))

approval_tabs = [
    ("Pending Reviews", [
        "Task/Medicine details",
        "Status, evidence photos",
        "Assigned employee/horse",
        "Approve/Reject buttons",
        "Completion notes/time"
    ]),
    ("Approved", [
        "Approved items list",
        "Approver information",
        "Status badges",
        "Timestamp details"
    ])
]

for tab_name, fields in approval_tabs:
    elements.append(Paragraph(f"<b>Tab: {tab_name}</b>", tab_name_style))
    for field in fields:
        elements.append(Paragraph(f"• {field}", field_style))
    elements.append(Spacer(1, 0.08*inch))

# TasksPage
elements.append(Paragraph("TasksPage", heading2_style))
elements.append(Paragraph("<b>Key Features:</b>", normal_style))

task_features = [
    "Task Types: 8 types available",
    "Priority Levels: High, Medium, Low",
    "Status: Pending, In Progress, Completed, Rejected",
    "Fields: Name, Type, Description, Horse, Assigned Employee, Priority, Scheduled Time",
    "Evidence: Photo upload with proof images",
    "Actions: Create, Edit, Delete, Approve, Reject"
]

for feature in task_features:
    elements.append(Paragraph(f"• {feature}", field_style))
elements.append(Spacer(1, 0.15*inch))

# SECTION 2: ATTENDANCE
elements.append(PageBreak())
elements.append(Paragraph("2. ATTENDANCE & TIME TRACKING", heading1_style))

# DailyAttendancePage
elements.append(Paragraph("DailyAttendancePage", heading2_style))
elements.append(Paragraph("<b>Features:</b>", normal_style))

daily_att_features = [
    "Groom Check-in/Check-out Roster",
    "Employee List with Status Toggle",
    "Fields: Name, Email, Check-In Time, Check-Out Time, Status",
    "Status: IN / OUT indicator",
    "Pagination support",
    "Searchable employee list"
]

for feature in daily_att_features:
    elements.append(Paragraph(f"• {feature}", field_style))
elements.append(Spacer(1, 0.08*inch))

# GateAttendancePage
elements.append(Paragraph("GateAttendancePage", heading2_style))

gate_tabs = [
    ("Staff Entry/Exit", [
        "Staff member selection",
        "Entry/Exit time logging",
        "Shift information",
        "Supervisor/Guard tracking"
    ]),
    ("Visitor Log", [
        "Visitor name",
        "Person type (employee/visitor)",
        "Entry/Exit times",
        "Purpose of visit",
        "Guard/Staff recording"
    ])
]

for tab_name, fields in gate_tabs:
    elements.append(Paragraph(f"<b>Tab: {tab_name}</b>", tab_name_style))
    for field in fields:
        elements.append(Paragraph(f"• {field}", field_style))
    elements.append(Spacer(1, 0.08*inch))

# AttendancePage
elements.append(Paragraph("AttendancePage", heading2_style))
elements.append(Paragraph("<b>Form Fields:</b>", normal_style))

att_fields = [
    "Employee ID",
    "Time In (DateTime picker)",
    "Time Out (DateTime picker)",
    "Shift (Dropdown)",
    "Notes (Text area)"
]

for field in att_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.15*inch))

# SECTION 3: HORSE & STAFF MANAGEMENT
elements.append(PageBreak())
elements.append(Paragraph("3. HORSE & STAFF MANAGEMENT", heading1_style))

# HorsesPage
elements.append(Paragraph("HorsesPage", heading2_style))
elements.append(Paragraph("<b>Key Fields:</b>", normal_style))

horse_fields = [
    "Name (Text)",
    "Passport Number (Unique ID)",
    "Stable Number (Auto-generated)",
    "Gender (Dropdown)",
    "Breed (Dropdown)",
    "Color (Dropdown)",
    "Status (Active/Inactive)",
    "Discipline (Dropdown)",
    "Owner Name (Text)",
    "Supervisor ID (Search)",
    "Profile Image (Upload)"
]

for field in horse_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.08*inch))

# EmployeesPage
elements.append(Paragraph("EmployeesPage", heading2_style))
elements.append(Paragraph("<b>Employee Designations (18 roles):</b>", normal_style))

roles = [
    "Super Admin, Director, School Administrator",
    "Stable Manager, Ground Supervisor",
    "Groom, Riding Boy, Gardener",
    "Rider, Instructor",
    "Jamedar, Farrier",
    "Executive Admin, Senior Executive Admin",
    "Executive Accounts, Senior Executive Accounts",
    "Guard, Electrician, Housekeeping"
]

for role in roles:
    elements.append(Paragraph(f"• {role}", field_style))
elements.append(Spacer(1, 0.08*inch))

elements.append(Paragraph("<b>Employee Fields:</b>", normal_style))
emp_fields = [
    "Full Name (Text)",
    "Email (Unique)",
    "Designation (Role dropdown)",
    "Department (Dropdown)",
    "Supervisor ID (Hierarchical)",
    "Shift Timing (Text)",
    "Phone Number (Contact)",
    "Employment Status (Active/Inactive)",
    "Profile Image (Upload)",
    "Approval Status (Pending/Approved)"
]

for field in emp_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.08*inch))

# HorseCareTeamPage
elements.append(Paragraph("HorseCareTeamPage", heading2_style))
elements.append(Paragraph("<b>Care Team Roles:</b>", normal_style))

care_roles = [
    "Primary Groom",
    "Alternative Groom",
    "Primary Rider",
    "Instructor",
    "Jamedar",
    "Health Advisor"
]

for role in care_roles:
    elements.append(Paragraph(f"• {role}", field_style))
elements.append(Spacer(1, 0.15*inch))

# SECTION 4: HEALTH & MEDICAL
elements.append(PageBreak())
elements.append(Paragraph("4. HEALTH & MEDICAL RECORDS", heading1_style))

# MedicineLogsPage
elements.append(Paragraph("MedicineLogsPage", heading2_style))

med_log_tabs = [
    ("All Logs", [
        "Complete medicine administration records",
        "Horse, Medicine, Quantity, Unit",
        "Jamedar/Administrator",
        "Time administered",
        "Approval status"
    ]),
    ("My Logs", [
        "Personal logs for logged-in jamedar",
        "Same fields as All Logs",
        "Pending approval indicator"
    ]),
    ("Pending Approval", [
        "Unapproved medicine logs",
        "Approve/Reject actions",
        "Approver information"
    ])
]

for tab_name, fields in med_log_tabs:
    elements.append(Paragraph(f"<b>Tab: {tab_name}</b>", tab_name_style))
    for field in fields:
        elements.append(Paragraph(f"• {field}", field_style))
    elements.append(Spacer(1, 0.08*inch))

# MedicineInventoryPage
elements.append(Paragraph("MedicineInventoryPage", heading2_style))

med_inv_tabs = [
    ("Inventory", [
        "Month/Year selector",
        "8 Medicine Types tracked",
        "Opening Stock (units)",
        "Units Purchased",
        "Units Used/Dispensed",
        "Closing Stock",
        "Reorder Threshold"
    ]),
    ("Report", [
        "Consumption analysis",
        "Stock movement graphs",
        "Medicine usage statistics",
        "Variance analysis"
    ])
]

for tab_name, fields in med_inv_tabs:
    elements.append(Paragraph(f"<b>Tab: {tab_name}</b>", tab_name_style))
    for field in fields:
        elements.append(Paragraph(f"• {field}", field_style))
    elements.append(Spacer(1, 0.08*inch))

# InspectionPage
elements.append(Paragraph("InspectionPage", heading2_style))
elements.append(Paragraph("<b>Inspection Rounds:</b>", normal_style))

inspection_fields = [
    "Round: Morning/Afternoon/Evening",
    "Date & Time",
    "Jamedar/Inspector",
    "Horse Name",
    "Location/Area",
    "Severity Level: Critical/High/Medium/Low",
    "Status: Open/Resolved",
    "Description (Text area)",
    "Evidence Photos (up to 8 images)",
    "Action Items"
]

for field in inspection_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.15*inch))

# SECTION 5: EQUIPMENT & INVENTORY
elements.append(PageBreak())
elements.append(Paragraph("5. EQUIPMENT & INVENTORY", heading1_style))

# FarrierShoeingPage
elements.append(Paragraph("FarrierShoeingPage", heading2_style))

farrier_tabs = [
    ("Completed Shoeings", [
        "Historical shoeing records",
        "Horse name",
        "Farrier assigned",
        "Shoeing date",
        "Next due date",
        "Notes/observations",
        "Add New button"
    ]),
    ("Pending/Overdue", [
        "Horses needing shoeing",
        "Days remaining/overdue indicator",
        "Last shoeing date",
        "Recommended next date",
        "Urgent count badge"
    ])
]

for tab_name, fields in farrier_tabs:
    elements.append(Paragraph(f"<b>Tab: {tab_name}</b>", tab_name_style))
    for field in fields:
        elements.append(Paragraph(f"• {field}", field_style))
    elements.append(Spacer(1, 0.08*inch))

# FeedInventoryPage
elements.append(Paragraph("FeedInventoryPage", heading2_style))

feed_inv_tabs = [
    ("Monthly Inventory", [
        "Feed Types: 11 types tracked",
        "Month/Year selector",
        "Opening Stock",
        "Purchased Quantity",
        "Used Quantity",
        "Closing Stock",
        "Reorder Level"
    ]),
    ("Consumption Report", [
        "Feed consumption analysis",
        "Charts by feed type",
        "Monthly comparison",
        "Cost analysis",
        "Wastage tracking"
    ])
]

for tab_name, fields in feed_inv_tabs:
    elements.append(Paragraph(f"<b>Tab: {tab_name}</b>", tab_name_style))
    for field in fields:
        elements.append(Paragraph(f"• {field}", field_style))
    elements.append(Spacer(1, 0.08*inch))

# HorseFeedsPage
elements.append(Paragraph("HorseFeedsPage", heading2_style))
elements.append(Paragraph("<b>Daily Feed Tracking (11 types):</b>", normal_style))

feed_types = [
    "Barley, Oats, Soya, Lucerne",
    "Bran, Maize, Molasses, Salt",
    "Supplements, Treats, Other"
]

for feed in feed_types:
    elements.append(Paragraph(f"• {feed}", field_style))
elements.append(Spacer(1, 0.08*inch))

# TackInventoryPage
elements.append(Paragraph("TackInventoryPage", heading2_style))
elements.append(Paragraph("<b>Tack & Equipment:</b>", normal_style))

tack_fields = [
    "Item Name (Text)",
    "Category (Saddles, Bridles, Reins, etc.)",
    "Horse Assignment",
    "Rider (if applicable)",
    "Condition Rating (Excellent/Good/Fair/Poor)",
    "Brand (Text)",
    "Service Due Status",
    "Damage Notes"
]

for field in tack_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.15*inch))

# SECTION 6: WORK RECORDS
elements.append(PageBreak())
elements.append(Paragraph("6. WORK RECORDS & REPORTING", heading1_style))

# ReportsPage
elements.append(Paragraph("ReportsPage - Multi-tab Analytics", heading2_style))

report_tabs = [
    ("Attendance", [
        "Total records count",
        "Present/Absent breakdown",
        "Leave count",
        "Weekly off count",
        "Half-day count",
        "Detailed table with date, employee, designation, status, remarks"
    ]),
    ("Tasks", [
        "Total tasks count",
        "Completed/Pending/In-Progress breakdown",
        "Rejected count",
        "Table: Date, Task name, Assigned To, Created By, Priority, Status"
    ]),
    ("Expenses", [
        "Total expense count",
        "Total amount",
        "Breakdown by type (Medicine, Treatment, Maintenance, Misc)",
        "Table: Date, Type, Description, Amount, Created By, Horse/Employee"
    ]),
    ("Horse Health", [
        "Total inspections",
        "Open issues count",
        "Critical/High severity count",
        "Medicine logs count",
        "Pending approvals count",
        "Inspection rounds table + Medicine logs table"
    ])
]

for tab_name, fields in report_tabs:
    elements.append(Paragraph(f"<b>Tab: {tab_name}</b>", tab_name_style))
    for field in fields:
        elements.append(Paragraph(f"• {field}", field_style))
    elements.append(Spacer(1, 0.08*inch))

# GroomWorkSheetPage
elements.append(Paragraph("GroomWorkSheetPage", heading2_style))
elements.append(Paragraph("<b>Daily Work Logging:</b>", normal_style))

groom_sheet_fields = [
    "Groom ID (Auto-filled)",
    "Date (Date picker)",
    "Morning Hours (Numeric)",
    "Afternoon Hours (Numeric)",
    "Supplies Used:",
    "  - Woodchips (Quantity)",
    "  - Bichali (Quantity)",
    "  - Boo Sa (Quantity)",
    "Horse(s) attended (Multi-select)",
    "Notes (Text area)"
]

for field in groom_sheet_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.08*inch))

# DailyWorkRecordsPage
elements.append(Paragraph("DailyWorkRecordsPage (EIRS)", heading2_style))
elements.append(Paragraph("<b>Teaching Records:</b>", normal_style))

eirs_fields = [
    "Horse Name (SearchableSelect)",
    "Rider Name (SearchableSelect)",
    "Date (Date picker)",
    "Work Type (Dropdown)",
    "Duration (Minutes/Hours)",
    "Instructor (Auto-filled/Selectable)",
    "Description (Text area)",
    "Performance Notes",
    "Achievement Badges"
]

for field in eirs_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.15*inch))

# SECTION 7: FINANCIAL
elements.append(PageBreak())
elements.append(Paragraph("7. FINANCIAL RECORDS", heading1_style))

# ExpensePage
elements.append(Paragraph("ExpensePage", heading2_style))
elements.append(Paragraph("<b>Expense Types:</b>", normal_style))

expense_types = [
    "Medicine (Prescribed medications)",
    "Treatment (Professional services)",
    "Maintenance (Equipment, repair)",
    "Miscellaneous (Other costs)"
]

for exp_type in expense_types:
    elements.append(Paragraph(f"• {exp_type}", field_style))

elements.append(Spacer(1, 0.08*inch))
elements.append(Paragraph("<b>Expense Fields:</b>", normal_style))

expense_fields = [
    "Type (Dropdown)",
    "Description (Text)",
    "Amount (Currency)",
    "Date (Date picker)",
    "Related To (Horse/Employee dropdown)",
    "Payment Method",
    "Receipt/Proof (File upload)",
    "Created By (Auto-filled)",
    "Approval Status"
]

for field in expense_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.08*inch))

# FinePage
elements.append(Paragraph("FinePage", heading2_style))
elements.append(Paragraph("<b>Fine Recording:</b>", normal_style))

fine_fields = [
    "Employee (SearchableSelect)",
    "Amount (Currency)",
    "Reason (Dropdown/Text)",
    "Date (Date picker)",
    "Authorized By (Staff dropdown)",
    "Evidence (Photo upload)",
    "Status (Pending/Approved/Paid)",
    "Notes (Text area)"
]

for field in fine_fields:
    elements.append(Paragraph(f"• {field}", field_style))
elements.append(Spacer(1, 0.15*inch))

# SECTION 8: COMMON FEATURES
elements.append(PageBreak())
elements.append(Paragraph("8. COMMON FEATURES & COMPONENTS", heading1_style))

elements.append(Paragraph("Universal UI Components", heading2_style))

components = [
    ("SearchableSelect", "Filterable dropdown for employees, horses, medicines, etc."),
    ("Status Badges", "Color-coded status indicators (Present/Absent/Approved/Pending/etc.)"),
    ("Date Filters", "Date range pickers, month/year selectors"),
    ("Tables with Pagination", "15 records per page default, customizable"),
    ("Excel Export", "Download data as Excel (20+ pages support)"),
    ("CSV Export", "Export reports as CSV (8+ pages)"),
    ("Image Upload", "File upload for evidence photos, profile pics, documents"),
    ("Modal Dialogs", "Confirmation modals, detail views, action forms"),
    ("Charts & Graphs", "Dashboard charts, consumption reports, analytics"),
    ("Image Viewer", "Fullscreen gallery for photos (ESC to close)"),
    ("Message Alerts", "Success/Error notifications with auto-dismiss"),
    ("Loading Indicators", "Skeleton loaders, spinner for async operations")
]

for comp_name, description in components:
    elements.append(Paragraph(f"<b>{comp_name}:</b> {description}", normal_style))
    elements.append(Spacer(1, 0.06*inch))

elements.append(Spacer(1, 0.1*inch))
elements.append(Paragraph("Role-Based Access Control", heading2_style))

rbac_features = [
    "18 Employee Designations with hierarchical permissions",
    "Admin-only features: Settings, Dashboard analytics, Employee management",
    "Role-specific field filtering (e.g., Groom fields only for Grooming work)",
    "Supervisor access to subordinate records",
    "Peer visibility based on department",
    "Approval workflows based on authorization levels"
]

for feature in rbac_features:
    elements.append(Paragraph(f"• {feature}", field_style))

elements.append(Spacer(1, 0.15*inch))
elements.append(Paragraph("Data Export & Reporting", heading2_style))

export_features = [
    "Excel export (20+ pages): Attendance, Tasks, Expenses, Horses, Employees",
    "CSV export (8+ pages): Reports, Meeting notes, Inventory summaries",
    "PDF generation: Reports, invoices, documents",
    "Chart export: Analytics visualizations",
    "Custom date range filtering before export",
    "Multi-page reports with pagination"
]

for feature in export_features:
    elements.append(Paragraph(f"• {feature}", field_style))

elements.append(PageBreak())

# APPENDIX
elements.append(Paragraph("APPENDIX: QUICK REFERENCE", heading1_style))

elements.append(Paragraph("Medicine Types (8)", heading2_style))
med_types = ["Injectable", "Oral tablets", "Powder", "Liquid", "Topical", "Supplement", "Vaccine", "Other"]
for med in med_types:
    elements.append(Paragraph(f"• {med}", field_style))

elements.append(Spacer(1, 0.1*inch))
elements.append(Paragraph("Feed Types (11)", heading2_style))
feed_types = ["Barley", "Oats", "Soya", "Lucerne", "Bran", "Maize", "Molasses", "Salt", "Supplements", "Treats", "Other"]
for feed in feed_types:
    elements.append(Paragraph(f"• {feed}", field_style))

elements.append(Spacer(1, 0.1*inch))
elements.append(Paragraph("Task Types (8)", heading2_style))
task_types = ["Feeding", "Grooming", "Medical Check", "Training", "Cleaning", "Equipment Maintenance", "Record Keeping", "Other"]
for task in task_types:
    elements.append(Paragraph(f"• {task}", field_style))

elements.append(Spacer(1, 0.1*inch))
elements.append(Paragraph("Status Values (Common)", heading2_style))
statuses = [
    "Attendance: Present, Absent, Leave, Weekly Off, Half Day",
    "Tasks: Pending, In Progress, Completed, Rejected, Approved",
    "Approvals: Pending Review, Approved, Rejected",
    "Horses: Active, Inactive, Retired, Injured",
    "Employees: Active, Inactive, On Leave",
    "Inspection: Open, Resolved, Critical, High, Medium, Low"
]

for status in statuses:
    elements.append(Paragraph(f"• {status}", field_style))

elements.append(Spacer(1, 0.2*inch))
elements.append(Paragraph("Document Information", heading2_style))
doc_info = [
    f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
    "<b>Application:</b> EFM Stable - Equestrian Facility Management System",
    "<b>Version:</b> Current/Latest",
    "<b>Pages Documented:</b> 43 pages (11 with tabs, 32 standard pages)",
    "<b>Total Entities:</b> 42 core entities",
    "<b>Role Types:</b> 18 designated roles"
]

for info in doc_info:
    elements.append(Paragraph(info, normal_style))
    elements.append(Spacer(1, 0.05*inch))

# Build PDF
doc.build(elements)
print(f"✓ PDF generated successfully: {OUTPUT_FILE}")
print(f"✓ Location: {OUTPUT_FILE}")
print(f"✓ File size: {__import__('os').path.getsize(OUTPUT_FILE) / 1024:.1f} KB")
