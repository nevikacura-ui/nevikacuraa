import { 
  Heart, Activity, Droplets, Droplet, TestTube, FlaskConical, 
  Stethoscope, Shield, Scan 
} from 'lucide-react';

// ============================================
// DESIGN SYSTEM - Mango Health Labs Theme
// ============================================
export const theme = {
  primary: '#C8F56A',
  primaryDark: '#A3D944',
  secondary: '#D4E157',
  accent: '#C8F56A',
  accentDark: '#A3D944',
  accentLight: '#E8FCAD',
  background: '#0A0A0A',
  surface: '#111111',
  cardBg: '#1A1A1A',
  cardBgHover: '#222222',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2A2A2A',
  borderLight: '#333333',
  success: '#4ADE80',
  error: '#F87171'
};

// ============================================
// PATHOLOGY TESTS
// ============================================
export const pathologyTests = {
  blood: [
    'CBC (Complete Blood Count)', 'Hemoglobin (Hb)', 'ESR (Erythrocyte Sedimentation Rate)',
    'Blood Group & Rh Factor', 'Platelet Count', 'PCV (Packed Cell Volume)',
    'RBC Count', 'WBC Count (Total & Differential)', 'Peripheral Blood Smear',
    'FBS (Fasting Blood Sugar)', 'PPBS (Post Prandial Blood Sugar)', 'Random Blood Sugar (RBS)',
    'HbA1c (Glycated Hemoglobin)', 'GTT (Glucose Tolerance Test)', 'OGTT - 3 Sample', 'Fructosamine',
    'Creatinine', 'Blood Urea', 'BUN (Blood Urea Nitrogen)', 'Uric Acid', 'eGFR (Estimated GFR)',
    'Electrolytes (Na, K, Cl)', 'Serum Electrolytes', 'RFT (Renal Function Test)', 'UPCR',
    'LFT (Liver Function Test)', 'SGPT (ALT)', 'SGOT (AST)', 'Alkaline Phosphatase (ALP)',
    'Bilirubin (Total, Direct, Indirect)', 'Total Protein', 'Albumin', 'Globulin',
    'A/G Ratio', 'GGT (Gamma GT)', 'Serum Amylase', 'Lipase', 'LDH',
    'Lipid Profile', 'Total Cholesterol', 'Triglycerides', 'HDL Cholesterol',
    'LDL Cholesterol', 'VLDL Cholesterol', 'Non-HDL Cholesterol', 'TC/HDL Ratio', 'LDL/HDL Ratio',
    'TSH', 'T3 (Total)', 'T4 (Total)', 'Free T3 (FT3)', 'Free T4 (FT4)',
    'Thyroid Profile - Free', 'Thyroid Profile - Total', 'Thyroid Antibodies (TPO, TG)',
    'Fasting Insulin', 'C-Peptide', 'HOMA-IR', 'Diabetes Basic', 'Diabetes Screening', 'Diabetes Advance',
    'Troponin I/T', 'CPK-MB', 'CRP (C-Reactive Protein)', 'hs-CRP', 'Homocysteine', 'BNP/NT-proBNP', 'D-Dimer',
    'Iron Studies (Serum Iron, TIBC, Ferritin)', 'Vitamin B12', 'Vitamin D', 'Folate (Folic Acid)',
    'Reticulocyte Count', 'G6PD', 'PT/INR', 'aPTT', 'Bleeding Time (BT)', 'Clotting Time (CT)', 'Fibrinogen',
    'LH (Luteinizing Hormone)', 'FSH (Follicle Stimulating Hormone)', 'Prolactin', 'Estradiol (E2)',
    'Progesterone', 'Testosterone (Total & Free)', 'Serum Testosterone', 'DHEA-S', 'Cortisol',
    'AMH (Anti-Mullerian Hormone)', 'Beta-hCG', 'Hormonal Basic', 'Hormonal Advance',
    'Dual / Double Marker', 'Quadruple Marker', 'ANC (Ante Natal Profile)',
    'PSA (Prostate Specific Antigen)', 'Serum PSA', 'CA-125', 'CA 19-9', 'CEA', 'AFP (Alpha-Fetoprotein)',
    'Vitamin D (25-OH)', 'Vitamin B1 (Thiamine)', 'Vitamin B6', 'Calcium (Total & Ionized)',
    'Phosphorus', 'Magnesium', 'Zinc', 'Arthritis Basic Panel', 'RA Factor', 'Anti-CCP', 'ANA (Antinuclear Antibody)',
    'HIV - Rapid', 'HIV 1 & 2', 'HBsAg (Hepatitis B)', 'HCV - Rapid', 'HCV (Hepatitis C)',
    'VDRL/RPR (Syphilis)', 'H3 Viral Marker', 'Dengue NS1/IgM/IgG', 'MP Antigen (Malaria)',
    'Malaria (Antigen & Smear)', 'Typhoid (Widal Test)', 'Blood Culture & Sensitivity', 'Amylase'
  ],
  urine: [
    'Urine Routine & Microscopy', 'Urine Culture & Sensitivity', 'Urine Albumin', 'Urine Creatinine',
    'Albumin/Creatinine Ratio (ACR)', 'Urine Sugar', 'Urine Ketones', 'Urine Protein',
    'Urine Bilirubin', 'Urine Urobilinogen', 'Urine pH', 'Urine Specific Gravity',
    'Urine Microalbumin', '24-Hour Urine Protein', '24-Hour Urine Creatinine',
    '24-Hour Urine Calcium', '24-Hour Urine Uric Acid', '24-Hour Urine Sodium',
    '24-Hour Urine Potassium', 'Urine Pregnancy Test', 'Urine Drug Screen', 'Urine Osmolality'
  ],
  sputum: [
    'Sputum AFB (Acid-Fast Bacilli)', 'Sputum Culture & Sensitivity', 'Sputum Gram Stain',
    'Sputum Cytology', 'Sputum for Malignant Cells', 'GeneXpert MTB/RIF', 'Sputum Fungal Culture'
  ],
  packages: [
    'Diabetes Screening Package', 'Diabetes Basic Package', 'Diabetes Advance Package',
    'Mango Basic Package', 'Mango Total Package', 'Mango Xclusive Package',
    'Cardiac Risk Profile', 'Anemia Profile', 'Arthritis Panel', 'Fever Panel',
    'Pre-Operative Profile', 'Master Health Checkup', 'Home Visit (0-5 km)',
    'Home Visit (5-10 km)', 'Home Visit (10-15 km)'
  ]
};

