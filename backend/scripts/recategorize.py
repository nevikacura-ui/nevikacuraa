"""
Comprehensive recategorization of 255K medicines + star marking for best-selling brands
"""
from pymongo import MongoClient, UpdateMany, UpdateOne
import re

client = MongoClient('mongodb://localhost:27017')
db = client['test_database']
coll = db['medicines']

print(f"Total medicines: {coll.count_documents({}):,}")

# ==========================================
# PHASE 1: Star-mark best-selling brands
# ==========================================
STAR_MANUFACTURERS = [
    "Keep Mankind", "Mankind Pharma Ltd",
    "Torrent Pharmaceuticals Ltd",
    "Glenmark Pharmaceuticals Ltd",
    "Cipla Ltd",
    "Sun Pharmaceutical Industries Ltd",
    "Abbott",
]

print("\n=== PHASE 1: Star-marking best sellers ===")
total_starred = 0
for mfg in STAR_MANUFACTURERS:
    result = coll.update_many(
        {"manufacturer": mfg},
        {"$set": {"is_starred": True, "badge": "Best Seller"}}
    )
    total_starred += result.modified_count
    print(f"  {mfg}: {result.modified_count:,} starred")

# Un-star others
coll.update_many(
    {"manufacturer": {"$nin": STAR_MANUFACTURERS}},
    {"$set": {"is_starred": False}, "$unset": {"badge": ""}}
)
print(f"Total starred: {total_starred:,}")

# ==========================================
# PHASE 2: Comprehensive recategorization
# ==========================================
print("\n=== PHASE 2: Recategorizing medicines ===")

