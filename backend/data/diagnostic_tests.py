"""
Nevika Cura - Diagnostic Tests Data
Proton Diagnostics test catalog and pricing
"""

# Default diagnostic tests organized by category
DIAGNOSTIC_TESTS = {
    "imaging": {
        "ecg": ["ECG (Electrocardiogram)"],
        "sonography": [
            "Early Scan", "NT Scan (Nuchal Translucency)", "Growth Scan",
            "USG Pelvis", "Follicular Monitoring"
        ]
    },
    "pathology": {
        "blood": [
            # Basic Blood Tests
            "CBC (Complete Blood Count)", "Blood Group", "Hemoglobin (Hb)", "ESR",
            # Sugar Tests
            "FBS (Fasting Blood Sugar)", "PPBS", "RBS", "HbA1c", "OGTT - 3 Sample",
            # Kidney Function
            "Creatinine", "Blood Urea", "RFT (Renal Function Test)", "Uric Acid",
            "Serum Electrolytes", "UPCR",
            # Liver Function
            "LFT (Liver Function Test)", "SGPT (ALT)", "SGOT (AST)", "Bilirubin Total",
            "Serum Amylase", "Lipase", "LDH",
            # Lipid Profile
            "Lipid Profile", "Total Cholesterol", "Triglycerides", "HDL", "LDL",
            # Thyroid Tests
            "TSH", "Thyroid Profile - Free", "Thyroid Profile - Total", "T3", "T4",
            # Vitamins & Minerals
            "Vitamin D", "Vitamin B12", "Iron Studies", "Calcium", "G6PD",
            # Inflammatory Markers
            "CRP (C-Reactive Protein)", "ESR",
            # Hormonal Tests
            "AMH (Anti-Mullerian Hormone)", "Serum Testosterone", "Serum PSA",
            "Beta HCG", "Hormonal Basic", "Hormonal Advance",
            # Tumor Markers
            "Alpha Fetoprotein", "CA 19.9",
            # Pregnancy Markers
            "Dual / Double Marker", "Quadruple Marker", "ANC (Ante Natal Profile)",
            # Arthritis & Autoimmune
            "Arthritis Basic Panel", "Anti CCP", "RA Factor",
            # Infectious Disease
            "HIV - Rapid", "HCV - Rapid", "VDRL / RPR", "H3 Viral Marker",
            "MP Antigen (Malaria)", "Blood Culture & Sensitivity",
            # Coagulation
            "PT INR",
            # Health Packages
            "Diabetes Basic", "Diabetes Screening", "Diabetes Advance"
        ],
        "urine": [
            "Urine Routine & Microscopy", "Urine Culture & Sensitivity", "Urine Albumin"
        ],
        "stool": [
            "Stool Routine & Microscopy", "Stool Occult Blood"
        ]
    }
}

# Diagnostic test prices (from Lupin Diagnostics rate list)
DIAGNOSTIC_TEST_PRICES = {
    "Alpha Fetoprotein": 650, "AMH (Anti-Mullerian Hormone)": 1650, "ANC (Ante Natal Profile)": 1950,
    "Anti CCP": 1250, "Arthritis Basic Panel": 1650, "Beta HCG": 680,
    "Blood Culture & Sensitivity": 1000, "Blood Group": 150, "CA 19.9": 850,
    "CBC (Complete Blood Count)": 200, "Creatinine": 180, "CRP (C-Reactive Protein)": 450,
    "Diabetes Advance": 650, "Diabetes Basic": 150, "Diabetes Screening": 250,
    "Dual / Double Marker": 2000, "FBS (Fasting Blood Sugar)": 75, "G6PD": 470,
    "H3 Viral Marker": 1200, "HbA1c": 400, "HCV - Rapid": 600, "HIV - Rapid": 450,
    "Hormonal Advance": 1200, "Hormonal Basic": 800, "LDH": 550,
    "LFT (Liver Function Test)": 450, "Lipase": 600, "Lipid Profile": 500,
    "MP Antigen (Malaria)": 650, "OGTT - 3 Sample": 450, "PPBS": 75, "PT INR": 450,
    "Quadruple Marker": 2600, "RBS": 75, "RFT (Renal Function Test)": 600,
    "Serum Amylase": 550, "Serum Electrolytes": 400, "Serum PSA": 850,
    "Serum Testosterone": 500, "SGOT (AST)": 180, "SGPT (ALT)": 180,
    "Thyroid Profile - Free": 550, "Thyroid Profile - Total": 350, "TSH": 200,
    "UPCR": 680, "Uric Acid": 200, "Urine Culture & Sensitivity": 1000,
    "Urine Routine & Microscopy": 150, "Vitamin B12": 500, "Vitamin D": 850,
    "VDRL / RPR": 200, "ECG (Electrocardiogram)": 300, "Early Scan": 800,
    "NT Scan (Nuchal Translucency)": 1500, "Growth Scan": 1000, "USG Pelvis": 700,
    "Follicular Monitoring": 500, "Home Visit": 100
}