// Test preparation instructions
export const testPreparations = {
  'FBS (Fasting Blood Sugar)': { fasting: true, hours: 8, instruction: '8-12 hours fasting required. Only water allowed.' },
  'PPBS (Post Prandial Blood Sugar)': { fasting: false, instruction: 'Test 2 hours after a meal.' },
  'GTT (Glucose Tolerance Test)': { fasting: true, hours: 10, instruction: '10-12 hours fasting. Multiple samples over 2-3 hours.' },
  'OGTT - 3 Sample': { fasting: true, hours: 10, instruction: '10-12 hours fasting. Multiple samples over 2-3 hours.' },
  'Lipid Profile': { fasting: true, hours: 10, instruction: '10-12 hours fasting for accurate results.' },
  'Total Cholesterol': { fasting: true, hours: 10, instruction: '10-12 hours fasting recommended.' },
  'Triglycerides': { fasting: true, hours: 12, instruction: '12-14 hours fasting required.' },
  'LFT (Liver Function Test)': { fasting: true, hours: 8, instruction: '8-12 hours fasting recommended.' },
  'RFT (Renal Function Test)': { fasting: false, instruction: 'No fasting required. Stay hydrated.' },
  'TSH': { fasting: false, instruction: 'No fasting required. Best done in morning.' },
  'CBC (Complete Blood Count)': { fasting: false, instruction: 'No fasting required.' },
  'HbA1c (Glycated Hemoglobin)': { fasting: false, instruction: 'No fasting required.' },
};