# Category rules: (category_name, name_keywords, composition_keywords)
# More specific categories first, then broader ones
CATEGORY_RULES = [
    # --- Specific organ/system categories ---
    ("Eye Care", 
     ['eye drop', 'ophthalmic', 'eye ointment', 'eye gel', 'eye solution', 'optic'],
     ['timolol', 'brimonidine', 'latanoprost', 'dorzolamide', 'tobramycin', 'moxifloxacin eye',
      'ciprofloxacin eye', 'ofloxacin eye', 'nepafenac', 'ketorolac eye', 'carboxymethylcellulose',
      'hydroxypropyl', 'tropicamide', 'cyclopentolate', 'pilocarpine']),
    
    ("ENT Care",
     ['ear drop', 'nasal drop', 'nasal spray', 'throat', 'gargle', 'lozenge', 'ear ointment'],
     ['oxymetazoline', 'xylometazoline', 'fluticasone nasal', 'mometasone nasal', 'budesonide nasal',
      'clotrimazole ear', 'neomycin ear']),
    
    ("Dental Care",
     ['toothpaste', 'mouthwash', 'dental', 'gum paint', 'tooth'],
     ['chlorhexidine mouth', 'benzocaine dental', 'clove oil']),
    
    ("Baby Care",
     ['baby', 'paediatric', 'pediatric', 'infant', 'gripe water', 'teething'],
     []),
    
    ("Women Health",
     ['pregna', 'prenatal', 'vaginal', 'menstrual', 'contraceptive', 'ovulation',
      'breast', 'uterine', 'gynaec', 'gynec', 'maternity', 'menopausal', 'fertility'],
     ['norethisterone', 'levonorgestrel', 'ethinylestradiol', 'progesterone', 'estradiol',
      'clomifene', 'letrozole fertility', 'dienogest', 'drospirenone', 'medroxyprogesterone',
      'mifepristone', 'misoprostol', 'dinoprostone', 'conjugated estrogen']),
    
    ("Sexual Health",
     ['condom', 'erectile', 'sexual', 'lubricant'],
     ['sildenafil', 'tadalafil', 'dapoxetine', 'avanafil', 'vardenafil']),
    
    ("Mental Health",
     ['antidepressant', 'anti-anxiety', 'psychiatric'],
     ['escitalopram', 'sertraline', 'fluoxetine', 'paroxetine', 'venlafaxine', 'duloxetine',
      'amitriptyline', 'clomipramine', 'mirtazapine', 'bupropion', 'olanzapine', 'quetiapine',
      'risperidone', 'aripiprazole', 'clozapine', 'haloperidol', 'lithium',
      'alprazolam', 'clonazepam', 'lorazepam', 'diazepam', 'zolpidem', 'zopiclone',
      'phenytoin', 'carbamazepine', 'valproic', 'valproate', 'lamotrigine', 'levetiracetam',
      'gabapentin', 'pregabalin', 'topiramate', 'oxcarbazepine']),
    
    ("Respiratory Care",
     ['inhaler', 'nebuliser', 'nebulizer', 'rotacap', 'respicap', 'respirator'],
     ['salbutamol', 'levosalbutamol', 'ipratropium', 'budesonide inhal', 'fluticasone inhal',
      'formoterol', 'salmeterol', 'tiotropium', 'montelukast', 'theophylline',
      'aminophylline', 'bambuterol', 'terbutaline']),
    
    ("Bone & Joint Care",
     ['ortho', 'joint', 'bone', 'arthritis', 'calcium tab', 'calcium cap'],
     ['alendronate', 'risedronate', 'calcitriol', 'alfacalcidol', 'calcium citrate',
      'calcium carbonate', 'glucosamine', 'chondroitin', 'diacerein', 'colchicine',
      'allopurinol', 'febuxostat', 'etoricoxib', 'methylprednisolone']),
    
    ("Liver Care",
     ['liver', 'hepato', 'hepatic', 'liv-52', 'livogrit'],
     ['ursodeoxycholic', 'silymarin', 'lactulose', 'rifaximin liver', 'l-ornithine']),
    
    ("Kidney & Urinary",
     ['kidney', 'renal', 'urinary', 'prostate', 'bladder', 'urocare'],
     ['tamsulosin', 'alfuzosin', 'dutasteride', 'finasteride', 'solifenacin',
      'tolterodine', 'mirabegron', 'potassium citrate', 'flavoxate']),
    
    ("Thyroid Care",
     ['thyroid', 'thyronorm', 'eltroxin', 'thyro'],
     ['levothyroxine', 'thyroxine', 'carbimazole', 'methimazole', 'propylthiouracil']),
    
    ("Cancer Care",
     ['chemo', 'oncology', 'cancer'],
     ['methotrexate', 'cyclophosphamide', 'cisplatin', 'carboplatin', 'docetaxel',
      'paclitaxel', 'imatinib', 'erlotinib', 'gefitinib', 'tamoxifen', 'letrozole cancer',
      'anastrozole', 'capecitabine', 'fluorouracil', 'rituximab', 'trastuzumab']),
    
    ("Allergy Care",
     ['allergy', 'anti-allergy', 'antiallergy', 'allergic'],
     ['cetirizine', 'levocetirizine', 'fexofenadine', 'desloratadine', 'loratadine',
      'bilastine', 'ebastine', 'hydroxyzine', 'chlorpheniramine', 'promethazine']),
    
    # --- Broad categories ---
    ("Cough, Cold & Fever",
     ['cough', 'cold', 'flu ', 'influenza', 'decongest', 'expectorant', 'mucolytic',
      'antipyretic', 'fever'],
     ['dextromethorphan', 'guaifenesin', 'bromhexine', 'ambroxol', 'acetylcysteine',
      'phenylephrine', 'pseudoephedrine', 'triprolidine', 'diphenhydramine',
      'levodropropizine']),
    
    ("Pain Relief",
     ['pain', 'analgesic', 'painkiller', 'muscle relax', 'sprain', 'balm', 'spray pain'],
     ['paracetamol', 'acetaminophen', 'ibuprofen', 'diclofenac', 'aceclofenac', 'nimesulide',
      'naproxen', 'piroxicam', 'mefenamic', 'ketorolac', 'tramadol', 'tapentadol',
      'thiocolchicoside', 'chlorzoxazone', 'tizanidine', 'methocarbamol', 'orphenadrine',
      'aceclofenac', 'lornoxicam', 'etodolac', 'flurbiprofen']),
    
    ("Antibiotics",
     ['antibiotic'],
     ['amoxycillin', 'amoxicillin', 'azithromycin', 'cefixime', 'cefpodoxime', 'ceftriaxone',
      'cefuroxime', 'ciprofloxacin', 'ofloxacin', 'levofloxacin', 'norfloxacin',
      'moxifloxacin', 'doxycycline', 'minocycline', 'metronidazole', 'tinidazole',
      'ornidazole', 'secnidazole', 'nitrofurantoin', 'linezolid', 'vancomycin',
      'clarithromycin', 'roxithromycin', 'erythromycin', 'clindamycin', 'gentamicin',
      'amikacin', 'meropenem', 'piperacillin', 'cephalexin', 'cefadroxil',
      'faropenem', 'ertapenem', 'colistin', 'rifampicin', 'isoniazid', 'pyrazinamide',
      'ethambutol', 'co-trimoxazole', 'sulfamethoxazole']),
    
    ("Antifungal",
     ['antifungal', 'fungal'],
     ['fluconazole', 'itraconazole', 'voriconazole', 'terbinafine', 'griseofulvin',
      'clotrimazole', 'miconazole', 'ketoconazole', 'luliconazole', 'sertaconazole',
      'amorolfine', 'nystatin', 'amphotericin', 'caspofungin']),
    
    ("Antiviral",
     ['antiviral', 'hiv', 'hepatitis'],
     ['acyclovir', 'valacyclovir', 'oseltamivir', 'remdesivir', 'favipiravir',
      'tenofovir', 'lamivudine', 'efavirenz', 'lopinavir', 'ritonavir',
      'sofosbuvir', 'daclatasvir', 'ledipasvir', 'entecavir', 'ribavirin']),
    
    ("Stomach Care",
     ['antacid', 'gastric', 'gastro', 'acidity', 'digestion', 'digestive', 'stomach',
      'constipation', 'laxative', 'diarr', 'nausea', 'vomit', 'anti-emetic', 'bloating'],
     ['pantoprazole', 'omeprazole', 'rabeprazole', 'esomeprazole', 'lansoprazole',
      'domperidone', 'ondansetron', 'ranitidine', 'famotidine', 'sucralfate',
      'itopride', 'mosapride', 'prucalopride', 'trimebutine', 'pinaverium',
      'drotaverine', 'dicyclomine', 'mebeverine', 'hyoscine', 'bismuth',
      'loperamide', 'racecadotril', 'saccharomyces', 'pancreatin', 'digestive enzyme']),
    
    ("Heart Care",
     ['cardiac', 'heart', 'cardio', 'blood pressure', 'cholesterol', 'bp '],
     ['amlodipine', 'atenolol', 'metoprolol', 'propranolol', 'bisoprolol', 'nebivolol',
      'carvedilol', 'telmisartan', 'losartan', 'valsartan', 'olmesartan', 'irbesartan',
      'ramipril', 'enalapril', 'lisinopril', 'perindopril', 'atorvastatin', 'rosuvastatin',
      'simvastatin', 'fenofibrate', 'clopidogrel', 'aspirin', 'ticagrelor', 'prasugrel',
      'warfarin', 'rivaroxaban', 'apixaban', 'dabigatran', 'enoxaparin', 'heparin',
      'nitroglycerin', 'isosorbide', 'ivabradine', 'ranolazine', 'digoxin',
      'amiodarone', 'diltiazem', 'nifedipine', 'hydralazine', 'prazosin', 'doxazosin',
      'furosemide', 'hydrochlorothiazide', 'spironolactone', 'torsemide', 'indapamide',
      'sacubitril', 'trimetazidine']),
    
    ("Diabetes Care",
     ['diabetes', 'diabetic', 'sugar control', 'glucometer', 'insulin'],
     ['metformin', 'glimepiride', 'gliclazide', 'glipizide', 'glibenclamide',
      'voglibose', 'acarbose', 'sitagliptin', 'vildagliptin', 'linagliptin',
      'saxagliptin', 'teneligliptin', 'empagliflozin', 'dapagliflozin', 'canagliflozin',
      'pioglitazone', 'repaglinide', 'insulin']),
    
    ("Derma Care",
     ['skin', 'derma', 'acne', 'eczema', 'psoriasis', 'sunscreen', 'moisturiz',
      'fairness', 'face wash', 'scalp', 'dandruff', 'hair loss', 'hair growth'],
     ['clobetasol', 'betamethasone', 'mometasone skin', 'fluocinolone', 'halobetasol',
      'tacrolimus skin', 'pimecrolimus', 'adapalene', 'tretinoin', 'benzoyl peroxide',
      'isotretinoin', 'mupirocin', 'fusidic acid', 'silver sulfadiazine', 'povidone iodine',
      'minoxidil', 'finasteride hair', 'permethrin', 'ivermectin skin', 'calamine']),
    
    ("Vitamins & Supplements",
     ['vitamin', 'multivitamin', 'supplement', 'nutraceutical', 'health drink',
      'protein powder', 'omega', 'probiotic', 'prebiotic', 'mineral', 'amino acid',
      'antioxidant', 'immunity', 'energy drink'],
     ['folic acid', 'iron supplement', 'ferrous', 'calcium supplement', 'zinc supplement',
      'biotin', 'cobalamin', 'b12', 'methylcobalamin', 'pyridoxine', 'thiamine',
      'riboflavin', 'niacinamide', 'ascorbic acid', 'cholecalciferol', 'alpha tocopherol',
      'l-carnitine', 'coenzyme q10', 'lycopene', 'mecobalamin']),
    
    ("Surgical & Antiseptic",
     ['surgical', 'bandage', 'dressing', 'suture', 'antiseptic', 'disinfectant',
      'gauze', 'cotton', 'syringe', 'catheter', 'glove', 'mask'],
     ['povidone-iodine', 'chlorhexidine', 'hydrogen peroxide']),
    
    ("Ayurveda & Herbal",
     ['ayurved', 'herbal', 'churna', 'vati', 'kwath', 'ras ', 'bhasma', 'guggul',
      'ashwagandha', 'shatavari', 'triphala', 'tulsi', 'neem', 'giloy', 'amla',
      'himalaya', 'baidyanath', 'dabur', 'patanjali', 'hamdard', 'chyawanprash'],
     []),
    
    ("Homeopathy",
     ['homeopath', 'dilution', 'mother tincture', 'biochemic', 'sbl ', 'dr reckeweg',
      'schwabe', 'bakson', 'allen', 'boiron'],
     []),
    
    ("Medical Devices",
     ['glucometer', 'bp monitor', 'thermometer', 'oximeter', 'nebulizer machine',
      'wheelchair', 'walking stick', 'crutch', 'hearing aid', 'lancet', 'test strip'],
     []),
]

