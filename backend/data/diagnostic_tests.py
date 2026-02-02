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

# Diagnostic test prices (Updated from Master Lab Inventory)
DIAGNOSTIC_TEST_PRICES = {
    # Basic Blood Tests
    "CBC (Complete Blood Count)": 500, "CBC ESR": 380, "BT CT": 250, "Blood Group": 150,
    "Hemoglobin (Hb)": 100, "ESR": 100,
    
    # Sugar/Diabetes Tests
    "FBS (Fasting Blood Sugar)": 75, "PPBS": 75, "RBS": 75, "HbA1c": 450,
    "Diabetes Basic": 250, "Diabetes Screening": 600, "OGTT - 3 Sample": 450,
    "Insulin - Post Prandial": 650, "Insulin Random": 1100, "C-Peptide": 1050,
    
    # Thyroid Tests
    "TSH": 200, "Thyroid Profile - Free": 550, "Free T3 T4 TSH": 550,
    "Thyroid Profile - Total": 350, "T3": 200, "T4": 200,
    
    # Hormonal Tests
    "FSH": 400, "LH": 400, "Prolactin": 350, "AMH (Anti-Mullerian Hormone)": 1550,
    "Estradiol": 650, "DHEAS": 500, "Cortisol (Morning)": 600,
    "Parathyroid Hormone (PTH)": 1500, "Serum Testosterone": 500, "Beta HCG": 680,
    "Hormonal Basic": 800, "Hormonal Advance": 1200,
    
    # Liver Function Tests
    "LFT (Liver Function Test)": 450, "Total Bilirubin": 150, "Direct Bilirubin": 150,
    "Bile Acid": 2000, "Serum Albumin": 300, "SGPT (ALT)": 180, "SGOT (AST)": 180,
    
    # Kidney/Renal Function Tests
    "RFT (Renal Function Test)": 600, "Creatinine": 180, "BUN": 240, "Blood Urea": 240,
    "Urine Routine & Microscopy": 150, "UPCR": 660, "Urine Protein Creatinine Ratio": 660,
    "Cystatin C": 1100, "Uric Acid": 200, "Serum Electrolytes": 400,
    
    # Lipid Profile
    "Lipid Profile": 500, "Serum Cholesterol": 220, "Total Cholesterol": 220,
    "Serum Triglyceride": 250, "Triglycerides": 250, "HDL": 150, "LDL": 150,
    
    # Cardiac Markers
    "CPKMB": 450, "Troponin I": 1050,
    
    # Infectious Disease Tests
    "HIV - Rapid": 550, "HCV - Rapid": 600, "HBsAg": 400, "VDRL / RPR": 200,
    "Dengue NS1 Rapid": 800, "Dengue Profile (IgM+IgG+NS1)": 1450,
    "Widal Test": 330, "Filaria Antigen": 360, "MP Antigen (Malaria)": 650,
    "H3 Viral Marker": 1200,
    
    # Culture Tests
    "Blood Culture & Sensitivity": 1000, "Urine Culture & Sensitivity": 1000,
    "Sputum Routine": 150, "Pus C/S": 1000,
    
    # Arthritis & Autoimmune
    "RA Factor": 600, "CRP (C-Reactive Protein)": 450, "ASO Titre": 550,
    "Anti CCP": 1250, "ANA IFA": 1000, "ANA Blot": 3300,
    "C ANCA": 1300, "P ANCA": 1300, "Anti dsDNA": 1200,
    "Arthritis Basic Panel": 1650,
    
    # Tumor Markers
    "CA 19.9": 1000, "CA 125": 1100, "CA 15.3": 1100, "CEA": 800,
    "Alpha Fetoprotein": 800, "Serum PSA": 1050,
    
    # Enzymes
    "Lipase": 600, "Serum Amylase": 500, "LDH": 550, "G6PD": 470,
    
    # Minerals
    "Calcium": 200, "Serum Calcium": 200, "Serum Magnesium": 200,
    "Serum Phosphorus": 200, "Sodium": 150, "Potassium": 150,
    
    # Vitamins
    "Vitamin D": 850, "Vitamin B12": 500, "Iron Studies": 600,
    
    # Genetic/Specialized Tests
    "Karyotyping": 5500, "NIPT": 12000, "Histopathology": 2500,
    "Biopsy Growth": 2000, "Coombs Test, Indirect": 500,
    
    # Pregnancy Markers
    "Dual / Double Marker": 2000, "Quadruple Marker": 2600,
    "ANC (Ante Natal Profile)": 1950,
    
    # Coagulation
    "PT INR": 450,
    
    # Imaging
    "ECG (Electrocardiogram)": 300, "Early Scan": 800,
    "NT Scan (Nuchal Translucency)": 1500, "Growth Scan": 1000,
    "USG Pelvis": 700, "Follicular Monitoring": 500,
    
    # Service Charges
    "Home Visit": 100
}