// Test price lookup map
export const testPreparationInfo = {
  'Dual / Double Marker': { name: 'Dual / Double Marker', price: 2000 },
  'Quadruple Marker': { name: 'Quadruple Marker', price: 2600 },
  'ANC (Ante Natal Profile)': { name: 'ANC (Ante Natal Profile)', price: 1950 },
  'Beta HCG': { name: 'Beta HCG', price: 680 },
  'AMH (Anti-Mullerian Hormone)': { name: 'AMH (Anti-Mullerian Hormone)', price: 1550 },
  'Hormonal Basic': { name: 'Hormonal Basic', price: 800 },
  'Hormonal Advance': { name: 'Hormonal Advance', price: 1200 },
  'LH (Luteinizing Hormone)': { name: 'LH (Luteinizing Hormone)', price: 400 },
  'FSH (Follicle Stimulating Hormone)': { name: 'FSH (Follicle Stimulating Hormone)', price: 400 },
  'Prolactin': { name: 'Prolactin', price: 350 },
  'Estradiol (E2)': { name: 'Estradiol (E2)', price: 650 },
  'Progesterone': { name: 'Progesterone', price: 500 },
  'Serum Testosterone': { name: 'Serum Testosterone', price: 500 },
  'FBS (Fasting Blood Sugar)': { name: 'FBS (Fasting Blood Sugar)', price: 75 },
  'PPBS (Post Prandial Blood Sugar)': { name: 'PPBS (Post Prandial Blood Sugar)', price: 75 },
  'Random Blood Sugar (RBS)': { name: 'Random Blood Sugar (RBS)', price: 75 },
  'HbA1c (Glycated Hemoglobin)': { name: 'HbA1c (Glycated Hemoglobin)', price: 450 },
  'Diabetes Basic': { name: 'Diabetes Basic', price: 250 },
  'Diabetes Screening': { name: 'Diabetes Screening', price: 600 },
  'OGTT - 3 Sample': { name: 'OGTT - 3 Sample', price: 450 },
  'Insulin - Post Prandial': { name: 'Insulin - Post Prandial', price: 650 },
  'Insulin Random': { name: 'Insulin Random', price: 1100 },
  'C-Peptide': { name: 'C-Peptide', price: 1050 },
  'CBC (Complete Blood Count)': { name: 'CBC (Complete Blood Count)', price: 200 },
  'CBC ESR': { name: 'CBC ESR', price: 380 },
  'Blood Group': { name: 'Blood Group', price: 150 },
  'Hemoglobin (Hb)': { name: 'Hemoglobin (Hb)', price: 100 },
  'ESR': { name: 'ESR', price: 100 },
  'BT CT': { name: 'BT CT', price: 250 },
  'PT INR': { name: 'PT INR', price: 450 },
  'TSH': { name: 'TSH', price: 200 },
  'Thyroid Profile - Free': { name: 'Thyroid Profile - Free', price: 550 },
  'Thyroid Profile - Total': { name: 'Thyroid Profile - Total', price: 350 },
  'T3': { name: 'T3', price: 200 },
  'T4': { name: 'T4', price: 200 },
  'Free T3 T4 TSH': { name: 'Free T3 T4 TSH', price: 550 },
  'Vitamin D': { name: 'Vitamin D', price: 850 },
  'Vitamin B12': { name: 'Vitamin B12', price: 500 },
  'Iron Studies': { name: 'Iron Studies', price: 600 },
  'Calcium': { name: 'Calcium', price: 200 },
  'Serum Magnesium': { name: 'Serum Magnesium', price: 200 },
  'Serum Phosphorus': { name: 'Serum Phosphorus', price: 200 },
  'Sodium': { name: 'Sodium', price: 150 },
  'Potassium': { name: 'Potassium', price: 150 },
  'G6PD': { name: 'G6PD', price: 470 },
  'LFT (Liver Function Test)': { name: 'LFT (Liver Function Test)', price: 450 },
  'SGPT (ALT)': { name: 'SGPT (ALT)', price: 180 },
  'SGOT (AST)': { name: 'SGOT (AST)', price: 180 },
  'Total Bilirubin': { name: 'Total Bilirubin', price: 150 },
  'Direct Bilirubin': { name: 'Direct Bilirubin', price: 150 },
  'Serum Albumin': { name: 'Serum Albumin', price: 300 },
  'Bile Acid': { name: 'Bile Acid', price: 2000 },
  'Serum Amylase': { name: 'Serum Amylase', price: 500 },
  'Lipase': { name: 'Lipase', price: 600 },
  'LDH': { name: 'LDH', price: 550 },
  'RFT (Renal Function Test)': { name: 'RFT (Renal Function Test)', price: 600 },
  'Creatinine': { name: 'Creatinine', price: 180 },
  'BUN': { name: 'BUN', price: 240 },
  'Blood Urea': { name: 'Blood Urea', price: 240 },
  'Uric Acid': { name: 'Uric Acid', price: 200 },
  'Serum Electrolytes': { name: 'Serum Electrolytes', price: 400 },
  'UPCR': { name: 'UPCR', price: 660 },
  'Cystatin C': { name: 'Cystatin C', price: 1100 },
  'Lipid Profile': { name: 'Lipid Profile', price: 500 },
  'Serum Cholesterol': { name: 'Serum Cholesterol', price: 220 },
  'Triglycerides': { name: 'Triglycerides', price: 250 },
  'HDL': { name: 'HDL', price: 150 },
  'LDL': { name: 'LDL', price: 150 },
  'CPKMB': { name: 'CPKMB', price: 450 },
  'Troponin I': { name: 'Troponin I', price: 1050 },
  'ECG (Electrocardiogram)': { name: 'ECG (Electrocardiogram)', price: 300 },
  'HIV - Rapid': { name: 'HIV - Rapid', price: 550 },
  'HCV - Rapid': { name: 'HCV - Rapid', price: 600 },
  'HBsAg': { name: 'HBsAg', price: 400 },
  'VDRL / RPR': { name: 'VDRL / RPR', price: 200 },
  'Dengue NS1 Rapid': { name: 'Dengue NS1 Rapid', price: 800 },
  'Dengue Profile (IgM+IgG+NS1)': { name: 'Dengue Profile (IgM+IgG+NS1)', price: 1450 },
  'Widal Test': { name: 'Widal Test', price: 330 },
  'Filaria Antigen': { name: 'Filaria Antigen', price: 360 },
  'MP Antigen (Malaria)': { name: 'MP Antigen (Malaria)', price: 650 },
  'H3 Viral Marker': { name: 'H3 Viral Marker', price: 1200 },
  'Blood Culture & Sensitivity': { name: 'Blood Culture & Sensitivity', price: 1000 },
  'Urine Culture & Sensitivity': { name: 'Urine Culture & Sensitivity', price: 1000 },
  'Sputum Routine': { name: 'Sputum Routine', price: 150 },
  'Pus C/S': { name: 'Pus C/S', price: 1000 },
  'RA Factor': { name: 'RA Factor', price: 600 },
  'CRP (C-Reactive Protein)': { name: 'CRP (C-Reactive Protein)', price: 450 },
  'ASO Titre': { name: 'ASO Titre', price: 550 },
  'Anti CCP': { name: 'Anti CCP', price: 1250 },
  'ANA IFA': { name: 'ANA IFA', price: 1000 },
  'ANA Blot': { name: 'ANA Blot', price: 3300 },
  'C ANCA': { name: 'C ANCA', price: 1300 },
  'P ANCA': { name: 'P ANCA', price: 1300 },
  'Anti dsDNA': { name: 'Anti dsDNA', price: 1200 },
  'Arthritis Basic Panel': { name: 'Arthritis Basic Panel', price: 1650 },
  'CA 19.9': { name: 'CA 19.9', price: 1000 },
  'CA 125': { name: 'CA 125', price: 1100 },
  'CA 15.3': { name: 'CA 15.3', price: 1100 },
  'CEA': { name: 'CEA', price: 800 },
  'Alpha Fetoprotein': { name: 'Alpha Fetoprotein', price: 800 },
  'Serum PSA': { name: 'Serum PSA', price: 1050 },
  'Urine Routine & Microscopy': { name: 'Urine Routine & Microscopy', price: 150 },
  'Coombs Test, Indirect': { name: 'Coombs Test, Indirect', price: 500 },
  'Karyotyping': { name: 'Karyotyping', price: 5500 },
  'Histopathology': { name: 'Histopathology', price: 2500 },
  'Biopsy Growth': { name: 'Biopsy Growth', price: 2000 },
};

