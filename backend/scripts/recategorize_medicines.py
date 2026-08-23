"""
Re-categorize 'General' and 'Health & Wellness' medicines using
aggressive name/composition matching rules. Reduces AI workload.
"""
import os, re
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "nevikacura")]
col = db.medicines

# Extended keyword-to-category mapping (OTC + prescription)
NAME_RULES = [
    # Skin & Beauty
    (r'sunscreen|spf|moistur|lotion|cream|serum|face wash|cleanser|toner|lip balm|body wash|shower gel|body lotion|face mask|peel|scrub|foundation|concealer|compact|primer|kajal|mascara|eyeliner|lipstick|lip gloss|nail polish|bb cream|cc cream|blush|bronzer|highlighter|makeup|fairness|whitening|glow|anti.?aging|wrinkle|acne|pimple|dark spot|pigment|blemish|derma|derm', "Skin Care"),
    # Hair
    (r'shampoo|conditioner|hair oil|hair mask|hair serum|hair gel|hair spray|hair color|hair dye|anti.?dandruff|scalp|biotin|minoxidil|hair fall|hair growth|hair loss|keratin', "Hair Care"),
    # Oral
    (r'toothpaste|toothbrush|mouthwash|dental|floss|teeth|gum care|tongue cleaner|oral rinse|denture', "Oral Care"),
    # Baby
    (r'diaper|baby|infant|newborn|nappy|baby food|baby oil|baby lotion|baby soap|baby wipe|teether|pacifier|bottle.*nipple|lactogen|cerelac|pediasure|formula.*milk', "Baby Care"),
    # Protein & Nutrition
    (r'protein.*powder|whey|mass gainer|bcaa|creatine|pre.?workout|post.?workout|amino acid|protein bar|energy bar|meal replace|weight gain|muscle|gym|fitness|electrolyte|ors |oral rehydration|glucose|energy drink|health drink|horlicks|bournvita|complan|ensure|protinex|boost', "Nutrition & Protein"),
    # Vitamins
    (r'multivitamin|vitamin\s?[a-eAbBcCdDeE]|omega.?3|fish oil|calcium.*tablet|iron.*tablet|zinc.*tablet|folic acid|biotin|vitamin.*supplement|mineral|cod liver|flaxseed|antioxidant|coenzyme|ubiquinol', "Vitamins & Supplements"),
    # Sexual Wellness
    (r'condom|lubricant|intimate.*wash|intimate.*hygiene|pregnancy.*test|fertility|ovulation|sanitary|tampon|menstrual.*cup|period.*pain|vaginal', "Sexual Wellness"),
    # Diabetes
    (r'glucometer|test.*strip.*diabetes|lancet|insulin.*syringe|sugar.*free|diabetic.*food|metformin|glimepiride|glipizide|insulin|gliclazide|voglibose|teneligliptin|dapagliflozin|empagliflozin|sitagliptin', "Diabetes Care"),
    # Heart & BP
    (r'bp.*monitor|blood.*pressure|amlodipine|telmisartan|losartan|atenolol|metoprolol|ramipril|enalapril|olmesartan|valsartan|nebivolol|aspirin|clopidogrel|atorvastatin|rosuvastatin|cholesterol|statin', "Heart & BP"),
    # Pain
    (r'paracetamol|ibuprofen|diclofenac|aceclofenac|nimesulide|pain.*relief|pain.*killer|pain.*balm|pain.*spray|pain.*patch|pain.*gel|muscle.*pain|joint.*pain|headache|body.*pain|fever|analgesic|dolo|crocin|saridon|combiflam|flexon|brufen', "Pain Relief"),
    # Digestive
    (r'antacid|digestion|bloating|acidity|gas.*relief|constipation|laxative|probiotic|prebiotic|digestive.*enzyme|liver.*tonic|liver.*care|appetite|isabgol|eno|gelusil|digene|pan.?d|pantoprazole|omeprazole|ranitidine|domperidone|ondansetron', "Digestive Health"),
    # Respiratory
    (r'cough.*syrup|cold.*tablet|nasal.*drop|nasal.*spray|inhaler|nebulizer|vaporizer|steam|decongestant|expectorant|anti.*tussive|sinusit|asthma|bronchit|salbutamol|montelukast|levosalbutamol|budesonide|formoterol|fluticasone', "Respiratory"),
    # Allergy
    (r'cetirizine|levocetirizine|fexofenadine|loratadine|chlorpheniramine|anti.*histamine|allergy|allergic|hives|urticaria|hay fever', "Allergy"),
    # Eye
    (r'eye.*drop|contact.*lens|lens.*solution|eye.*wash|lubricant.*eye|dry.*eye|eye.*ointment|eye.*care|spectacle|reading.*glass|timolol|brimonidine|latanoprost|dorzolamide', "Eye Care"),
    # Ayurvedic
    (r'ayurved|churna|kwath|ras|bhasma|ashwagandha|tulsi|triphala|giloy|amla|neem|turmeric|curcumin|moringa|chyawanprash|mulethi|brahmi|shankhapushpi|shilajit|guggul|aloe.*vera|patanjali|himalaya|dabur|baidyanath|zandu|hamdard|divya', "Ayurvedic & Herbal"),
    # Antibiotics
    (r'amoxycillin|amoxicillin|azithromycin|cefixime|ciprofloxacin|ofloxacin|levofloxacin|moxifloxacin|doxycycline|metronidazole|clindamycin|fluconazole|cephalexin|cefpodoxime|ceftriaxone|norfloxacin|nitrofurantoin|linezolid', "Antibiotics & Anti-Infectives"),
    # Mental Health
    (r'anti.*depressant|escitalopram|sertraline|fluoxetine|paroxetine|venlafaxine|duloxetine|clonazepam|alprazolam|lorazepam|diazepam|anxiety|depression|sleep.*aid|melatonin|sleeping|insomnia', "Mental Health"),
    # Women's Health
    (r'prenatal|postnatal|folic.*acid.*tablet|iron.*folic|progesterone|estrogen|contraceptive|oral.*pill|period.*delay|pcod|pcos|menopause|breast.*pump|nipple.*cream|maternity|pregnancy|ante.?natal', "Women's Health"),
    # Devices
    (r'thermometer|stethoscope|blood.*pressure.*monitor|oximeter|pulse.*oximeter|nebulizer.*machine|weighing.*scale|vaporizer.*machine|wheelchair|walker|crutch|bandage|gauze|cotton|syringe|surgical.*tape|crepe|orthopedic.*belt|knee.*cap|wrist.*support|ankle.*support|cervical.*pillow|hot.*water.*bag|ice.*pack|first.*aid', "Health Devices"),
    # Hygiene
    (r'hand.*wash|hand.*sanitiz|disinfect|surface.*clean|floor.*clean|mask|n95|surgical.*mask|face.*shield|glove|ppe|mosquito|insect.*repell|room.*spray|air.*purif', "Hygiene & Safety"),
    # ENT
    (r'ear.*drop|throat.*lozenge|throat.*spray|strepsils|vicks|cough.*drop|nasal.*strip|sinus|tinnitus', "ENT"),
    # Bone & Joint
    (r'calcium|vitamin.*d3|bone.*health|joint.*pain|joint.*care|glucosamine|chondroitin|collagen|arthritis|osteo', "Bone & Joint"),
]

print("Re-categorizing General & Health & Wellness medicines...")
meds = list(col.find(
    {"category": {"$in": ["General", "Health & Wellness"]}},
    {"_id": 0, "id": 1, "name": 1, "composition": 1, "uses": 1}
))
print(f"Found {len(meds):,} to process")

ops = []
recategorized = 0

for med in meds:
    name = (med.get("name", "") or "").lower()
    comp = (med.get("composition", "") or "").lower()
    uses = (med.get("uses", "") or "").lower()
    combined = f"{name} {comp} {uses}"
    
    new_cat = None
    for pattern, category in NAME_RULES:
        if re.search(pattern, combined):
            new_cat = category
            break
    
    if new_cat:
        ops.append(UpdateOne({"id": med["id"]}, {"$set": {"category": new_cat}}))
        recategorized += 1
    
    if len(ops) >= 5000:
        col.bulk_write(ops, ordered=False)
        ops = []

if ops:
    col.bulk_write(ops, ordered=False)

remaining = col.count_documents({"category": {"$in": ["General", "Health & Wellness"]}})
print(f"\nRule-based re-categorized: {recategorized:,}")
print(f"Remaining General/Health & Wellness: {remaining:,}")
