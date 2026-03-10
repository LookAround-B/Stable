import React, { createContext, useContext, useState } from 'react';

export const LANGUAGES = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
};

const translations = {
  // Sidebar group headers
  "Organization":           { en: "Organization",           hi: "संगठन",                  te: "సంస్థ",                      kn: "ಸಂಸ್ಥೆ" },
  "Tasks & Approvals":      { en: "Tasks & Approvals",      hi: "कार्य और अनुमोदन",        te: "విధులు & ఆమోదాలు",            kn: "ಕಾರ್ಯಗಳು & ಅನುಮೋದನೆಗಳು" },
  "Stable Operations":      { en: "Stable Operations",      hi: "स्टेबल ऑपरेशन्स",          te: "స్టేబుల్ కార్యకలాపాలు",        kn: "ಸ್ಟೇಬಲ್ ಕಾರ್ಯಾಚರಣೆಗಳು" },
  "Ground Operations":      { en: "Ground Operations",      hi: "ग्राउंड ऑपरेशन्स",          te: "గ్రౌండ్ కార్యకలాపాలు",          kn: "ಗ್ರೌಂಡ್ ಕಾರ್ಯಾಚರಣೆಗಳು" },
  "Restaurant Operations":  { en: "Restaurant Operations",  hi: "रेस्तरां ऑपरेशन्स",          te: "రెస్టారెంట్ కార్యకలాపాలు",        kn: "ರೆಸ್ಟೋರೆಂಟ್ ಕಾರ್ಯಾಚರಣೆಗಳು" },
  "Accounts & Finance":     { en: "Accounts & Finance",     hi: "खाते और वित्त",              te: "ఖాతాలు & ఆర్థికం",              kn: "ಖಾತೆಗಳು & ಹಣಕಾಸು" },
  "System":                 { en: "System",                 hi: "सिस्टम",                   te: "వ్యవస్థ",                       kn: "ವ್ಯವಸ್ಥೆ" },

  // Sidebar menu items
  "Dashboard":              { en: "Dashboard",              hi: "डैशबोर्ड",                  te: "డాష్‌బోర్డ్",                   kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" },
  "Horses":                 { en: "Horses",                 hi: "घोड़े",                      te: "గుర్రాలు",                     kn: "ಕುದುರೆಗಳು" },
  "Team":                   { en: "Team",                   hi: "टीम",                       te: "బృందం",                        kn: "ತಂಡ" },
  "Tasks":                  { en: "Tasks",                  hi: "कार्य",                      te: "విధులు",                       kn: "ಕಾರ್ಯಗಳು" },
  "My Assigned Tasks":      { en: "My Assigned Tasks",      hi: "मेरे सौंपे गए कार्य",         te: "నాకు కేటాయించిన విధులు",         kn: "ನನ್ನ ನಿಯೋಜಿತ ಕಾರ್ಯಗಳು" },
  "Approvals":              { en: "Approvals",              hi: "अनुमोदन",                   te: "ఆమోదాలు",                     kn: "ಅನುಮೋದನೆಗಳು" },
  "Meetings":               { en: "Meetings",               hi: "बैठकें",                    te: "సమావేశాలు",                    kn: "ಸಭೆಗಳು" },
  "Medicine Logs":          { en: "Medicine Logs",          hi: "दवा लॉग",                  te: "మందుల లాగ్‌లు",                 kn: "ಔಷಧ ಲಾಗ್‌ಗಳು" },
  "Medicine Inventory":     { en: "Medicine Inventory",     hi: "दवा इन्वेंटरी",              te: "మందుల జాబితా",                  kn: "ಔಷಧ ದಾಸ್ತಾನು" },
  "Horse Feeds":            { en: "Horse Feeds",            hi: "घोड़े का चारा",              te: "గుర్రపు మేత",                   kn: "ಕುದುರೆ ಆಹಾರ" },
  "Feed Inventory":         { en: "Feed Inventory",         hi: "चारा इन्वेंटरी",             te: "మేత జాబితా",                   kn: "ಆಹಾರ ದಾಸ್ತಾನು" },
  "Care Teams":             { en: "Care Teams",             hi: "देखभाल टीमें",               te: "సంరక్షణ బృందాలు",               kn: "ಆರೈಕೆ ತಂಡಗಳು" },
  "Gate Register":          { en: "Gate Register",          hi: "गेट रजिस्टर",               te: "గేట్ రిజిస్టర్",                 kn: "ಗೇಟ್ ರಿಜಿಸ್ಟರ್" },
  "Daily Register":         { en: "Daily Register",         hi: "दैनिक रजिस्टर",             te: "దినసరి రిజిస్టర్",               kn: "ದೈನಿಕ ರಿಜಿಸ್ಟರ್" },
  "Mark Team Attendance":   { en: "Mark Team Attendance",   hi: "टीम उपस्थिति दर्ज करें",     te: "టీమ్ హాజరు నమోదు",              kn: "ತಂಡದ ಹಾಜರಾತಿ ಗುರುತಿಸಿ" },
  "Groom Worksheet":        { en: "Groom Worksheet",        hi: "ग्रूम वर्कशीट",              te: "గ్రూమ్ వర్క్‌షీట్",               kn: "ಗ್ರೂಮ್ ವರ್ಕ್‌ಶೀಟ್" },
  "Daily Work Records":     { en: "Daily Work Records",     hi: "दैनिक कार्य रिकॉर्ड",        te: "దినసరి పని రికార్డులు",            kn: "ದೈನಿಕ ಕೆಲಸ ದಾಖಲೆಗಳು" },
  "Inspection Rounds":      { en: "Inspection Rounds",      hi: "निरीक्षण राउंड",             te: "తనిఖీ రౌండ్లు",                 kn: "ಪರಿಶೀಲನೆ ಸುತ್ತುಗಳು" },
  "Groceries Inventory":    { en: "Groceries Inventory",    hi: "किराना इन्वेंटरी",            te: "కిరాణా జాబితా",                 kn: "ಕಿರಾಣಿ ದಾಸ್ತಾನು" },
  "Invoice Generation":     { en: "Invoice Generation",     hi: "चालान निर्माण",              te: "ఇన్‌వాయిస్ రూపకల్పన",           kn: "ಇನ್‌ವಾಯ್ಸ್ ರಚನೆ" },
  "Expense Tracking":       { en: "Expense Tracking",       hi: "खर्च ट्रैकिंग",              te: "ఖర్చు ట్రాకింగ్",               kn: "ವೆಚ್ಚ ಟ್ರ್ಯಾಕಿಂಗ್" },
  "Fine System":            { en: "Fine System",            hi: "जुर्माना सिस्टम",             te: "జరిమానా వ్యవస్థ",               kn: "ದಂಡ ವ್ಯವಸ್ಥೆ" },
  "Reports":                { en: "Reports",                hi: "रिपोर्ट",                   te: "నివేదికలు",                    kn: "ವರದಿಗಳು" },
  "Settings":               { en: "Settings",               hi: "सेटिंग्स",                   te: "సెట్టింగ్‌లు",                   kn: "ಸೆಟ್ಟಿಂಗ್‌ಗಳు" },

  // Common UI
  "Search":                 { en: "Search",                 hi: "खोजें",                     te: "వెతకండి",                      kn: "ಹುಡುಕಿ" },
  "Save":                   { en: "Save",                   hi: "सहेजें",                    te: "సేవ్ చేయండి",                   kn: "ಉಳಿಸಿ" },
  "Cancel":                 { en: "Cancel",                 hi: "रद्द करें",                  te: "రద్దు చేయండి",                  kn: "ರದ್ದುಮಾಡಿ" },
  "Delete":                 { en: "Delete",                 hi: "हटाएं",                     te: "తొలగించు",                     kn: "ಅಳಿಸಿ" },
  "Edit":                   { en: "Edit",                   hi: "संपादित करें",               te: "సవరించు",                      kn: "ಸಂಪಾದಿಸಿ" },
  "Add":                    { en: "Add",                    hi: "जोड़ें",                     te: "జోడించండి",                    kn: "ಸೇರಿಸಿ" },
  "Submit":                 { en: "Submit",                 hi: "सबमिट करें",                 te: "సమర్పించండి",                  kn: "ಸಲ್ಲಿಸಿ" },
  "Close":                  { en: "Close",                  hi: "बंद करें",                   te: "మూసివేయండి",                   kn: "ಮುಚ್ಚಿ" },
  "Actions":                { en: "Actions",                hi: "कार्रवाई",                   te: "చర్యలు",                       kn: "ಕ್ರಮಗಳು" },
  "Status":                 { en: "Status",                 hi: "स्थिति",                    te: "స్థితి",                        kn: "ಸ್ಥಿತಿ" },
  "Date":                   { en: "Date",                   hi: "तारीख",                     te: "తేదీ",                          kn: "ದಿನಾಂಕ" },
  "From Date":              { en: "From Date",              hi: "तारीख से",                   te: "తేదీ నుండి",                    kn: "ದಿನಾಂಕದಿಂದ" },
  "To Date":                { en: "To Date",                hi: "तारीख तक",                   te: "తేదీ వరకు",                     kn: "ದಿನಾಂಕದವರೆಗೆ" },
  "All":                    { en: "All",                    hi: "सभी",                       te: "అన్ని",                         kn: "ಎಲ್ಲಾ" },
  "Name":                   { en: "Name",                   hi: "नाम",                       te: "పేరు",                          kn: "ಹೆಸರು" },
  "Email":                  { en: "Email",                  hi: "ईमेल",                      te: "ఇమెయిల్",                      kn: "ಇಮೇಲ್" },
  "Role":                   { en: "Role",                   hi: "भूमिका",                    te: "పాత్ర",                         kn: "ಪಾತ್ರ" },
  "Contact":                { en: "Contact",                hi: "संपर्क",                    te: "సంప్రదింపు",                    kn: "ಸಂಪರ್ಕ" },
  "Type":                   { en: "Type",                   hi: "प्रकार",                    te: "రకం",                           kn: "ಪ್ರಕಾರ" },
  "Amount":                 { en: "Amount",                 hi: "राशि",                      te: "మొత్తం",                        kn: "ಮೊತ್ತ" },
  "Description":            { en: "Description",            hi: "विवरण",                     te: "వివరణ",                         kn: "ವಿವರಣೆ" },
  "Notes":                  { en: "Notes",                  hi: "नोट्स",                     te: "గమనికలు",                      kn: "ಟಿಪ್ಪಣಿಗಳು" },
  "Unit":                   { en: "Unit",                   hi: "इकाई",                      te: "యూనిట్",                        kn: "ಘಟಕ" },
  "Month":                  { en: "Month",                  hi: "महीना",                     te: "నెల",                           kn: "ತಿಂಗಳು" },
  "Year":                   { en: "Year",                   hi: "वर्ष",                      te: "సంవత్సరం",                      kn: "ವರ್ಷ" },
  "Total":                  { en: "Total",                  hi: "कुल",                       te: "మొత్తం",                        kn: "ಒಟ್ಟು" },
  "Pending":                { en: "Pending",                hi: "लंबित",                     te: "పెండింగ్",                      kn: "ಬಾಕಿ" },
  "Paid":                   { en: "Paid",                   hi: "भुगतान किया",                te: "చెల్లించారు",                   kn: "ಪಾವತಿಸಲಾಗಿದೆ" },
  "Approved":               { en: "Approved",               hi: "स्वीकृत",                   te: "ఆమోదించబడింది",                 kn: "ಅನುಮೋದಿಸಲಾಗಿದೆ" },
  "Rejected":               { en: "Rejected",               hi: "अस्वीकृत",                  te: "తిరస్కరించబడింది",               kn: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ" },
  "Active":                 { en: "Active",                 hi: "सक्रिय",                    te: "క్రియాశీలం",                    kn: "ಸಕ್ರಿಯ" },
  "Inactive":               { en: "Inactive",               hi: "निष्क्रिय",                  te: "నిష్క్రియంగా",                  kn: "ನಿಷ್ಕ್ರಿಯ" },
  "Present":                { en: "Present",                hi: "उपस्थित",                   te: "ఉన్నారు",                       kn: "ಹಾಜರು" },
  "Absent":                 { en: "Absent",                 hi: "अनुपस्थित",                  te: "గైర్హాజరు",                     kn: "ಗೈರುಹಾಜರು" },
  "Completed":              { en: "Completed",              hi: "पूर्ण",                      te: "పూర్తయింది",                    kn: "ಪೂರ್ಣಗೊಂಡಿದೆ" },
  "In Progress":            { en: "In Progress",            hi: "प्रगति में",                  te: "పురోగతిలో",                     kn: "ಪ್ರಗತಿಯಲ್ಲಿದೆ" },
  "Low":                    { en: "Low",                    hi: "कम",                        te: "తక్కువ",                        kn: "ಕಡಿಮೆ" },
  "Medium":                 { en: "Medium",                 hi: "मध्यम",                     te: "మధ్యస్తం",                      kn: "ಮಧ್ಯಮ" },
  "High":                   { en: "High",                   hi: "उच्च",                      te: "ఎక్కువ",                        kn: "ಹೆಚ್ಚು" },
  "Rows per page:":         { en: "Rows per page:",         hi: "प्रति पृष्ठ पंक्तियाँ:",      te: "పేజీకి అడ్డు వరుసలు:",           kn: "ಪ್ರತಿ ಪುಟಕ್ಕೆ ಸಾಲುಗಳು:" },
  "Page":                   { en: "Page",                   hi: "पृष्ठ",                     te: "పేజీ",                          kn: "ಪುಟ" },
  "Logout":                 { en: "Logout",                 hi: "लॉग आउट",                   te: "లాగ్ అవుట్",                    kn: "ಲಾಗ್ ಔಟ್" },
  "Language":               { en: "Language",               hi: "भाषा",                      te: "భాష",                           kn: "ಭಾಷೆ" },
  "Language Preference":    { en: "Language Preference",    hi: "भाषा प्राथमिकता",            te: "భాషా ప్రాధాన్యత",               kn: "ಭಾಷೆ ಆದ್ಯತೆ" },
  "Choose your preferred language for the interface": { en: "Choose your preferred language for the interface", hi: "इंटरफ़ेस के लिए अपनी पसंदीदा भाषा चुनें", te: "ఇంటర్‌ఫేస్ కోసం మీ ప్రాధాన్య భాషను ఎంచుకోండి", kn: "ಇಂಟರ್‌ಫೇಸ್‌ಗಾಗಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ" },
  "Remarks":                { en: "Remarks",                hi: "टिप्पणी",                   te: "వ్యాఖ్యలు",                     kn: "ಟಿಪ್ಪಣಿಗಳು" },
  "Reason":                 { en: "Reason",                 hi: "कारण",                      te: "కారణం",                         kn: "ಕಾರಣ" },
  "Evidence":               { en: "Evidence",               hi: "साक्ष्य",                   te: "సాక్ష్యం",                      kn: "ಪುರಾವೆ" },
  "Add Record":             { en: "Add Record",             hi: "रिकॉर्ड जोड़ें",              te: "రికార్డ్ జోడించండి",              kn: "ದಾಖಲೆ ಸೇರಿಸಿ" },
  "Export":                 { en: "Export",                 hi: "निर्यात करें",               te: "ఎగుమతి చేయండి",                kn: "ರಫ್ತು ಮಾಡಿ" },
  "Download CSV":           { en: "Download CSV",           hi: "CSV डाउनलोड करें",           te: "CSV డౌన్‌లోడ్",                 kn: "CSV ಡೌನ್‌ಲೋಡ್" },
  "Download Excel":         { en: "Download Excel",         hi: "एक्सेल डाउनलोड करें",        te: "ఎక్సెల్ డౌన్‌లోడ్",              kn: "ಎಕ್ಸೆಲ್ ಡೌನ್‌ಲೋಡ್" },
  "Priority":               { en: "Priority",               hi: "प्राथमिकता",                 te: "ప్రాధాన్యత",                    kn: "ಆದ್ಯತೆ" },
  "Inventory":              { en: "Inventory",              hi: "इन्वेंटरी",                  te: "జాబితా",                        kn: "ದಾಸ್ತಾನು" },
  "Report":                 { en: "Report",                 hi: "रिपोर्ट",                   te: "నివేదిక",                       kn: "ವರದಿ" },
  "Filter":                 { en: "Filter",                 hi: "फ़िल्टर",                    te: "ఫిల్టర్",                       kn: "ಫಿಲ್ಟರ್" },

  // Dashboard
  "TOTAL HORSES":           { en: "TOTAL HORSES",           hi: "कुल घोड़े",                  te: "మొత్తం గుర్రాలు",               kn: "ಒಟ್ಟು ಕುದುರೆಗಳು" },
  "TOTAL EMPLOYEES":        { en: "TOTAL EMPLOYEES",        hi: "कुल कर्मचारी",               te: "మొత్తం ఉద్యోగులు",              kn: "ಒಟ್ಟು ಉದ್ಯೋಗಿಗಳು" },
  "PENDING TASKS":          { en: "PENDING TASKS",          hi: "लंबित कार्य",                te: "పెండింగ్ విధులు",               kn: "ಬಾಕಿ ಕಾರ್ಯಗಳು" },
  "AUDIT LOGS":             { en: "AUDIT LOGS",             hi: "ऑडिट लॉग",                  te: "ఆడిట్ లాగ్‌లు",                 kn: "ಆಡಿಟ್ ಲಾಗ್‌ಗಳು" },
  "PENDING APPROVALS":      { en: "PENDING APPROVALS",      hi: "अनुमोदन लंबित",              te: "ఆమోదాలు పెండింగ్",              kn: "ಅನುಮೋದನೆಗಳು ಬಾಕಿ" },
  "Registered in system":   { en: "Registered in system",   hi: "सिस्टम में पंजीकृत",          te: "సిస్టమ్‌లో నమోదు",              kn: "ವ್ಯವಸ್ಥೆಯಲ್ಲಿ ನೋಂದಾಯಿಸಲಾಗಿದೆ" },
  "Active team members":    { en: "Active team members",    hi: "सक्रिय टीम सदस्य",           te: "క్రియాశీల బృంద సభ్యులు",        kn: "ಸಕ್ರಿಯ ತಂಡದ ಸದಸ್ಯರು" },
  "Awaiting action":        { en: "Awaiting action",        hi: "कार्रवाई की प्रतीक्षा",       te: "చర్య కోసం ఎదురుచూస్తోంది",       kn: "ಕ್ರಮಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದೆ" },
  "System events":          { en: "System events",          hi: "सिस्टम इवेंट्स",              te: "వ్యవస్థ సంఘటనలు",               kn: "ವ್ಯವಸ್ಥೆ ಘಟನೆಗಳು" },
  "Awaiting your review":   { en: "Awaiting your review",   hi: "आपकी समीक्षा की प्रतीक्षा",   te: "మీ సమీక్షకు వేచి ఉంది",          kn: "ನಿಮ್ಮ ಪರಾಮರ್ಶೆಗೆ ಕಾಯುತ್ತಿದೆ" },
  "GOOD MORNING,":          { en: "GOOD MORNING,",          hi: "शुभ प्रभात,",                 te: "శుభోదయం,",                      kn: "ಶುಭೋದಯ," },
  "GOOD AFTERNOON,":        { en: "GOOD AFTERNOON,",        hi: "शुभ अपराह्न,",                te: "శుభ మధ్యాహ్నం,",                kn: "ಶುಭ ಮಧ್ಯಾಹ್ನ," },
  "GOOD EVENING,":          { en: "GOOD EVENING,",          hi: "शुभ संध्या,",                 te: "శుభ సాయంత్రం,",                 kn: "ಶుಭ ಸಂಜೆ," },

  // Horses
  "Search by name, stable number, breed...": { en: "Search by name, stable number, breed...", hi: "नाम, स्टेबल नंबर, नस्ल से खोजें...", te: "పేరు, స్టేబుల్ నంబర్, జాతి ద్వారా వెతకండి...", kn: "ಹೆಸರು, ಸ್ಟೇಬಲ್ ಸಂಖ್ಯೆ, ತಳಿ ಮೂಲಕ ಹುಡುಕಿ..." },
  "Stable Number":          { en: "Stable Number",          hi: "स्टेबल नंबर",                te: "స్టేబుల్ నంబర్",                 kn: "ಸ್ಟೇಬಲ್ ಸಂಖ್ಯೆ" },
  "Gender":                 { en: "Gender",                 hi: "लिंग",                       te: "లింగం",                         kn: "ಲಿಂಗ" },
  "Breed":                  { en: "Breed",                  hi: "नस्ल",                       te: "జాతి",                          kn: "ತಳಿ" },
  "Color":                  { en: "Color",                  hi: "रंग",                        te: "రంగు",                          kn: "ಬಣ್ಣ" },
  "Age":                    { en: "Age",                    hi: "आयु",                        te: "వయస్సు",                        kn: "ವಯಸ್ಸು" },
  "Add Horse":              { en: "Add Horse",              hi: "घोड़ा जोड़ें",                 te: "గుర్రాన్ని జోడించండి",            kn: "ಕುದುರೆ ಸೇರಿಸಿ" },
  "No horses found":        { en: "No horses found",        hi: "कोई घोड़ा नहीं मिला",          te: "గుర్రాలు కనుగొనబడలేదు",          kn: "ಯಾವುದೇ ಕುದುರೆ ಕಂಡುಬಂದಿಲ್ಲ" },

  // Employees
  "Search by name, email, or role...": { en: "Search by name, email, or role...", hi: "नाम, ईमेल, या भूमिका से खोजें...", te: "పేరు, ఇమెయిల్ లేదా పాత్ర ద్వారా వెతకండి...", kn: "ಹೆಸರು, ಇಮೇಲ್ ಅಥವಾ ಪಾತ್ರ ಮೂಲಕ ಹುಡುಕಿ..." },
  "Team Members":           { en: "Team Members",           hi: "टीम सदस्य",                  te: "బృంద సభ్యులు",                  kn: "ತಂಡದ ಸದಸ್ಯರು" },
  "Designation":            { en: "Designation",            hi: "पदनाम",                     te: "హోదా",                          kn: "ಹೆಸರು" },
  "Supervisor":             { en: "Supervisor",             hi: "पर्यवेक्षक",                 te: "పర్యవేక్షకుడు",                  kn: "ಮೇಲ್ವಿಚಾರಕ" },
  "Manager":                { en: "Manager",                hi: "प्रबंधक",                   te: "మేనేజర్",                       kn: "ವ್ಯವಸ್ಥಾಪಕ" },
  "Add Employee":           { en: "Add Employee",           hi: "कर्मचारी जोड़ें",             te: "ఉద్యోగిని జోడించండి",            kn: "ಉದ್ಯೋಗಿ ಸೇರಿಸಿ" },

  // Tasks
  "Tasks Management":       { en: "Tasks Management",       hi: "कार्य प्रबंधन",               te: "విధుల నిర్వహణ",                 kn: "ಕಾರ್ಯ ನಿರ್ವಹಣೆ" },
  "Create New Task":        { en: "Create New Task",        hi: "नया कार्य बनाएं",             te: "కొత్త విధి సృష్టించండి",          kn: "ಹೊಸ ಕಾರ್ಯ ರಚಿಸಿ" },
  "No tasks found":         { en: "No tasks found",         hi: "कोई कार्य नहीं मिला",         te: "విధులు కనుగొనబడలేదు",           kn: "ಯಾವುದೇ ಕಾರ್ಯಗಳು ಕಂಡುಬಂದಿಲ್ಲ" },
  "Assigned To":            { en: "Assigned To",            hi: "सौंपा गया",                  te: "కేటాయించిన వారికి",              kn: "ನಿಯೋಜಿಸಲಾದ" },
  "Due Date":               { en: "Due Date",               hi: "नियत तारीख",                 te: "గడువు తేదీ",                    kn: "ಕೊನೆಯ ದಿನಾಂಕ" },
  "Submit Completion":      { en: "Submit Completion",      hi: "पूर्णता सबमिट करें",          te: "పూర్తి సమర్పించండి",             kn: "ಪೂರ್ಣಗೊಳಿಸುವಿಕೆ ಸಲ್ಲಿಸಿ" },
  "Scheduled":              { en: "Scheduled",              hi: "अनुसूचित",                   te: "షెడ్యూల్",                      kn: "ನಿಗದಿಪಡಿಸಲಾಗಿದೆ" },
  "No assigned tasks found":{ en: "No assigned tasks found",hi: "कोई सौंपे गए कार्य नहीं मिले",te: "కేటాయించిన విధులు కనుగొనబడలేదు",kn: "ನಿಯೋಜಿಸಿದ ಕಾರ್ಯಗಳು ಕಂಡುಬಂದಿಲ್ಲ" },

  // Medicine
  "Track medicine administration and approvals": { en: "Track medicine administration and approvals", hi: "दवा प्रशासन और अनुमोदन ट्रैक करें", te: "మందుల పంపిణీ మరియు ఆమోదాలను ట్రాక్ చేయండి", kn: "ಔಷಧ ನಿರ್ವಹಣೆ ಮತ್ತು ಅನುಮೋದನೆಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ" },
  "Pending Approval":       { en: "Pending Approval",       hi: "अनुमोदन लंबित",              te: "ఆమోదం పెండింగ్‌లో",             kn: "ಅನುಮೋದನೆ ಬಾಕಿ" },
  "Units Left":             { en: "Units Left",             hi: "शेष इकाइयाँ",                te: "మిగిలిన యూనిట్లు",               kn: "ಉಳಿದ ಘಟಕಗಳు" },
  "Total Used":             { en: "Total Used",             hi: "कुल उपयोग",                  te: "మొత్తం ఉపయోగించిన",             kn: "ಒಟ್ಟು ಬಳಕೆ" },
  "Total Available":        { en: "Total Available",        hi: "कुल उपलब्ध",                 te: "మొత్తం అందుబాటులో",             kn: "ಒಟ್ಟು ಲಭ್ಯ" },
  "Used Today":             { en: "Used Today",             hi: "आज उपयोग किया",              te: "ఈరోజు ఉపయోగించిన",              kn: "ಇಂದು ಬಳಸಲಾಗಿದೆ" },
  "No report data available":{ en: "No report data available",hi: "कोई रिपोर्ट डेटा उपलब्ध नहीं",te: "నివేదిక డేటా అందుబాటులో లేదు",kn: "ವರದಿ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ" },

  // Feed Inventory
  "Feed Type":              { en: "Feed Type",              hi: "चारा प्रकार",                te: "మేత రకం",                       kn: "ಆಹಾರ ಪ್ರಕಾರ" },
  "Units Brought":          { en: "Units Brought",          hi: "इकाइयाँ लाई गईं",            te: "తీసుకువచ్చిన యూనిట్లు",          kn: "ತಂದ ಘಟಕಗಳు" },
  "Feed Stock Status":      { en: "Feed Stock Status",      hi: "चारा स्टॉक स्थिति",           te: "మేత స్టాక్ స్థితి",              kn: "ಆಹಾರ ಸ್ಟಾಕ್ ಸ್ಥಿತಿ" },
  "Recalculate":            { en: "Recalculate",            hi: "पुनर्गणना",                  te: "మళ్ళీ లెక్కించండి",              kn: "ಮರು ಲೆಕ್ಕಾಚಾರ" },
  "Consumption Report":     { en: "Consumption Report",     hi: "उपभोग रिपोर्ट",              te: "వినియోగ నివేదిక",               kn: "ಬಳಕೆ ವರದಿ" },

  // Attendance
  "Daily Attendance Register": { en: "Daily Attendance Register", hi: "दैनिक उपस्थिति रजिस्टर", te: "దినసరి హాజరు రిజిస్టర్", kn: "ದೈನಿಕ ಹಾಜರಾತಿ ರಿಜಿಸ್ಟರ್" },
  "Team Attendance Records":   { en: "Team Attendance Records",   hi: "टीम उपस्थिति रिकॉर्ड",  te: "బృంద హాజరు రికార్డులు",          kn: "ತಂಡದ ಹಾಜರಾತಿ ದಾಖಲೆಗಳು" },
  "Mark Attendance":           { en: "Mark Attendance",           hi: "उपस्थिति दर्ज करें",     te: "హాజరు నమోదు",                   kn: "ಹಾಜರಾತಿ ಗುರುತಿಸಿ" },
  "Quick Mark Attendance":     { en: "Quick Mark Attendance",     hi: "त्वरित उपस्थिति दर्ज करें",te: "త్వరిత హాజరు నమోదు",          kn: "ತ್ವರಿತ ಹಾಜರಾತಿ ಗುರುತು" },
  "Employee Name":             { en: "Employee Name",             hi: "कर्मचारी नाम",            te: "ఉద్యోగి పేరు",                  kn: "ಉದ್ಯೋಗಿ ಹೆಸರು" },
  "Groomers check in/out with the toggle switch. Track daily attendance and work hours.": { en: "Groomers check in/out with the toggle switch. Track daily attendance and work hours.", hi: "ग्रूमर्स टॉगल स्विच से चेक इन/आउट करते हैं। दैनिक उपस्थिति और कार्य घंटे ट्रैक करें।", te: "గ్రూమర్లు టోగుల్ స్విచ్‌తో చెక్ ఇన్/అవుట్ చేస్తారు. రోజువారీ హాజరు మరియు పని గంటలు ట్రాక్ చేయండి.", kn: "ಗ್ರೂಮರ್‌ಗಳು ಟಾಗಲ್ ಸ್ವಿಚ್‌ನಿಂದ ಚೆಕ್ ಇನ್/ಔಟ್ ಮಾಡುತ್ತಾರೆ. ದೈನಿಕ ಹಾಜರಾತಿ ಮತ್ತು ಕೆಲಸದ ಗಂಟೆಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ." },

  // Groom Worksheet
  "Track groom activities, horse care hours, and supplies used daily.": { en: "Track groom activities, horse care hours, and supplies used daily.", hi: "ग्रूम गतिविधियों, घोड़े की देखभाल के घंटे और दैनिक आपूर्ति ट्रैक करें।", te: "గ్రూమ్ కార్యకలాపాలు, గుర్రపు సంరక్షణ గంటలు మరియు రోజువారీ సరఫరాలను ట్రాక్ చేయండి.", kn: "ಗ್ರೂಮ್ ಚಟುವಟಿಕೆಗಳು, ಕುದುರೆ ಆರೈಕೆ ಗಂಟೆಗಳು ಮತ್ತು ದೈನಿಕ ಸರಬರಾಜುಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ." },

  // Gate Register
  "Record Entry/Exit":      { en: "Record Entry/Exit",      hi: "प्रवेश/निकास दर्ज करें",    te: "ఎంట్రీ/ఎగ్జిట్ నమోదు",           kn: "ಪ್ರವೇಶ/ನಿರ್ಗಮನ ದಾಖಲಿಸಿ" },
  "Entry":                  { en: "Entry",                  hi: "प्रवेश",                    te: "ఎంట్రీ",                        kn: "ಪ್ರವೇಶ" },
  "Exit":                   { en: "Exit",                   hi: "निकास",                     te: "నిర్గమన",                       kn: "ನಿರ್ಗಮನ" },
  "Staff Member":           { en: "Staff Member",           hi: "स्टाफ सदस्य",               te: "సిబ్బంది సభ్యుడు",              kn: "ಸಿಬ್ಬಂದಿ ಸದಸ್ಯ" },
  "Visitor":                { en: "Visitor",                hi: "आगंतुक",                    te: "సందర్శకుడు",                    kn: "ಸಂದರ್ಶಕ" },

  // Inspection Rounds
  "Inspections":            { en: "Inspections",            hi: "निरीक्षण",                   te: "తనిఖీలు",                       kn: "ಪರಿಶೀಲನೆಗಳು" },
  "Severity":               { en: "Severity",               hi: "गंभीरता",                   te: "తీవ్రత",                        kn: "ತೀವ್ರತೆ" },
  "All Rounds":             { en: "All Rounds",             hi: "सभी राउंड",                  te: "అన్ని రౌండ్లు",                  kn: "ಎಲ್ಲಾ ಸುತ್ತುಗಳು" },
  "All Severity Levels":    { en: "All Severity Levels",    hi: "सभी गंभीरता स्तर",           te: "అన్ని తీవ్రత స్థాయిలు",          kn: "ಎಲ್ಲಾ ತೀವ್ರತೆ ಮಟ್ಟಗಳు" },
  "No inspections created yet": { en: "No inspections created yet", hi: "अभी तक कोई निरीक्षण नहीं बनाया गया", te: "ఇంకా తనిఖీలు సృష్టించబడలేదు", kn: "ಇನ್ನೂ ಪರಿಶೀಲನೆಗಳನ್ನು ರಚಿಸಲಾಗಿಲ್ಲ" },

  // Invoice Generation
  "Generate Invoice":       { en: "Generate Invoice",       hi: "चालान बनाएं",               te: "ఇన్‌వాయిస్ రూపొందించండి",        kn: "ಇನ್‌ವಾಯ್ಸ್ ರಚಿಸಿ" },
  "Total Invoices":         { en: "Total Invoices",         hi: "कुल चालान",                  te: "మొత్తం ఇన్‌వాయిస్‌లు",           kn: "ಒಟ್ಟು ಇನ್‌ವಾಯ್ಸ್‌ಗಳు" },
  "Total Amount":           { en: "Total Amount",           hi: "कुल राशि",                   te: "మొత్తం మొత్తం",                  kn: "ಒಟ್ಟು ಮೊತ್ತ" },

  // Expense Tracking
  "Add Expense":            { en: "Add Expense",            hi: "खर्च जोड़ें",                 te: "ఖర్చు జోడించండి",               kn: "ವೆಚ್ಚ ಸೇರಿಸಿ" },
  "Expense Type":           { en: "Expense Type",           hi: "खर्च प्रकार",                te: "ఖర్చు రకం",                     kn: "ವೆಚ್ಚ ಪ್ರಕಾರ" },
  "Expenses":               { en: "Expenses",               hi: "खर्चे",                     te: "ఖర్చులు",                       kn: "ವೆಚ್ಚಗಳು" },
  "All Types":              { en: "All Types",              hi: "सभी प्रकार",                 te: "అన్ని రకాలు",                   kn: "ಎಲ್ಲಾ ಪ್ರಕಾರಗಳು" },
  "All Status":             { en: "All Status",             hi: "सभी स्थिति",                 te: "అన్ని స్థితులు",                 kn: "ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು" },
  "Start Date":             { en: "Start Date",             hi: "प्रारंभ तारीख",              te: "ప్రారంభ తేదీ",                  kn: "ಪ್ರಾರಂಭ ದಿನಾಂಕ" },
  "Created By":             { en: "Created By",             hi: "बनाया गया",                  te: "సృష్టించినవారు",                 kn: "ರಚಿಸಿದವರು" },
  "Issued To":              { en: "Issued To",              hi: "जारी किया गया",              te: "జారీ చేయబడింది",                kn: "ಜಾರಿಗೊಳಿಸಲಾಗಿದೆ" },

  // Fine System
  "Issue Fine":             { en: "Issue Fine",             hi: "जुर्माना जारी करें",          te: "జరిమానా విధించండి",              kn: "ದಂಡ ವಿಧಿಸಿ" },
  "Employee":               { en: "Employee",               hi: "कर्मचारी",                  te: "ఉద్యోగి",                       kn: "ಉದ್ಯೋಗಿ" },

  // Reports
  "Attendance Reports":     { en: "Attendance Reports",     hi: "उपस्थिति रिपोर्ट",           te: "హాజరు నివేదికలు",               kn: "ಹಾಜರಾತಿ ವರದಿಗಳು" },
  "Task Reports":           { en: "Task Reports",           hi: "कार्य रिपोर्ट",              te: "విధి నివేదికలు",                 kn: "ಕಾರ್ಯ ವರದಿಗಳు" },
  "Expense Reports":        { en: "Expense Reports",        hi: "खर्च रिपोर्ट",               te: "ఖర్చు నివేదికలు",               kn: "ವೆಚ್ಚ ವರದಿಗಳు" },
  "Horse Health Reports":   { en: "Horse Health Reports",   hi: "घोड़े के स्वास्थ्य रिपोर्ट", te: "గుర్రపు ఆరోగ్య నివేదికలు",       kn: "ಕುದుರೆ ಆರೋಗ್ಯ ವರದಿಗಳು" },
  "View and generate system reports": { en: "View and generate system reports", hi: "सिस्टम रिपोर्ट देखें और बनाएं", te: "వ్యవస్థ నివేదికలు చూడండి మరియు రూపొందించండి", kn: "ವ್ಯವಸ್ಥೆ ವರದಿಗಳನ್ನು ನೋಡಿ ಮತ್ತು ರಚಿಸಿ" },

  // Settings
  "Task Configuration":     { en: "Task Configuration",     hi: "कार्य कॉन्फ़िगरेशन",          te: "విధి కాన్ఫిగరేషన్",              kn: "ಕಾರ್ಯ ಕಾನ್ಫಿಗರೇಶನ್" },
  "Approval Configuration": { en: "Approval Configuration", hi: "अनुमोदन कॉन्फ़िगरेशन",        te: "ఆమోద కాన్ఫిగరేషన్",              kn: "ಅನುಮೋದನೆ ಕಾನ್ಫಿಗರೇಶನ್" },
  "Working Hours":          { en: "Working Hours",          hi: "कार्य घंटे",                 te: "పని గంటలు",                     kn: "ಕೆಲಸದ ಗಂಟೆಗಳು" },

  // Search placeholders
  "Search horses, emp...":  { en: "Search horses, emp...",  hi: "घोड़े, कर्मचारी खोजें...",  te: "గుర్రాలు, ఉద్యోగులు వెతకండి...", kn: "ಕುದುರೆ, ಉದ್ಯೋಗಿ ಹುಡುಕಿ..." },
  "Search tasks by name, type...": { en: "Search tasks by name, type...", hi: "नाम, प्रकार से कार्य खोजें...", te: "పేరు, రకం ద్వారా విధులను వెతకండి...", kn: "ಹೆಸರು, ಪ್ರಕಾರ ಮೂಲಕ ಕಾರ್ಯಗಳನ್ನು ಹುಡುಕಿ..." },

  // Approval page strings
  "Pending Approvals":      { en: "Pending Approvals",      hi: "अनुमोदन लंबित",              te: "పెండింగ్ ఆమోదాలు",               kn: "ಬಾಕಿ ಅನುಮೋದನೆಗಳು" },

  // Bichali / Groom Worksheet specific
  "Bichali (kg)":           { en: "Bichali (kg)",           hi: "बिचाली (किलो)",              te: "బిచాలి (కేజీ)",                 kn: "ಬಿಚಾಲಿ (ಕೆಜಿ)" },
  "Boo Sa (Bags)":          { en: "Boo Sa (Bags)",          hi: "बू सा (बैग)",                te: "బూ సా (బ్యాగ్‌లు)",             kn: "ಬೂ ಸಾ (ಬ್ಯಾಗ್‌ಗಳు)" },
  "Select Date:":           { en: "Select Date:",           hi: "तारीख चुनें:",               te: "తేదీ ఎంచుకోండి:",               kn: "ದಿನಾಂಕ ಆಯ್ಕೆ ಮಾಡಿ:" },
  "All Grooms":             { en: "All Grooms",             hi: "सभी ग्रूम",                  te: "అన్ని గ్రూమ్‌లు",               kn: "ಎಲ್ಲಾ ಗ್ರೂಮ್‌ಗಳು" },
  "All Instructors":        { en: "All Instructors",        hi: "सभी प्रशिक्षक",              te: "అన్ని ఇన్‌స్ట్రక్టర్లు",          kn: "ಎಲ್ಲಾ ಬೋಧಕರು" },

  // Select date/filter
  "All Horses":             { en: "All Horses",             hi: "सभी घोड़े",                  te: "అన్ని గుర్రాలు",                 kn: "ಎಲ್ಲಾ ಕುದుರೆಗಳು" },
  "All Employees":          { en: "All Employees",          hi: "सभी कर्मचारी",               te: "అన్ని ఉద్యోగులు",               kn: "ಎಲ್ಲಾ ಉದ್ಯೋಗಿಗಳು" },
  "FILTER BY STATUS":       { en: "FILTER BY STATUS",       hi: "स्थिति के अनुसार फ़िल्टर",    te: "స్థితి ద్వారా ఫిల్టర్",          kn: "ಸ್ಥಿತಿ ಮೂಲಕ ಫಿಲ್ಟರ್" },
  "Created by":             { en: "Created by",             hi: "बनाया गया",                  te: "సృష్టించినవారు",                 kn: "ರಚಿಸಿದವರು" },

  // Pagination
  "Go to:":                 { en: "Go to:",                 hi: "इस पर जाएं:",                te: "వెళ్ళండి:",                     kn: "ಹೋಗಿ:" },
  "Go":                     { en: "Go",                     hi: "जाएं",                      te: "వెళ్ళు",                        kn: "ಹೋಗು" },

  // Additional page headings
  "Groom Work Sheet":       { en: "Groom Work Sheet",       hi: "ग्रूम वर्क शीट",              te: "గ్రూమ్ వర్క్ షీట్",             kn: "ಗ್ರೂಮ್ ವರ್ಕ್ ಶೀಟ್" },
  "Feed Inventory Management": { en: "Feed Inventory Management", hi: "चारा इन्वेंटरी प्रबंधन", te: "మేత జాబితా నిర్వహణ", kn: "ಆಹಾರ ದಾಸ್ತಾನು ನಿರ್ವಹಣೆ" },
  "Task Approvals":         { en: "Task Approvals",         hi: "कार्य अनुमोदन",              te: "విధి ఆమోదాలు",                  kn: "ಕಾರ್ಯ ಅನುಮೋದನೆಗಳು" },
  "Gate Entry/Exit Register": { en: "Gate Entry/Exit Register", hi: "गेट प्रवेश/निकास रजिस्टर", te: "గేట్ ఎంట్రీ/ఎగ్జిట్ రిజిస్టర్", kn: "ಗೇಟ್ ಪ್ರವೇಶ/ನಿರ್ಗಮನ ರಿಜಿಸ್ಟರ್" },
  "Digital Attendance":     { en: "Digital Attendance",     hi: "डिजिटल उपस्थिति",            te: "డిజిటల్ హాజరు",                 kn: "ಡಿಜಿಟಲ್ ಹಾಜರಾತಿ" },
  "Attendance Management":  { en: "Attendance Management",  hi: "उपस्थिति प्रबंधन",            te: "హాజరు నిర్వహణ",                 kn: "ಹಾಜರಾತಿ ನಿರ್ವಹಣೆ" },
  "EIRS Invoice":           { en: "EIRS Invoice",           hi: "EIRS चालान",                te: "EIRS ఇన్‌వాయిస్",               kn: "EIRS ಇನ್‌ವಾಯ್ಸ್" },
  "Daily Work Records (EIRS)": { en: "Daily Work Records (EIRS)", hi: "दैनिक कार्य रिकॉर्ड (EIRS)", te: "దినసరి పని రికార్డులు (EIRS)", kn: "ದೈನಿಕ ಕೆಲಸ ದಾಖಲೆಗಳು (EIRS)" },
  "Jamedar Inspection Rounds": { en: "Jamedar Inspection Rounds", hi: "जमादार निरीक्षण राउंड", te: "జమేదార్ తనిఖీ రౌండ్లు", kn: "ಜಮೇದಾರ್ ಪರಿಶೀಲನೆ ಸುತ್ತುಗಳು" },
  "Jamedar Round Tracking": { en: "Jamedar Round Tracking", hi: "जमादार राउंड ट्रैकिंग",      te: "జమేదార్ రౌండ్ ట్రాకింగ్",       kn: "ಜಮೇದಾರ್ ಸುತ್ತು ಟ್ರ್ಯಾಕಿಂಗ್" },
  "My Daily Rounds":        { en: "My Daily Rounds",        hi: "मेरे दैनिक राउंड",            te: "నా రోజువారీ రౌండ్లు",            kn: "ನನ್ನ ದೈನಿಕ ಸುತ್ತುಗಳು" },
  "Task Details":           { en: "Task Details",           hi: "कार्य विवरण",                te: "విధి వివరాలు",                   kn: "ಕಾರ್ಯ ವಿವರಗಳು" },
  "Horse Details":          { en: "Horse Details",          hi: "घोड़े का विवरण",              te: "గుర్రపు వివరాలు",               kn: "ಕುದುರೆ ವಿವರಗಳು" },
  "Horse Care Team Management": { en: "Horse Care Team Management", hi: "घोड़े की देखभाल टीम प्रबंधन", te: "గుర్రపు సంరక్షణ బృంద నిర్వహణ", kn: "ಕುದುರೆ ಆರೈಕೆ ತಂಡ ನಿರ್ವಹಣೆ" },
  "Medicine Administration Log": { en: "Medicine Administration Log", hi: "दवा प्रशासन लॉग", te: "మందుల పంపిణీ లాగ్", kn: "ಔಷಧ ನಿರ್ವಹಣೆ ಲಾಗ್" },
  "Gate Attendance & Visitor Log": { en: "Gate Attendance & Visitor Log", hi: "गेट उपस्थिति और आगंतुक लॉग", te: "గేట్ హాజరు & సందర్శకుల లాగ్", kn: "ಗೇಟ್ ಹಾಜರಾತಿ & ಸಂದರ್ಶಕರ ಲಾಗ್" },
  "Access Denied":          { en: "Access Denied",          hi: "प्रवेश निषेध",               te: "ప్రవేశం నిరాకరించబడింది",         kn: "ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ" },
  "Add New Horse":          { en: "Add New Horse",          hi: "नया घोड़ा जोड़ें",             te: "కొత్త గుర్రాన్ని జోడించండి",      kn: "ಹೊಸ ಕುದುರೆ ಸೇರಿಸಿ" },
  "All Horses":             { en: "All Horses",             hi: "सभी घोड़े",                  te: "అన్ని గుర్రాలు",                 kn: "ಎಲ್ಲಾ ಕುದುರೆಗಳು" },
  "Horses Under My Care":   { en: "Horses Under My Care",   hi: "मेरी देखभाल में घोड़े",       te: "నా సంరక్షణలో ఉన్న గుర్రాలు",     kn: "ನನ್ನ ಆರೈಕೆಯಲ್ಲಿರುವ ಕುದುರೆಗಳು" },
  "Add New Employee":       { en: "Add New Employee",       hi: "नया कर्मचारी जोड़ें",         te: "కొత్త ఉద్యోగిని జోడించండి",       kn: "ಹೊಸ ಉದ್ಯೋಗಿ ಸೇರಿಸಿ" },
  "All Employees":          { en: "All Employees",          hi: "सभी कर्मचारी",               te: "అన్ని ఉద్యోగులు",               kn: "ಎಲ್ಲಾ ಉದ್ಯೋಗಿಗಳು" },
  "Pending Review":         { en: "Pending Review",         hi: "समीक्षा लंबित",               te: "సమీక్ష పెండింగ్",                kn: "ಪರಾಮರ್ಶೆ ಬಾಕಿ" },
  "Approved Tasks":         { en: "Approved Tasks",         hi: "स्वीकृत कार्य",              te: "ఆమోదించిన విధులు",              kn: "ಅನುಮೋದಿಸಿದ ಕಾರ್ಯಗಳು" },
  "Submit Task Completion": { en: "Submit Task Completion", hi: "कार्य पूर्णता सबमिट करें",    te: "విధి పూర్తి సమర్పించండి",        kn: "ಕಾರ್ಯ ಪೂರ್ಣಗೊಳಿಸುವಿಕೆ ಸಲ್ಲಿಸಿ" },
  "Issue New Fine":         { en: "Issue New Fine",         hi: "नया जुर्माना जारी करें",      te: "కొత్త జరిమానా విధించండి",        kn: "ಹೊಸ ದಂಡ ವಿಧಿಸಿ" },
  "Fine Details":           { en: "Fine Details",           hi: "जुर्माना विवरण",              te: "జరిమానా వివరాలు",               kn: "ದಂಡ ವಿವರಗಳು" },
  "Resolve Fine":           { en: "Resolve Fine",           hi: "जुर्माना निपटाएं",            te: "జరిమానా పరిష్కరించండి",          kn: "ದಂಡ ಪರಿಹರಿಸಿ" },
  "Report Issue":           { en: "Report Issue",           hi: "समस्या की रिपोर्ट करें",     te: "సమస్య నివేదించండి",             kn: "ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ" },
  "Inspection Details":     { en: "Inspection Details",     hi: "निरीक्षण विवरण",              te: "తనిఖీ వివరాలు",                 kn: "ಪರಿಶೀಲನೆ ವಿವರಗಳು" },
  "Resolve Inspection":     { en: "Resolve Inspection",     hi: "निरीक्षण निपटाएं",            te: "తనిఖీ పరిష్కరించండి",            kn: "ಪರಿಶೀಲನೆ ಪರಿಹರಿಸಿ" },
  "Edit Inspection":        { en: "Edit Inspection",        hi: "निरीक्षण संपादित करें",       te: "తనిఖీ సవరించండి",               kn: "ಪರಿಶೀಲನೆ ಸಂಪಾದಿಸಿ" },
  "New Expense":            { en: "New Expense",            hi: "नया खर्च",                   te: "కొత్త ఖర్చు",                   kn: "ಹೊಸ ವೆಚ್ಚ" },
  "Edit Expense":           { en: "Edit Expense",           hi: "खर्च संपादित करें",           te: "ఖర్చు సవరించండి",               kn: "ವೆಚ್ಚ ಸಂಪಾದಿಸಿ" },
  "New Feed Record":        { en: "New Feed Record",        hi: "नया चारा रिकॉर्ड",            te: "కొత్త మేత రికార్డ్",             kn: "ಹೊಸ ಆಹಾರ ದಾಖಲೆ" },
  "New Meeting":            { en: "New Meeting",            hi: "नई बैठक",                    te: "కొత్త సమావేశం",                 kn: "ಹೊಸ ಸಭೆ" },
  "New Work Record":        { en: "New Work Record",        hi: "नया कार्य रिकॉर्ड",           te: "కొత్త పని రికార్డ్",             kn: "ಹೊಸ ಕೆಲಸ ದಾಖಲೆ" },
  "Edit Work Record":       { en: "Edit Work Record",       hi: "कार्य रिकॉर्ड संपादित करें",  te: "పని రికార్డ్ సవరించండి",         kn: "ಕೆಲಸ ದಾಖಲೆ ಸಂಪಾದಿಸಿ" },
  "Recent Attendance":      { en: "Recent Attendance",      hi: "हाल की उपस्थिति",             te: "ఇటీవలి హాజరు",                  kn: "ಇತ್ತೀಚಿನ ಹಾಜರಾತಿ" },
  "Configure task templates and schedules": { en: "Configure task templates and schedules", hi: "कार्य टेम्पलेट और शेड्यूल कॉन्फ़िगर करें", te: "విధి టెంప్లేట్లు మరియు షెడ్యూల్‌లను కాన్ఫిగర్ చేయండి", kn: "ಕಾರ್ಯ ಟೆಂಪ್ಲೇಟ್‌ಗಳು ಮತ್ತು ವೇಳಾಪಟ್ಟಿಗಳನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡಿ" },
  "Set SLA times and escalation rules": { en: "Set SLA times and escalation rules", hi: "SLA समय और एस्केलेशन नियम सेट करें", te: "SLA సమయాలు మరియు ఎస్కలేషన్ నియమాలు సెట్ చేయండి", kn: "SLA ಸಮಯ ಮತ್ತು ಎಸ್ಕಲೇಶನ್ ನಿಯಮಗಳನ್ನು ಹೊಂದಿಸಿ" },
  "Configure facility hours and shifts": { en: "Configure facility hours and shifts", hi: "सुविधा समय और शिफ्ट कॉन्फ़िगर करें", te: "సదుపాయ గంటలు మరియు షిఫ్ట్‌లను కాన్ఫిగర్ చేయండి", kn: "ಸೌಲಭ್ಯ ಗಂಟೆಗಳು ಮತ್ತು ಶಿಫ್ಟ್‌ಗಳನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡಿ" },
  "View daily and team attendance summaries.": { en: "View daily and team attendance summaries.", hi: "दैनिक और टीम उपस्थिति सारांश देखें।", te: "రోజువారీ మరియు బృంద హాజరు సారాంశాలను చూడండి.", kn: "ದೈನಿಕ ಮತ್ತು ತಂಡದ ಹಾಜರಾತಿ ಸಾರಾಂಶಗಳನ್ನು ನೋಡಿ." },
  "View task completion and assignment statistics.": { en: "View task completion and assignment statistics.", hi: "कार्य पूर्णता और असाइनमेंट आंकड़े देखें।", te: "విధి పూర్తి మరియు అసైన్‌మెంట్ గణాంకాలను చూడండి.", kn: "ಕಾರ್ಯ ಪೂರ್ಣಗೊಳಿಸುವಿಕೆ ಮತ್ತು ನಿಯೋಜನೆ ಅಂಕಿಅಂಶಗಳನ್ನು ನೋಡಿ." },
  "View expense summaries and breakdowns.": { en: "View expense summaries and breakdowns.", hi: "खर्च सारांश और ब्रेकडाउन देखें।", te: "ఖర్చు సారాంశాలు మరియు విభజనలను చూడండి.", kn: "ವೆಚ್ಚ ಸಾರಾಂಶಗಳು ಮತ್ತು ವಿಭಜನೆಗಳನ್ನು ನೋಡಿ." },
  "View inspection rounds and medicine logs.": { en: "View inspection rounds and medicine logs.", hi: "निरीक्षण राउंड और दवा लॉग देखें।", te: "తనిఖీ రౌండ్లు మరియు మందుల లాగ్‌లను చూడండి.", kn: "ಪರಿಶೀಲನೆ ಸುತ್ತುಗಳು ಮತ್ತು ಔಷಧ ಲಾಗ್‌ಗಳನ್ನು ನೋಡಿ." },
  "Work Sessions":          { en: "Work Sessions",          hi: "कार्य सत्र",                 te: "పని సెషన్లు",                    kn: "ಕೆಲಸದ ಅವಧಿಗಳು" },
  "Summary by Work Type":   { en: "Summary by Work Type",   hi: "कार्य प्रकार द्वारा सारांश",  te: "పని రకం ద్వారా సారాంశం",         kn: "ಕೆಲಸದ ಪ್ರಕಾರದ ಮೂಲಕ ಸಾರಾಂಶ" },
  "Fines":                  { en: "Fines",                  hi: "जुर्माने",                   te: "జరిమానాలు",                     kn: "ದಂಡಗಳು" },
  "Horse Care Teams":       { en: "Horse Care Teams",       hi: "घोड़े की देखभाल टीमें",       te: "గుర్రపు సంరక్షణ బృందాలు",        kn: "ಕುದುರೆ ಆರೈಕೆ ತಂಡಗಳು" },
  "Medicine Administration Records": { en: "Medicine Administration Records", hi: "दवा प्रशासन रिकॉर्ड", te: "మందుల పంపిణీ రికార్డులు", kn: "ಔಷಧ ನಿರ್ವಹಣೆ ದಾಖಲೆಗಳು" },
  "Stock Alerts":           { en: "Stock Alerts",           hi: "स्टॉक अलर्ट",                te: "స్టాక్ అలర్ట్‌లు",               kn: "ಸ್ಟಾಕ್ ಅಲರ್ಟ್‌ಗಳು" },
};

// ─── Context ─────────────────────────────────────────────────────────────────
const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('efm-lang') || 'en';
  });

  const handleSetLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('efm-lang', newLang);
  };

  const t = (key) => translations[key]?.[lang] || key;

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