// Test categories for navigation
export const testCategories = [
  { id: 'pregnancy', title: 'Pregnancy & OBGYN', icon: Heart, color: '#EC4899', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', iconBg: 'bg-pink-100',
    tests: [
      { name: 'Dual / Double Marker', price: 2000 }, { name: 'Quadruple Marker', price: 2600 },
      { name: 'ANC (Ante Natal Profile)', price: 1950 }, { name: 'Beta HCG', price: 680 },
      { name: 'AMH (Anti-Mullerian Hormone)', price: 1550 }, { name: 'Hormonal Basic', price: 800 },
      { name: 'Hormonal Advance', price: 1200 }, { name: 'LH (Luteinizing Hormone)', price: 400 },
      { name: 'FSH (Follicle Stimulating Hormone)', price: 400 }, { name: 'Prolactin', price: 350 },
      { name: 'Estradiol (E2)', price: 650 }, { name: 'Progesterone', price: 500 },
      { name: 'Serum Testosterone', price: 500 }
    ]
  },
  { id: 'diabetes', title: 'Diabetes & Sugar', icon: Activity, color: '#3B82F6', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', iconBg: 'bg-blue-100',
    tests: [
      { name: 'FBS (Fasting Blood Sugar)', price: 75 }, { name: 'PPBS (Post Prandial Blood Sugar)', price: 75 },
      { name: 'Random Blood Sugar (RBS)', price: 75 }, { name: 'HbA1c (Glycated Hemoglobin)', price: 450 },
      { name: 'Diabetes Basic', price: 250 }, { name: 'Diabetes Screening', price: 600 },
      { name: 'OGTT - 3 Sample', price: 450 }, { name: 'Insulin - Post Prandial', price: 650 },
      { name: 'Insulin Random', price: 1100 }, { name: 'C-Peptide', price: 1050 }
    ]
  },
  { id: 'blood', title: 'Blood Tests', icon: Droplets, color: '#EF4444', bgColor: 'bg-red-50', borderColor: 'border-red-200', iconBg: 'bg-red-100',
    tests: [
      { name: 'CBC (Complete Blood Count)', price: 200 }, { name: 'CBC ESR', price: 380 },
      { name: 'Blood Group', price: 150 }, { name: 'Hemoglobin (Hb)', price: 100 },
      { name: 'ESR', price: 100 }, { name: 'BT CT', price: 250 }, { name: 'PT INR', price: 450 }
    ]
  },
  { id: 'thyroid', title: 'Thyroid Profile', icon: TestTube, color: '#8B5CF6', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', iconBg: 'bg-purple-100',
    tests: [
      { name: 'TSH', price: 200 }, { name: 'Thyroid Profile - Free', price: 550 },
      { name: 'Thyroid Profile - Total', price: 350 }, { name: 'T3', price: 200 },
      { name: 'T4', price: 200 }, { name: 'Free T3 T4 TSH', price: 550 }
    ]
  },
  { id: 'vitamins', title: 'Vitamins & Minerals', icon: Stethoscope, color: '#10B981', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', iconBg: 'bg-emerald-100',
    tests: [
      { name: 'Vitamin D', price: 850 }, { name: 'Vitamin B12', price: 500 },
      { name: 'Iron Studies', price: 600 }, { name: 'Calcium', price: 200 },
      { name: 'Serum Magnesium', price: 200 }, { name: 'Serum Phosphorus', price: 200 },
      { name: 'Sodium', price: 150 }, { name: 'Potassium', price: 150 }, { name: 'G6PD', price: 470 }
    ]
  },
  { id: 'liver', title: 'Liver Function', icon: FlaskConical, color: '#F59E0B', bgColor: 'bg-green-50', borderColor: 'border-green-200', iconBg: 'bg-green-100',
    tests: [
      { name: 'LFT (Liver Function Test)', price: 450 }, { name: 'SGPT (ALT)', price: 180 },
      { name: 'SGOT (AST)', price: 180 }, { name: 'Total Bilirubin', price: 150 },
      { name: 'Direct Bilirubin', price: 150 }, { name: 'Serum Albumin', price: 300 },
      { name: 'Bile Acid', price: 2000 }, { name: 'Serum Amylase', price: 500 },
      { name: 'Lipase', price: 600 }, { name: 'LDH', price: 550 }
    ]
  },
  { id: 'kidney', title: 'Kidney Function', icon: Droplet, color: '#06B6D4', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', iconBg: 'bg-cyan-100',
    tests: [
      { name: 'RFT (Renal Function Test)', price: 600 }, { name: 'Creatinine', price: 180 },
      { name: 'BUN', price: 240 }, { name: 'Blood Urea', price: 240 },
      { name: 'Uric Acid', price: 200 }, { name: 'Serum Electrolytes', price: 400 },
      { name: 'UPCR', price: 660 }, { name: 'Cystatin C', price: 1100 }
    ]
  },
  { id: 'lipid', title: 'Lipid Profile', icon: Heart, color: '#F97316', bgColor: 'bg-green-50', borderColor: 'border-green-200', iconBg: 'bg-green-100',
    tests: [
      { name: 'Lipid Profile', price: 500 }, { name: 'Serum Cholesterol', price: 220 },
      { name: 'Triglycerides', price: 250 }, { name: 'HDL', price: 150 }, { name: 'LDL', price: 150 }
    ]
  },
  { id: 'cardiac', title: 'Cardiac Markers', icon: Activity, color: '#DC2626', bgColor: 'bg-red-50', borderColor: 'border-red-200', iconBg: 'bg-red-100',
    tests: [
      { name: 'CPKMB', price: 450 }, { name: 'Troponin I', price: 1050 },
      { name: 'ECG (Electrocardiogram)', price: 300 }
    ]
  },
  { id: 'infection', title: 'Infection & Viral', icon: Shield, color: '#7C3AED', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', iconBg: 'bg-violet-100',
    tests: [
      { name: 'HIV - Rapid', price: 550 }, { name: 'HCV - Rapid', price: 600 },
      { name: 'HBsAg', price: 400 }, { name: 'VDRL / RPR', price: 200 },
      { name: 'Dengue NS1 Rapid', price: 800 }, { name: 'Dengue Profile (IgM+IgG+NS1)', price: 1450 },
      { name: 'Widal Test', price: 330 }, { name: 'Filaria Antigen', price: 360 },
      { name: 'MP Antigen (Malaria)', price: 650 }, { name: 'H3 Viral Marker', price: 1200 }
    ]
  },
  { id: 'culture', title: 'Culture Tests', icon: FlaskConical, color: '#0891B2', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', iconBg: 'bg-teal-100',
    tests: [
      { name: 'Blood Culture & Sensitivity', price: 1000 }, { name: 'Urine Culture & Sensitivity', price: 1000 },
      { name: 'Sputum Routine', price: 150 }, { name: 'Pus C/S', price: 1000 }
    ]
  },
  { id: 'arthritis', title: 'Arthritis & Autoimmune', icon: Activity, color: '#DB2777', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', iconBg: 'bg-pink-100',
    tests: [
      { name: 'RA Factor', price: 600 }, { name: 'CRP (C-Reactive Protein)', price: 450 },
      { name: 'ASO Titre', price: 550 }, { name: 'Anti CCP', price: 1250 },
      { name: 'ANA IFA', price: 1000 }, { name: 'ANA Blot', price: 3300 },
      { name: 'C ANCA', price: 1300 }, { name: 'P ANCA', price: 1300 },
      { name: 'Anti dsDNA', price: 1200 }, { name: 'Arthritis Basic Panel', price: 1650 }
    ]
  },
  { id: 'tumor', title: 'Tumor Markers', icon: Scan, color: '#9333EA', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', iconBg: 'bg-purple-100',
    tests: [
      { name: 'CA 19.9', price: 1000 }, { name: 'CA 125', price: 1100 },
      { name: 'CA 15.3', price: 1100 }, { name: 'CEA', price: 800 },
      { name: 'Alpha Fetoprotein', price: 800 }, { name: 'Serum PSA', price: 1050 }
    ]
  },
  { id: 'urine', title: 'Urine Tests', icon: Droplet, color: '#0EA5E9', bgColor: 'bg-sky-50', borderColor: 'border-sky-200', iconBg: 'bg-sky-100',
    tests: [
      { name: 'Urine Routine & Microscopy', price: 150 }, { name: 'Urine Culture & Sensitivity', price: 1000 },
      { name: 'UPCR', price: 660 }
    ]
  },
  { id: 'special', title: 'Special Tests', icon: Activity, color: '#059669', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', iconBg: 'bg-emerald-100',
    tests: [
      { name: 'Karyotyping', price: 5500 }, { name: 'Histopathology', price: 2500 },
      { name: 'Biopsy Growth', price: 2000 }, { name: 'Coombs Test, Indirect', price: 500 }
    ]
  }
];