# Process in batches
batch_size = 10000
total_docs = coll.count_documents({})
processed = 0
categorized = {cat: 0 for cat, _, _ in CATEGORY_RULES}
categorized['General'] = 0

for skip in range(0, total_docs, batch_size):
    docs = list(coll.find({}, {"_id": 1, "name": 1, "generic_name": 1, "composition1": 1, "category": 1}).skip(skip).limit(batch_size))
    ops = []
    
    for doc in docs:
        name = (doc.get('name') or '').lower()
        comp = ((doc.get('generic_name') or '') + ' ' + (doc.get('composition1') or '')).lower()
        
        new_cat = None
        for cat_name, name_kws, comp_kws in CATEGORY_RULES:
            # Check name keywords
            if any(kw in name for kw in name_kws):
                new_cat = cat_name
                break
            # Check composition keywords
            if any(kw in comp for kw in comp_kws):
                new_cat = cat_name
                break
        
        if not new_cat:
            new_cat = 'General'
        
        categorized[new_cat] = categorized.get(new_cat, 0) + 1
        
        if doc.get('category') != new_cat:
            ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": {"category": new_cat}}))
    
    if ops:
        coll.bulk_write(ops, ordered=False)
    
    processed += len(docs)
    if (skip // batch_size) % 5 == 0:
        print(f"  Processed {processed:,} / {total_docs:,}")

print(f"\nDone! Processed {processed:,} medicines")
print("\n=== FINAL CATEGORIES ===")
for cat, count in sorted(categorized.items(), key=lambda x: -x[1]):
    if count > 0:
        print(f"  {cat}: {count:,}")

# Verify with DB
print("\n=== DB VERIFICATION ===")
pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
for cat in coll.aggregate(pipeline):
    print(f"  {cat['_id']}: {cat['count']:,}")

# Star count
starred = coll.count_documents({"is_starred": True})
print(f"\nStarred (Best Seller): {starred:,}")
