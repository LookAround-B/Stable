#!/usr/bin/env python3
"""
EFM Stable - Comprehensive Tab-wise Documentation Generator
Creates a detailed PDF with tables, tabs, fields, and component breakdowns
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime

OUTPUT_FILE = "EFM_Stable_APP_DOCUMENTATION.pdf"
doc = SimpleDocTemplate(OUTPUT_FILE, pagesize=A4, rightMargin=0.4*inch, leftMargin=0.4*inch,
                        topMargin=0.6*inch, bottomMargin=0.6*inch, title="EFM Stable App Documentation")

styles = getSampleStyleSheet()

# Custom styles
title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, 
                            textColor=colors.HexColor('#1f2937'), alignment=TA_CENTER, fontName='Helvetica-Bold')
heading1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=14, 
                               textColor=colors.HexColor('#1e40af'), spaceBefore=10, spaceAfter=8, fontName='Helvetica-Bold')
heading2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=11, 
                               textColor=colors.HexColor('#374151'), spaceBefore=8, spaceAfter=6, fontName='Helvetica-Bold')
normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=8.5, 
                             textColor=colors.HexColor('#1f2937'), alignment=TA_LEFT)

elements = []

# Title Page
elements.append(Spacer(1, 0.8*inch))
elements.append(Paragraph("EFM STABLE", title_style))
elements.append(Spacer(1, 0.15*inch))
elements.append(Paragraph("Complete Application Documentation", 
                         ParagraphStyle('sub', parent=styles['Normal'], fontSize=14, 
                                      alignment=TA_CENTER, textColor=colors.HexColor('#4b5563'))))
elements.append(Spacer(1, 0.05*inch))
elements.append(Paragraph("All Pages, Tabs, Fields & Components", 
                         ParagraphStyle('sub2', parent=styles['Normal'], fontSize=12, 
                                      alignment=TA_CENTER, textColor=colors.HexColor('#6b7280'))))
elements.append(Spacer(1, 0.3*inch))
elements.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", 
                         ParagraphStyle('date', parent=styles['Normal'], fontSize=9, 
                                      alignment=TA_CENTER, textColor=colors.HexColor('#9ca3af'))))
elements.append(PageBreak())

# Table of Contents
elements.append(Paragraph("TABLE OF CONTENTS", heading1_style))
elements.append(Spacer(1, 0.1*inch))

toc_data = [
    ["1.", "Approval & Task Management", "2"],
    ["2.", "Attendance & Time Tracking", "3"],
    ["3.", "Horse & Staff Management", "4"],
    ["4.", "Health & Medical Records", "5"],
    ["5.", "Equipment & Inventory", "6"],
    ["6.", "Work Records & Reporting", "7"],
    ["7.", "Financial Records", "8"],
    ["8.", "Common Features", "8"],
]

toc_table = Table(toc_data, colWidths=[0.4*inch, 4*inch, 0.5*inch])
toc_table.setStyle(TableStyle([
    ('FONT', (0, 0), (-1, -1), 'Helvetica', 8),
    ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
]))
elements.append(toc_table)
elements.append(PageBreak())

# SECTION 1: APPROVAL & TASK PAGES
elements.append(Paragraph("1. APPROVAL & TASK MANAGEMENT", heading1_style))

# ApprovalTasksPage detailed breakdown
approval_data = [
    ["Component", "Tab Name", "Key Fields", "Items Count Max"],
    ["Tabs", "Pending Reviews", "Task/Medicine details, evidence photos, assigned employee, horse, completion notes", "N/A"],
    ["", "Approved", "Approved items, approver info, status, timestamp", "N/A"],
    ["Card Display", "All", "Item type badge, detail labels, priority, approval status", "Dynamic"],
    ["Actions", "Pending", "Approve button, Reject button, notes display", "Per item"],
    ["Status", "All", "Approved badge or action buttons", "Visual indicator"],
]

elements.append(Paragraph("ApprovalTasksPage - Task & Medicine Approvals", heading2_style))
approval_table = Table(approval_data, colWidths=[1.2*inch, 1.2*inch, 2.5*inch, 0.8*inch])
approval_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f9fafb'), colors.white]),
]))
elements.append(approval_table)
elements.append(Spacer(1, 0.12*inch))

# TasksPage
task_data = [
    ["Field", "Type", "Description"],
    ["Task Name", "Text", "Name/Title of the task"],
    ["Task Type", "Dropdown", "8 types: Feeding, Grooming, Medical Check, Training, etc."],
    ["Priority", "Dropdown", "High, Medium, Low"],
    ["Status", "Dropdown", "Pending, In Progress, Completed, Rejected, Approved"],
    ["Assigned To", "SearchableSelect", "Employee dropdown filtered by available staff"],
    ["Horse", "SearchableSelect", "Horse selection"],
    ["Scheduled Time", "DateTime", "When task should be completed"],
    ["Description", "TextArea", "Detailed task description"],
    ["Evidence Photo", "File Upload", "Visual proof after completion"],
    ["Completion Notes", "TextArea", "Employee notes on completion"],
    ["Created By", "Auto", "System auto-filled with logged-in user"],
]

elements.append(Paragraph("TasksPage - Task Management", heading2_style))
task_table = Table(task_data, colWidths=[1.8*inch, 1.2*inch, 2.2*inch])
task_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dcfce7')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#166534')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0fdf4'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
]))
elements.append(task_table)
elements.append(PageBreak())

# SECTION 2: ATTENDANCE
elements.append(Paragraph("2. ATTENDANCE & TIME TRACKING", heading1_style))

# DailyAttendancePage
daily_att_data = [
    ["Page", "Features", "Fields Shown", "Key Actions"],
    ["DailyAttendancePage", "Groom attendance roster, status toggling", "Name, Email, Check-In, Check-Out, Status", "Toggle IN/OUT status"],
    ["GateAttendancePage", "Staff & visitor entry/exit logging", "Staff/Visitor, Entry time, Exit time, Shift", "Log entry, Log exit"],
    ["AttendancePage", "Manual time logging", "Employee, Time In, Time Out, Shift, Notes", "Submit attendance"],
    ["TeamAttendancePage", "Bulk team marking", "Date, Employees list, Status dropdowns", "Mark multiple at once"],
    ["RoundCheckPage", "Daily round completion", "AM, PM, Evening checkboxes", "Check round completion"],
]

daily_att_table = Table(daily_att_data, colWidths=[1.3*inch, 1.4*inch, 1.5*inch, 1.3*inch])
daily_att_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fef3c7')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#92400e')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#fffbeb'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
]))
elements.append(daily_att_table)
elements.append(Spacer(1, 0.12*inch))

# AttendancePage detailed fields
att_fields_data = [
    ["Field", "Input Type", "Required", "Notes"],
    ["Employee ID", "Auto/Dropdown", "Yes", "Pre-filled for staff, can select for managers"],
    ["Time In", "DateTime Picker", "Yes", "Date and time of check-in"],
    ["Time Out", "DateTime Picker", "No", "Optional, for checkout"],
    ["Shift", "Dropdown", "Conditional", "Required for certain designations"],
    ["Notes", "TextArea", "No", "Optional remarks"],
]

elements.append(Paragraph("AttendancePage - Manual Attendance Entry", heading2_style))
att_fields_table = Table(att_fields_data, colWidths=[1.3*inch, 1.3*inch, 0.9*inch, 2.1*inch])
att_fields_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fce7f3')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#831843')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#faf5f9'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
elements.append(att_fields_table)
elements.append(PageBreak())

# SECTION 3: HORSE & STAFF
elements.append(Paragraph("3. HORSE & STAFF MANAGEMENT", heading1_style))

# HorsesPage
horse_fields_data = [
    ["Field", "Type", "Required", "Options/Notes"],
    ["Horse Name", "Text", "Yes", "Unique identifier"],
    ["Passport Number", "Text", "Yes", "Official ID"],
    ["Stable Number", "Auto", "Auto", "Auto-generated sequence"],
    ["Gender", "Dropdown", "Yes", "Male, Female, Gelding"],
    ["Breed", "Dropdown", "Yes", "Various breeds available"],
    ["Color", "Dropdown", "Yes", "Bay, Black, Chestnut, Grey, etc."],
    ["Status", "Dropdown", "Yes", "Active, Inactive, Retired, Injured"],
    ["Discipline", "Dropdown", "Yes", "Dressage, Jumping, Racing, etc."],
    ["Owner Name", "Text", "Yes", "Owner information"],
    ["Supervisor", "SearchableSelect", "No", "Assigned supervisor"],
    ["Profile Image", "Image Upload", "No", "Photo of horse"],
]

horse_table = Table(horse_fields_data, colWidths=[1.4*inch, 1*inch, 0.9*inch, 2.3*inch])
horse_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#cffafe')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#164e63')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ecf9fc'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
elements.append(horse_table)
elements.append(Spacer(1, 0.12*inch))

# EmployeesPage
emp_roles_data = [
    ["Admin", "Stable Ops", "Ground Ops", "Medical", "Finance", "Support"],
    ["Super Admin", "Stable Manager", "Ground Supervisor", "Jamedar", "Exec Accounts", "Guard"],
    ["Director", "Groom", "Gardener", "Health Advisor", "Sr Exec Accounts", "Electrician"],
    ["School Admin", "Riding Boy", "Rider", "Farrier", "", "Housekeeping"],
    ["", "", "Instructor", "", "", ""],
]

elements.append(Paragraph("EmployeesPage - 18 Role Types", heading2_style))
emp_roles_table = Table(emp_roles_data, colWidths=[1.4*inch, 1.4*inch, 1.4*inch, 1.4*inch, 1.4*inch, 1.4*inch])
emp_roles_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fecaca')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#7f1d1d')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#fee2e2'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
elements.append(emp_roles_table)
elements.append(Spacer(1, 0.12*inch))

# Employee fields
emp_fields_data = [
    ["Field", "Type", "Description"],
    ["Full Name", "Text", "Employee name"],
    ["Email", "Email", "Unique email address"],
    ["Designation", "Dropdown", "One of 18 roles"],
    ["Department", "Dropdown", "Department assignment"],
    ["Supervisor", "SearchableSelect", "Reports to supervisor"],
    ["Shift Timing", "Text/Dropdown", "Work shift assigned"],
    ["Phone Number", "Phone", "Contact number"],
    ["Employment Status", "Dropdown", "Active, Inactive, On Leave"],
    ["Profile Image", "Image Upload", "Employee photo"],
    ["Approval Status", "Auto", "Pending/Approved"],
]

emp_fields_table = Table(emp_fields_data, colWidths=[1.4*inch, 1.2*inch, 2.8*inch])
emp_fields_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#b1d9c7')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e3a1f')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0fdf4'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(emp_fields_table)
elements.append(PageBreak())

# SECTION 4: HEALTH & MEDICAL
elements.append(Paragraph("4. HEALTH & MEDICAL RECORDS", heading1_style))

# MedicineLogsPage tabs
med_log_tabs_data = [
    ["Tab", "Purpose", "Key Fields", "Users"],
    ["All Logs", "View complete medicine records", "Horse, Medicine, Quantity, Unit, Time, Jamedar, Status", "Supervisors, Admin"],
    ["My Logs", "Personal log for jamedar", "Own administered medicines", "Jamedar only"],
    ["Pending Approval", "Unapproved medicines", "Records awaiting approval", "Approvers"],
]

elements.append(Paragraph("MedicineLogsPage - 3 Tab View", heading2_style))
med_log_table = Table(med_log_tabs_data, colWidths=[1.2*inch, 1.3*inch, 2.1*inch, 1.8*inch])
med_log_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e7d4d4')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#5c2c1f')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#faf5f4'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
elements.append(med_log_table)
elements.append(Spacer(1, 0.12*inch))

# Medicine inventory
med_inv_data = [
    ["Tab", "Month", "Fields", "Purpose"],
    ["Inventory", "Selected M/Y", "Medicine Type, Opening Stock, Purchased, Used, Closing Stock, Threshold", "Track stock levels"],
    ["Report", "Selected M/Y", "Charts, Consumption analysis, Variance, Trends", "Analyze usage"],
]

elements.append(Paragraph("MedicineInventoryPage - 8 Medicine Types", heading2_style))
med_inv_table = Table(med_inv_data, colWidths=[1.2*inch, 1.2*inch, 2.3*inch, 1.7*inch])
med_inv_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0c4a6e')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0f9ff'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(med_inv_table)
elements.append(Spacer(1, 0.12*inch))

# Inspection Page
inspection_data = [
    ["Field", "Type", "Required", "Notes"],
    ["Date & Time", "DateTime", "Yes", "When inspection occurred"],
    ["Round", "Dropdown", "Yes", "Morning, Afternoon, Evening"],
    ["Jamedar", "SearchableSelect", "Yes", "Inspector name"],
    ["Horse", "SearchableSelect", "Yes", "Which horse(s)"],
    ["Location", "Text", "Yes", "Area/location in facility"],
    ["Severity", "Dropdown", "Yes", "Critical, High, Medium, Low"],
    ["Status", "Dropdown", "Yes", "Open, Resolved"],
    ["Description", "TextArea", "Yes", "Detailed findings"],
    ["Evidence Photos", "Multiple Upload", "No", "Up to 8 photos"],
]

elements.append(Paragraph("InspectionPage - Health Inspection Records", heading2_style))
inspection_table = Table(inspection_data, colWidths=[1.3*inch, 1.2*inch, 1*inch, 2.1*inch])
inspection_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f5d4d4')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#7f1d1d')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#fef2f2'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(inspection_table)
elements.append(PageBreak())

# SECTION 5: EQUIPMENT & INVENTORY
elements.append(Paragraph("5. EQUIPMENT & INVENTORY", heading1_style))

inventory_overview = [
    ["Inventory Type", "Item Count", "Key Fields", "Tracking"],
    ["Medicine", "8 types", "Stock, Quantity, Unit, Threshold", "Monthly"],
    ["Feed", "11 types", "Barley, Oats, Soya, Lucerne, etc.", "Daily/Monthly"],
    ["Tack", "Multiple", "Category, Condition, Horse, Rider", "As needed"],
    ["Farrier", "Multiple", "Tools, Supplies, Service dates", "As used"],
    ["Housekeeping", "Multiple", "Supplies, Reorder alerts", "Monthly"],
]

elements.append(Paragraph("Inventory Overview", heading2_style))
inventory_table = Table(inventory_overview, colWidths=[1.4*inch, 1.2*inch, 1.8*inch, 1.2*inch])
inventory_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5cc9d')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#5c3d2d')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#faf8f3'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(inventory_table)
elements.append(Spacer(1, 0.12*inch))

# FarrierShoeingPage
farrier_data = [
    ["Tab", "Status", "Fields", "Actions"],
    ["Completed", "Historical", "Horse, Farrier, Date, Notes", "Add new shoeing"],
    ["Pending", "Upcoming", "Horse, Days overdue, Last date, Due date", "Schedule shoeing"],
]

elements.append(Paragraph("FarrierShoeingPage - Shoeing Schedule", heading2_style))
farrier_table = Table(farrier_data, colWidths=[1.1*inch, 1.1*inch, 2*inch, 1.3*inch])
farrier_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8d9df')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#5c3d4a')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#faf6f8'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(farrier_table)
elements.append(PageBreak())

# SECTION 6: WORK RECORDS
elements.append(Paragraph("6. WORK RECORDS & REPORTING", heading1_style))

# ReportsPage
reports_data = [
    ["Tab", "Metrics", "Table Fields", "Export"],
    ["Attendance", "Total, Present, Absent, Leave, WOff, HalfDay", "Date, Employee, Status, Remarks", "Excel"],
    ["Tasks", "Total, Completed, Pending, InProgress, Rejected", "Date, Task, AssignedTo, Priority, Status", "Excel"],
    ["Expenses", "Total, Amount, Breakdown by type", "Date, Type, Desc, Amount, CreatedBy, Horse/Emp", "Excel"],
    ["Horse Health", "Inspections, OpenIssues, Critical, MedLogs, Pending", "Date, Round, Jamedar, Severity, Status", "Excel"],
]

elements.append(Paragraph("ReportsPage - 4-Tab Analytics", heading2_style))
reports_table = Table(reports_data, colWidths=[1.1*inch, 1.2*inch, 1.7*inch, 1.5*inch])
reports_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c7d2fe')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#312e81')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f5f3ff'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(reports_table)
elements.append(Spacer(1, 0.12*inch))

# GroomWorkSheet
groom_sheet_data = [
    ["Field", "Type", "Range", "Purpose"],
    ["Date", "Date Picker", "Past only", "Work date"],
    ["Morning Hours", "Number", "0-12", "AM work hours"],
    ["Afternoon Hours", "Number", "0-12", "PM work hours"],
    ["Woodchips-Used", "Number", "0-1000 kg", "Bedding used"],
    ["Bichali Used", "Number", "0-1000 kg", "Straw used"],
    ["Horses Attended", "MultiSelect", "All stable horses", "Which horses worked"],
    ["Notes", "TextArea", "Any length", "Details/observations"],
]

elements.append(Paragraph("GroomWorkSheetPage - Daily Work Logging", heading2_style))
groom_sheet_table = Table(groom_sheet_data, colWidths=[1.2*inch, 1.2*inch, 1.2*inch, 2.0*inch])
groom_sheet_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#bbf7d0')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#064e3b')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0fdf4'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(groom_sheet_table)
elements.append(PageBreak())

# SECTION 7: FINANCIAL
elements.append(Paragraph("7. FINANCIAL RECORDS", heading1_style))

# ExpensePage
expense_data = [
    ["Type", "Category", "Usage", "Fields"],
    ["Medicine", "Veterinary", "Drug expenses", "Horse, MedicineName, Quantity, Unit"],
    ["Treatment", "Professional", "Vet services", "Horse, Description, Service provider"],
    ["Maintenance", "Equipment", "Routine upkeep", "Equipment, Description, Location"],
    ["Misc", "General", "Other costs", "Description, Related To field"],
]

elements.append(Paragraph("ExpensePage - 4 Expense Types", heading2_style))
expense_table = Table(expense_data, colWidths=[1.1*inch, 1.2*inch, 1.3*inch, 2.8*inch])
expense_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fed7aa')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#7c2d12')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#fffbeb'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(expense_table)
elements.append(Spacer(1, 0.12*inch))

# FinePage
fine_data = [
    ["Field", "Type", "Input"],
    ["Employee", "SearchableSelect", "Select employee"],
    ["Amount", "Currency", "₹ amount"],
    ["Reason", "Text/Dropdown", "Why imposed"],
    ["Date", "Date Picker", "When imposed"],
    ["Authorized By", "SearchableSelect", "Approver"],
    ["Evidence", "Image Upload", "Photo proof"],
    ["Status", "Dropdown", "Pending/Approved/Paid"],
]

elements.append(Paragraph("FinePage - Employee Fines", heading2_style))
fine_table = Table(fine_data, colWidths=[1.4*inch, 1.3*inch, 3.7*inch])
fine_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fda4af')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#831843')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#fce7f3'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(fine_table)
elements.append(PageBreak())

# SECTION 8: COMMON FEATURES
elements.append(Paragraph("8. COMMON FEATURES & COMPONENTS", heading1_style))

components_data = [
    ["Component", "Usage", "Pages", "Features"],
    ["SearchableSelect", "Filterable dropdown", "30+", "Search, filter, multi-select option"],
    ["DatePicker", "Date/DateTime input", "25+", "Calendar view, date range"],
    ["Excel Export", "Download as XLSX", "20+", "Formatted tables, date ranges"],
    ["Status Badge", "Visual status", "25+", "Color-coded, text labels"],
    ["Pagination", "Data navigation", "15+", "15 records/page default"],
    ["File Upload", "Image/Document", "8+", "Single/Multiple, Preview"],
    ["Modal Dialog", "Confirmations", "20+", "Yes/No, Form submission"],
    ["Charts", "Data visualization", "3+", "Bar, Line, Pie charts"],
]

elements.append(Paragraph("Universal UI Components", heading2_style))
components_table = Table(components_data, colWidths=[1.3*inch, 1.2*inch, 1.1*inch, 2.8*inch])
components_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d1d5db')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#9ca3af')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f3f4f6'), colors.white]),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
]))
elements.append(components_table)
elements.append(Spacer(1, 0.15*inch))

# Role-based summary
elements.append(Paragraph("Role-Based Access Control", heading2_style))
rbac_text = (
    "<b>18 Designations:</b> Super Admin, Director, School Admin, Stable Manager, Ground Supervisor, "
    "Groom, Riding Boy, Gardener, Rider, Instructor, Jamedar, Farrier, Executive Admin, "
    "Senior Executive Admin, Executive Accounts, Senior Executive Accounts, Guard, Electrician, Housekeeping. "
    "<br/><br/>"
    "<b>Permission Levels:</b> Admin-only (Settings, Dashboard, Employee Management), "
    "Manager-level (Approvals, Reports), Staff-level (Personal records, Task completion), "
    "Supervisor-level (Subordinate access). "
    "<br/><br/>"
    "<b>Field Filtering:</b> Dropdowns auto-filter based on role (e.g., 'Primary Groom' only shows Groomers). "
    "Hierarchical visibility ensures users only see relevant staff."
)
elements.append(Paragraph(rbac_text, normal_style))

doc.build(elements)
print(f"✓ Enhanced PDF created: {OUTPUT_FILE}")
size = __import__('os').path.getsize(OUTPUT_FILE)
print(f"✓ File size: {size / 1024:.1f} KB")
print(f"✓ Location: d:\\LookAround\\1. EFM Stable\\{OUTPUT_FILE}")