// Popular packages
export const popularPackages = [
  { id: 'diabetes-screening', name: 'Diabetes Screening', tests: ['FBS', 'PPBS', 'HbA1c'], price: 600, parameters: 3, reportTime: '6 hours' },
  { id: 'thyroid-profile', name: 'Thyroid Profile (Free)', tests: ['TSH', 'T3', 'T4', 'Free T3', 'Free T4'], price: 550, parameters: 5, reportTime: '12 hours' },
  { id: 'lipid-profile', name: 'Lipid Profile', tests: ['Total Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'VLDL'], price: 500, parameters: 5, reportTime: '6 hours' },
  { id: 'liver-function', name: 'Liver Function Test', tests: ['SGPT', 'SGOT', 'Bilirubin', 'Albumin', 'ALP'], price: 450, parameters: 10, reportTime: '12 hours' },
  { id: 'kidney-function', name: 'Kidney Function Test', tests: ['Creatinine', 'Urea', 'Uric Acid', 'Electrolytes'], price: 600, parameters: 8, reportTime: '12 hours' }
];

// Popular tests
export const popularTests = [
  { id: 'cbc', name: 'CBC (Complete Blood Count)', price: 200, reportTime: '6 hours', testsIncluded: 24, description: 'A comprehensive blood test that evaluates your overall health by measuring red blood cells, white blood cells, hemoglobin, hematocrit, and platelets.' },
  { id: 'vitamin-d', name: 'Vitamin D (25-Hydroxy)', price: 850, reportTime: '24 hours', testsIncluded: 1, description: 'Measures the level of Vitamin D in your blood, essential for bone health, calcium absorption, and immune function.' },
  { id: 'vitamin-b12', name: 'Vitamin B12', price: 500, reportTime: '24 hours', testsIncluded: 1, description: 'Checks Vitamin B12 levels crucial for nerve function, red blood cell formation, and DNA synthesis.' },
  { id: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)', price: 450, reportTime: '12 hours', testsIncluded: 1, description: 'Measures your average blood sugar levels over the past 2-3 months.' },
  { id: 'tsh', name: 'TSH (Thyroid Stimulating Hormone)', price: 200, reportTime: '12 hours', testsIncluded: 1, description: 'Evaluates thyroid gland function by measuring TSH levels.' },
  { id: 'fbs', name: 'Fasting Blood Sugar (FBS)', price: 75, reportTime: '6 hours', testsIncluded: 1, description: 'Measures blood glucose levels after an overnight fast (8-12 hours).' },
  { id: 'ppbs', name: 'Post Prandial Blood Sugar (PPBS)', price: 75, reportTime: '6 hours', testsIncluded: 1, description: 'Measures blood sugar levels 2 hours after eating a meal.' },
  { id: 'lipid', name: 'Lipid Profile (Complete)', price: 500, reportTime: '12 hours', testsIncluded: 8, description: 'Comprehensive cholesterol test measuring Total Cholesterol, LDL, HDL, Triglycerides, and VLDL.' },
  { id: 'lft', name: 'Liver Function Test (LFT)', price: 450, reportTime: '12 hours', testsIncluded: 12, description: 'Evaluates liver health by measuring enzymes, proteins, and bilirubin levels.' },
  { id: 'rft', name: 'Kidney Function Test (RFT)', price: 600, reportTime: '12 hours', testsIncluded: 8, description: 'Assesses kidney health by measuring Creatinine, Blood Urea, Uric Acid, and electrolytes.' },
  { id: 'uric', name: 'Uric Acid', price: 200, reportTime: '6 hours', testsIncluded: 1, description: 'Measures uric acid levels in blood. High levels can indicate gout, kidney stones, or kidney disease.' },
  { id: 'creatinine', name: 'Creatinine', price: 180, reportTime: '6 hours', testsIncluded: 1, description: 'A key marker of kidney function.' },
  { id: 'urine', name: 'Urine Routine & Microscopy', price: 150, reportTime: '6 hours', testsIncluded: 15, description: 'Complete urine analysis examining color, clarity, pH, protein, glucose, blood, and microscopic elements.' },
  { id: 'thyroid-free', name: 'Thyroid Profile (Free T3, T4, TSH)', price: 550, reportTime: '12 hours', testsIncluded: 3, description: 'Complete thyroid panel measuring Free T3, Free T4, and TSH hormones.' },
  { id: 'iron', name: 'Iron Studies (Iron, TIBC, Ferritin)', price: 600, reportTime: '24 hours', testsIncluded: 4, description: 'Comprehensive iron panel measuring Serum Iron, TIBC, Transferrin Saturation, and Ferritin.' },
  { id: 'amh', name: 'AMH (Anti-Mullerian Hormone)', price: 1550, reportTime: '48 hours', testsIncluded: 1, description: 'Measures ovarian reserve and fertility potential in women.' },
  { id: 'sgpt', name: 'SGPT (ALT)', price: 180, reportTime: '6 hours', testsIncluded: 1, description: 'Liver enzyme test that detects liver cell damage.' },
  { id: 'sgot', name: 'SGOT (AST)', price: 180, reportTime: '6 hours', testsIncluded: 1, description: 'Enzyme found in liver, heart, and muscles. Elevated levels may indicate liver disease.' },
];

// Time slots
export const timeSlots = [
  { value: '08:00-10:00', label: '8:00 AM - 10:00 AM' },
  { value: '10:00-12:00', label: '10:00 AM - 12:00 PM' },
  { value: '12:00-14:00', label: '12:00 PM - 2:00 PM' },
  { value: '14:00-16:00', label: '2:00 PM - 4:00 PM' },
  { value: '16:00-19:00', label: '4:00 PM - 7:00 PM' }
];

// Health section data for Women Care, Preventive, and Senior
export const womenCareItems = [
  { id: 'pregnancy-tests', name: 'Pregnancy Tests', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop', tests: ['Beta HCG', 'Pregnancy Test', 'Dual Marker', 'Quadruple Marker'] },
  { id: 'fertility', name: 'Fertility Profile', image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=200&h=200&fit=crop', tests: ['AMH', 'FSH', 'LH', 'Prolactin', 'Estradiol', 'Progesterone'] },
  { id: 'pcos', name: 'PCOS Panel', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop', tests: ['Free Testosterone', 'DHEAS', 'LH/FSH Ratio', 'Fasting Insulin', 'HbA1c'] },
  { id: 'thyroid', name: 'Thyroid Profile', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop', tests: ['TSH', 'T3', 'T4', 'Free T3', 'Free T4', 'Anti-TPO'] },
  { id: 'anemia', name: 'Anemia Panel', image: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=200&h=200&fit=crop', tests: ['CBC', 'Iron Studies', 'Ferritin', 'Vitamin B12', 'Folate'] },
  { id: 'postpartum', name: 'Postpartum Care', image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=200&h=200&fit=crop', tests: ['CBC', 'Thyroid Panel', 'Vitamin D', 'Calcium', 'Iron Profile'] },
  { id: 'menopause', name: 'Menopause Panel', image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop', tests: ['FSH', 'LH', 'Estradiol', 'Bone Profile', 'Lipid Panel', 'Vitamin D'] },
  { id: 'boh', name: 'Bad Obstetric History', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop', tests: ['APLA Panel', 'Lupus Anticoagulant', 'Protein C', 'Protein S', 'Factor V Leiden'] },
  { id: 'prenatal', name: 'ANC Profile', image: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=200&h=200&fit=crop', tests: ['CBC', 'Blood Group', 'HIV', 'HBsAg', 'VDRL', 'Urine R/M'] },
  { id: 'breast', name: 'Breast Health', image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&h=200&fit=crop', tests: ['CA 15-3', 'CA 125', 'Mammogram', 'Breast Ultrasound'] }
];

export const preventiveHealthItems = [
  { id: 'full-body', name: 'Full Body Checkup', image: 'https://images.unsplash.com/photo-1631815587646-b85a1bb027e1?w=200&h=200&fit=crop', tests: ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid', 'Urine R/M', 'Blood Sugar'] },
  { id: 'cardiac', name: 'Cardiac Health', image: 'https://images.unsplash.com/photo-1628348070889-cb656235b4eb?w=200&h=200&fit=crop', tests: ['Lipid Profile', 'hs-CRP', 'Homocysteine', 'Lp(a)', 'ECG', 'Apolipoprotein B'] },
  { id: 'diabetes', name: 'Diabetes Screening', image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&h=200&fit=crop', tests: ['HbA1c', 'Fasting Glucose', 'PP Glucose', 'Fasting Insulin', 'C-Peptide'] },
  { id: 'liver', name: 'Liver Wellness', image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=200&h=200&fit=crop', tests: ['LFT', 'GGT', 'AFP', 'Fibroscan', 'Hepatitis Panel'] },
  { id: 'kidney', name: 'Kidney Health', image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=200&h=200&fit=crop', tests: ['KFT', 'Creatinine', 'eGFR', 'Urine Albumin', 'Microalbumin'] },
  { id: 'vitamin', name: 'Vitamin & Mineral', image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&h=200&fit=crop', tests: ['Vitamin D', 'Vitamin B12', 'Iron Studies', 'Calcium', 'Magnesium', 'Zinc'] },
  { id: 'immunity', name: 'Immunity Panel', image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=200&h=200&fit=crop', tests: ['CBC', 'Vitamin D', 'Vitamin C', 'Zinc', 'Iron', 'CRP'] },
  { id: 'allergy', name: 'Allergy Profile', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', tests: ['IgE Total', 'Food Allergy Panel', 'Inhalant Allergens', 'Eosinophil Count'] }
];

export const seniorHealthItems = [
  { id: 'senior-checkup', name: 'Senior Checkup', image: 'https://images.unsplash.com/photo-1577368287217-16ff9373a733?w=200&h=200&fit=crop', tests: ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid', 'Vitamin D', 'B12', 'HbA1c'] },
  { id: 'bone-health', name: 'Bone Health', image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=200&fit=crop', tests: ['Calcium', 'Vitamin D', 'PTH', 'DEXA Scan', 'Phosphorus', 'Alkaline Phosphatase'] },
  { id: 'joint-care', name: 'Joint & Arthritis', image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=200&h=200&fit=crop', tests: ['RA Factor', 'Anti-CCP', 'Uric Acid', 'CRP', 'ESR', 'ANA'] },
  { id: 'cardiac-senior', name: 'Heart Wellness', image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&h=200&fit=crop', tests: ['ECG', 'NT-proBNP', 'Lipid Profile', 'Troponin', 'hs-CRP', 'Homocysteine'] },
  { id: 'diabetes-senior', name: 'Diabetes Care', image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&h=200&fit=crop', tests: ['HbA1c', 'Fasting Glucose', 'PP Glucose', 'Fructosamine', 'Urine Microalbumin', 'KFT'] },
  { id: 'memory', name: 'Memory & Brain', image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=200&h=200&fit=crop', tests: ['Vitamin B12', 'Folate', 'Thyroid', 'Vitamin D', 'Homocysteine', 'CBC'] },
  { id: 'prostate', name: 'Prostate Health', image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=200&h=200&fit=crop', tests: ['PSA Total', 'PSA Free', 'Ultrasound Prostate', 'Uroflowmetry'] },
  { id: 'eye-vision', name: 'Eye & Vision', image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=200&h=200&fit=crop', tests: ['Blood Sugar', 'HbA1c', 'Vitamin A', 'Fundus Exam', 'IOL Check'] }
];
