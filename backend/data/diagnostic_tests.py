"""
Nevika Cura - Diagnostic Tests Data
Mango Health Labs test catalog and pricing
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
            "CBC (Complete Blood Count)", "CBC ESR", "BT CT", "Blood Group", "Hemoglobin (Hb)", "ESR",
            # Sugar/Diabetes Tests
            "FBS (Fasting Blood Sugar)", "PPBS", "RBS", "HbA1c", "OGTT - 3 Sample",
            "Diabetes Basic", "Diabetes Screening",
            "Insulin - Post Prandial", "Insulin Random", "C-Peptide",
            # Kidney Function
            "Creatinine", "BUN", "Blood Urea", "RFT (Renal Function Test)", "Uric Acid",
            "Serum Electrolytes", "UPCR", "Urine Protein Creatinine Ratio", "Cystatin C",
            # Liver Function
            "LFT (Liver Function Test)", "SGPT (ALT)", "SGOT (AST)", "Total Bilirubin",
            "Direct Bilirubin", "Bile Acid", "Serum Albumin",
            "Serum Amylase", "Lipase", "LDH",
            # Lipid Profile
            "Lipid Profile", "Serum Cholesterol", "Total Cholesterol", 
            "Serum Triglyceride", "Triglycerides", "HDL", "LDL",
            # Cardiac Markers
            "CPKMB", "Troponin I",
            # Thyroid Tests
            "TSH", "Thyroid Profile - Free", "Free T3 T4 TSH", "Thyroid Profile - Total", "T3", "T4",
            # Vitamins & Minerals
            "Vitamin D", "Vitamin B12", "Iron Studies", "Calcium", "Serum Calcium",
            "Serum Magnesium", "Serum Phosphorus", "Sodium", "Potassium", "G6PD",
            # Inflammatory Markers
            "CRP (C-Reactive Protein)", "ASO Titre",
            # Hormonal Tests
            "FSH", "LH", "Prolactin", "AMH (Anti-Mullerian Hormone)", "Estradiol", "DHEAS",
            "Cortisol (Morning)", "Parathyroid Hormone (PTH)",
            "Serum Testosterone", "Serum PSA", "Beta HCG", "Hormonal Basic", "Hormonal Advance",
            # Tumor Markers
            "Alpha Fetoprotein", "CA 19.9", "CA 125", "CA 15.3", "CEA",
            # Pregnancy Markers
            "Dual / Double Marker", "Quadruple Marker", "ANC (Ante Natal Profile)",
            # Arthritis & Autoimmune
            "Arthritis Basic Panel", "Anti CCP", "RA Factor",
            "ANA IFA", "ANA Blot", "C ANCA", "P ANCA", "Anti dsDNA",
            # Infectious Disease
            "HIV - Rapid", "HCV - Rapid", "HBsAg", "VDRL / RPR", "H3 Viral Marker",
            "MP Antigen (Malaria)", "Blood Culture & Sensitivity",
            "Dengue NS1 Rapid", "Dengue Profile (IgM+IgG+NS1)", "Widal Test", "Filaria Antigen",
            # Coagulation
            "PT INR",
            # Genetic/Specialized
            "Karyotyping", "NIPT", "Histopathology", "Biopsy Growth", "Coombs Test, Indirect"
        ],
        "urine": [
            "Urine Routine & Microscopy", "Urine Culture & Sensitivity", "Urine Albumin"
        ],
        "stool": [
            "Stool Routine & Microscopy", "Stool Occult Blood"
        ],
        "culture": [
            "Blood Culture & Sensitivity", "Urine Culture & Sensitivity", 
            "Sputum Routine", "Pus C/S"
        ]
    },
    "hematology_advanced": {
        "smear_counts": [
            "Peripheral Smear", "Reticulocyte Count", "Platelet Count",
            "Absolute Eosinophil Count (AEC)", "Erythrocyte Sedimentation Rate (Westergren)",
            "Sickle Cell Test", "G6PD Qualitative", "Hemoglobin Electrophoresis (HPLC)",
            "Coomb's Test - Direct", "Coomb's Test - Indirect", "Osmotic Fragility Test",
            "Bone Marrow Study (Reporting)"
        ]
    },
    "coagulation": {
        "tests": [
            "Bleeding Time", "APTT (Activated Partial Thromboplastin Time)",
            "D-Dimer", "Fibrinogen", "Protein C & S (Activity)",
            "Prothrombin Time (PT) / INR"
        ]
    },
    "biochemistry_advanced": {
        "enzymes_proteins": [
            "Gamma-Glutamyl Transferase (GGT)", "Alkaline Phosphatase (ALP)",
            "Total Protein", "Globulin", "A/G Ratio (Albumin/Globulin Ratio)",
            "Ammonia", "Ceruloplasmin", "Ferritin", "TIBC (Total Iron Binding Capacity)",
            "Transferrin Saturation", "CPK (Creatine Phosphokinase) Total",
            "Alpha-Amylase", "CRP (C-Reactive Protein) - Quantitative",
            "Procalcitonin", "Electrophoresis - Serum Protein", "Electrophoresis - Urine Protein"
        ],
        "electrolytes": [
            "Calcium - Serum", "Phosphorus - Serum", "Magnesium - Serum",
            "Potassium - Serum", "Sodium - Serum", "Chloride - Serum",
            "Bicarbonate (HCO3)", "LDH (Lactate Dehydrogenase)", "Magnesium - Urine"
        ]
    },
    "hormones_extended": {
        "fertility_pcos": [
            "Progesterone", "SHBG (Sex Hormone Binding Globulin)", "Free Testosterone",
            "17-OH Progesterone", "Androstenedione", "Inhibin B",
            "Anti-Mullerian Hormone (AMH)", "Estradiol (E2)",
            "FSH (Follicle-Stimulating Hormone)", "LH (Luteinizing Hormone)"
        ],
        "growth_adrenal": [
            "IGF-1 (Insulin-like Growth Factor 1)", "Growth Hormone (GH)",
            "Aldosterone", "Renin (Plasma Renin Activity)",
            "Cortisol (Morning & Evening)", "DHEA-S (Dehydroepiandrosterone Sulfate)"
        ],
        "thyroid_parathyroid": [
            "Free T3", "Free T4", "Parathyroid Hormone (PTH) Intact",
            "Thyroid Profile (TSH, Free T3, Free T4)"
        ]
    },
    "infectious_diseases": {
        "viral": [
            "Quantiferon TB Gold", "COVID RT-PCR", "TORCH Panel",
            "EBV Panel (VCA IgM, EBNA IgG)", "CMV IgM & IgG",
            "Toxoplasma IgG & IgM", "Rubella IgG & IgM", "HSV 1&2 IgM & IgG",
            "HIV 1 & 2 Antibody (CMIA)", "HBsAg (Hepatitis B Surface Antigen)",
            "Anti-HBs (Hepatitis B Surface Antibody)", "Anti-HBc Total (Hepatitis B Core Antibody Total)",
            "Anti-HCV (Hepatitis C Antibody)", "HAV IgM (Hepatitis A Virus IgM)",
            "HEV IgM (Hepatitis E Virus IgM)"
        ],
        "bacterial_parasitic": [
            "Typhidot IgM", "Chikungunya IgM", "Leptospira IgM",
            "Mantoux Test (PPD)", "Dengue NS1 Antigen", "Dengue IgM & IgG",
            "Malaria Parasite Detection (Antigen)", "Syphilis RPR/VDRL",
            "Mycobacterium Tuberculosis PCR (Sputum/Fluid)", "H. pylori Stool Antigen",
            "Chlamydia Trachomatis PCR", "Gonorrhea PCR"
        ]
    },
    "autoimmune": {
        "tests": [
            "Anti-Thyroid Peroxidase (TPO) Antibody", "Anti-Thyroglobulin (TG) Antibody",
            "Complement C3", "Complement C4", "Lupus Anticoagulant",
            "Anti-phospholipid Antibody Panel (IgG, IgM)", "Antinuclear Antibodies (ANA)",
            "Anti-dsDNA Antibodies", "Extractable Nuclear Antigen (ENA) Panel",
            "Rheumatoid Factor (RF)", "Anti-Cyclic Citrullinated Peptide (Anti-CCP)",
            "Anti-Neutrophil Cytoplasmic Antibodies (ANCA)",
            "Anti-Glutamic Acid Decarboxylase (Anti-GAD)",
            "Myasthenia Gravis Panel (AChR Antibodies)", "HLA B27",
            "Anti-Smooth Muscle Antibody (ASMA)"
        ]
    },
    "tumor_markers_extended": {
        "tests": [
            "PSA Free/Total Ratio", "HE4", "Neuron-specific Enolase (NSE)",
            "Chromogranin A", "SCC (Squamous Cell Carcinoma Antigen)",
            "Beta-2 Microglobulin", "CA 19-9", "CA 15-3",
            "Carcinoembryonic Antigen (CEA)", "Beta-HCG (Quantitative)",
            "Lactate Dehydrogenase (LDH)"
        ]
    },
    "cardiac_markers": {
        "tests": [
            "NT-proBNP", "Lipoprotein(a) [Lp(a)]", "Apolipoprotein A1/B Ratio",
            "High-sensitivity C-Reactive Protein (hs-CRP)", "ApoE Genotyping"
        ]
    },
    "allergy": {
        "tests": [
            "Total IgE", "Food Allergy Panel (Specific IgE)",
            "Inhalant Allergy Panel (Specific IgE)"
        ]
    },
    "immunology": {
        "tests": [
            "Immunoglobulin G (IgG) Levels", "Immunoglobulin A (IgA) Levels",
            "Immunoglobulin M (IgM) Levels", "Serum Protein Electrophoresis",
            "Kappa/Lambda Free Light Chains"
        ]
    },
    "vitamins_minerals": {
        "tests": [
            "Folate (Vitamin B9)", "Vitamin A", "Vitamin E",
            "Zinc", "Copper", "Selenium", "Vitamin D (25-OH)",
            "Magnesium", "Iron Studies Profile"
        ]
    },
    "drug_monitoring": {
        "tests": [
            "Lithium Therapeutic Drug Monitoring", "Phenytoin Therapeutic Drug Monitoring",
            "Valproic Acid Therapeutic Drug Monitoring", "Digoxin Therapeutic Drug Monitoring",
            "Methotrexate Therapeutic Drug Monitoring"
        ]
    },
    "metabolic": {
        "tests": [
            "Fructosamine", "Insulin Fasting", "Homocysteine", "Lactic Acid",
            "Methylmalonic Acid (MMA)", "Folate (Folic Acid)",
            "Microalbuminuria, Spot Urine", "Cholesterol - Non-HDL",
            "HbA1c (Glycated Hemoglobin)"
        ]
    },
    "urine_advanced": {
        "tests": [
            "24-Hour Urine Creatinine", "Urine Protein Creatinine Ratio (UPCR)",
            "Urine Calcium (24-Hour)", "Urine Amylase",
            "Urine Microalbumin / Creatinine Ratio"
        ]
    },
    "stool_advanced": {
        "tests": [
            "Stool Culture & Sensitivity", "Fecal Occult Blood Test (FOBT)",
            "Stool for C. difficile Toxin"
        ]
    },
    "imaging_advanced": {
        "xray_usg": [
            "X-ray Dorsal Spine AP/LAT", "X-ray Wrist AP/LAT",
            "USG Scrotum", "USG Follicular Study", "USG Doppler Renal Arteries",
            "Holter Monitoring (24-Hour)"
        ],
        "mri_ct": [
            "MRI Shoulder", "MRI Whole Abdomen", "CT Scan Maxillofacial",
            "CT Angiography Peripheral", "MRA Brain (Magnetic Resonance Angiography)",
            "Nuclear Bone Scan", "Transesophageal Echocardiography (TEE)", "Barium Enema"
        ]
    },
    "health_packages": {
        "packages": [
            "Liver Function Test (LFT) Package", "Kidney Function Test (KFT) Package",
            "Lipid Profile Package", "Fever Panel (Dengue, Malaria, Typhoid)",
            "Arthritis Panel", "Vitamin Deficiency Panel (Vit D, B12, Folate)",
            "Bone Profile Package", "Electrolyte Panel", "Gastrointestinal Health Panel",
            "Respiratory Health Panel", "Allergy Screening Panel", "Post-COVID Health Check",
            "Autoimmune Disorder Panel", "Pre-Marital Health Check", "Obesity Management Panel"
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
    "Urine Routine & Microscopy": 150, "Urine Albumin": 200, "UPCR": 660, "Urine Protein Creatinine Ratio": 660,
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
    
    # Stool Tests
    "Stool Routine & Microscopy": 200, "Stool Occult Blood": 350,
    
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
    "CA 15-3": 1100, "CA 19-9": 1000, "Magnesium": 350,
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
    "Home Visit": 100,
    
    # === NEW: 204 Additional Tests (AI-enriched via Gemini) ===
    
    # Hematology Advanced
    "Peripheral Smear": 350, "Reticulocyte Count": 550, "Platelet Count": 250,
    "Absolute Eosinophil Count (AEC)": 200, "Erythrocyte Sedimentation Rate (Westergren)": 150,
    "Sickle Cell Test": 400, "G6PD Qualitative": 350, "Hemoglobin Electrophoresis (HPLC)": 1200,
    "Coomb's Test - Direct": 500, "Coomb's Test - Indirect": 500,
    "Osmotic Fragility Test": 600, "Bone Marrow Study (Reporting)": 3000,
    
    # Coagulation
    "Bleeding Time": 200, "APTT (Activated Partial Thromboplastin Time)": 400,
    "D-Dimer": 950, "Fibrinogen": 700, "Protein C & S (Activity)": 3500,
    "Prothrombin Time (PT) / INR": 350,
    
    # Biochemistry Advanced
    "Gamma-Glutamyl Transferase (GGT)": 280, "Alkaline Phosphatase (ALP)": 250,
    "Total Protein": 200, "Globulin": 200, "A/G Ratio (Albumin/Globulin Ratio)": 250,
    "Ammonia": 500, "Ceruloplasmin": 800, "Ferritin": 500,
    "TIBC (Total Iron Binding Capacity)": 400, "Transferrin Saturation": 450,
    "Calcium - Serum": 200, "Phosphorus - Serum": 200, "Magnesium - Serum": 350,
    "Potassium - Serum": 250, "Sodium - Serum": 250, "Chloride - Serum": 250,
    "Bicarbonate (HCO3)": 300, "CPK (Creatine Phosphokinase) Total": 400,
    "LDH (Lactate Dehydrogenase)": 350, "Alpha-Amylase": 350,
    "CRP (C-Reactive Protein) - Quantitative": 500, "Procalcitonin": 2500,
    "Electrophoresis - Serum Protein": 1200, "Electrophoresis - Urine Protein": 1200,
    "Magnesium - Urine": 400,
    
    # Hormones Extended
    "Progesterone": 500, "SHBG (Sex Hormone Binding Globulin)": 900,
    "Free Testosterone": 800, "IGF-1 (Insulin-like Growth Factor 1)": 1500,
    "Growth Hormone (GH)": 800, "Aldosterone": 1200,
    "Renin (Plasma Renin Activity)": 1500, "17-OH Progesterone": 900,
    "Androstenedione": 900, "Inhibin B": 2000,
    "Anti-Mullerian Hormone (AMH)": 1200, "Cortisol (Morning & Evening)": 700,
    "DHEA-S (Dehydroepiandrosterone Sulfate)": 600, "Estradiol (E2)": 500,
    "FSH (Follicle-Stimulating Hormone)": 450, "LH (Luteinizing Hormone)": 450,
    "Free T3": 300, "Free T4": 300, "Parathyroid Hormone (PTH) Intact": 800,
    "Thyroid Profile (TSH, Free T3, Free T4)": 500,
    
    # Infectious Diseases
    "Quantiferon TB Gold": 3000, "Typhidot IgM": 500, "Chikungunya IgM": 800,
    "Leptospira IgM": 800, "EBV Panel (VCA IgM, EBNA IgG)": 2000,
    "CMV IgM & IgG": 1200, "Toxoplasma IgG & IgM": 1200,
    "Rubella IgG & IgM": 1000, "HSV 1&2 IgM & IgG": 1500,
    "COVID RT-PCR": 500, "TORCH Panel": 3500, "Mantoux Test (PPD)": 250,
    "Dengue NS1 Antigen": 600, "Dengue IgM & IgG": 800,
    "Malaria Parasite Detection (Antigen)": 400,
    "HIV 1 & 2 Antibody (CMIA)": 500, "HBsAg (Hepatitis B Surface Antigen)": 400,
    "Anti-HBs (Hepatitis B Surface Antibody)": 500,
    "Anti-HBc Total (Hepatitis B Core Antibody Total)": 600,
    "Anti-HCV (Hepatitis C Antibody)": 500, "HAV IgM (Hepatitis A Virus IgM)": 800,
    "HEV IgM (Hepatitis E Virus IgM)": 800, "Syphilis RPR/VDRL": 300,
    "Mycobacterium Tuberculosis PCR (Sputum/Fluid)": 3500,
    "H. pylori Stool Antigen": 800,
    "Chlamydia Trachomatis PCR": 1500, "Gonorrhea PCR": 1500,
    
    # Autoimmune
    "Anti-Thyroid Peroxidase (TPO) Antibody": 900,
    "Anti-Thyroglobulin (TG) Antibody": 900,
    "Complement C3": 800, "Complement C4": 800, "Lupus Anticoagulant": 1800,
    "Anti-phospholipid Antibody Panel (IgG, IgM)": 2500,
    "Antinuclear Antibodies (ANA)": 1200, "Anti-dsDNA Antibodies": 1200,
    "Extractable Nuclear Antigen (ENA) Panel": 3500,
    "Rheumatoid Factor (RF)": 400,
    "Anti-Cyclic Citrullinated Peptide (Anti-CCP)": 1200,
    "Anti-Neutrophil Cytoplasmic Antibodies (ANCA)": 1500,
    "Anti-Glutamic Acid Decarboxylase (Anti-GAD)": 2000,
    "Myasthenia Gravis Panel (AChR Antibodies)": 3000,
    "HLA B27": 1800, "Anti-Smooth Muscle Antibody (ASMA)": 1500,
    
    # Tumor Markers Extended
    "PSA Free/Total Ratio": 1000, "HE4": 1500,
    "Neuron-specific Enolase (NSE)": 1200, "Chromogranin A": 2500,
    "SCC (Squamous Cell Carcinoma Antigen)": 1200, "Beta-2 Microglobulin": 1000,
    "Carcinoembryonic Antigen (CEA)": 800, "Beta-HCG (Quantitative)": 600,
    "Lactate Dehydrogenase (LDH)": 350,
    
    # Cardiac Markers
    "NT-proBNP": 2000, "Lipoprotein(a) [Lp(a)]": 1200,
    "Apolipoprotein A1/B Ratio": 1500,
    "High-sensitivity C-Reactive Protein (hs-CRP)": 700, "ApoE Genotyping": 5000,
    
    # Allergy
    "Total IgE": 600, "Food Allergy Panel (Specific IgE)": 4000,
    "Inhalant Allergy Panel (Specific IgE)": 4000,
    
    # Immunology
    "Immunoglobulin G (IgG) Levels": 600, "Immunoglobulin A (IgA) Levels": 600,
    "Immunoglobulin M (IgM) Levels": 600, "Serum Protein Electrophoresis": 1200,
    "Kappa/Lambda Free Light Chains": 4000,
    
    # Vitamins & Minerals
    "Folate (Vitamin B9)": 600, "Vitamin A": 800, "Vitamin E": 900,
    "Zinc": 500, "Copper": 600, "Selenium": 1200,
    "Vitamin D (25-OH)": 800, "Iron Studies Profile": 600,
    
    # Drug Monitoring
    "Lithium Therapeutic Drug Monitoring": 500,
    "Phenytoin Therapeutic Drug Monitoring": 600,
    "Valproic Acid Therapeutic Drug Monitoring": 700,
    "Digoxin Therapeutic Drug Monitoring": 600,
    "Methotrexate Therapeutic Drug Monitoring": 800,
    
    # Metabolic
    "Fructosamine": 500, "Insulin Fasting": 400, "Homocysteine": 900,
    "Lactic Acid": 500, "Methylmalonic Acid (MMA)": 2500,
    "Folate (Folic Acid)": 600, "Microalbuminuria, Spot Urine": 400,
    "Cholesterol - Non-HDL": 200, "HbA1c (Glycated Hemoglobin)": 400,
    "Lipoprotein (a) [Lp(a)]": 1200, "Apolipoprotein A1 (Apo A1)": 800,
    "Apolipoprotein B (Apo B)": 800, "Vitamin D Total (25-OH)": 800,
    "Aldosterone - Serum": 1200, "Renin Activity - Plasma": 1500,
    "Zinc - Serum": 500,
    
    # Urine Advanced
    "24-Hour Urine Creatinine": 300, "Urine Protein Creatinine Ratio (UPCR)": 500,
    "Urine Calcium (24-Hour)": 350, "Urine Amylase": 350,
    "Urine Microalbumin / Creatinine Ratio": 500,
    
    # Stool Advanced
    "Stool Culture & Sensitivity": 800,
    "Fecal Occult Blood Test (FOBT)": 400, "Stool for C. difficile Toxin": 1500,
    
    # Inflammation
    "CRP Quantitative (C-Reactive Protein)": 500,
    "ESR (Erythrocyte Sedimentation Rate)": 150,
    
    # Oncology
    "Alpha-Fetoprotein (AFP)": 700,
    
    # Imaging Advanced
    "X-ray Dorsal Spine AP/LAT": 400, "X-ray Wrist AP/LAT": 350,
    "USG Scrotum": 800, "USG Follicular Study": 1000,
    "USG Doppler Renal Arteries": 2000, "MRI Shoulder": 6000,
    "MRI Whole Abdomen": 8000, "CT Scan Maxillofacial": 4000,
    "CT Angiography Peripheral": 7000, "Barium Enema": 2000,
    "Holter Monitoring (24-Hour)": 2500,
    "Transesophageal Echocardiography (TEE)": 5000,
    "MRA Brain (Magnetic Resonance Angiography)": 8000,
    "Nuclear Bone Scan": 6000,
    
    # Health Packages
    "Liver Function Test (LFT) Package": 800,
    "Kidney Function Test (KFT) Package": 800,
    "Lipid Profile Package": 600,
    "Fever Panel (Dengue, Malaria, Typhoid)": 1200,
    "Arthritis Panel": 2000,
    "Vitamin Deficiency Panel (Vit D, B12, Folate)": 1500,
    "Bone Profile Package": 1200, "Electrolyte Panel": 600,
    "Gastrointestinal Health Panel": 2500, "Respiratory Health Panel": 2000,
    "Allergy Screening Panel": 3500, "Post-COVID Health Check": 2500,
    "Autoimmune Disorder Panel": 5000, "Pre-Marital Health Check": 3000,
    "Obesity Management Panel": 2000,
    
    # Urine & Stool (from existing, ensure dupes)
    "Stool Routine & Microscopic Examination": 200,
    "Urine Routine & Microscopic Examination": 150,
}
