"""
Health Tips & Articles Module
- Daily personalized health tips
- Educational articles from doctors
- Push notifications for daily tips
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import random

router = APIRouter(prefix="/health-tips", tags=["Health Tips"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Health Tips Database
HEALTH_TIPS = {
    "general": [
        {"title": "Stay Hydrated", "content": "Drink at least 8 glasses of water daily. Proper hydration improves energy, skin health, and digestion.", "icon": "droplet"},
        {"title": "Take Breaks", "content": "Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds to reduce eye strain.", "icon": "eye"},
        {"title": "Walk Daily", "content": "A 30-minute daily walk can reduce heart disease risk by 35% and improve mental health.", "icon": "footprints"},
        {"title": "Sleep Well", "content": "Adults need 7-9 hours of quality sleep. Maintain a consistent sleep schedule for better health.", "icon": "moon"},
        {"title": "Eat Mindfully", "content": "Chew food slowly and avoid screens while eating. It helps digestion and prevents overeating.", "icon": "utensils"},
        {"title": "Stretch Regularly", "content": "Simple stretches every hour can prevent muscle stiffness and improve posture.", "icon": "activity"},
        {"title": "Limit Screen Time", "content": "Reduce screen time 1 hour before bed for better sleep quality.", "icon": "smartphone"},
        {"title": "Practice Gratitude", "content": "Write 3 things you're grateful for daily. It improves mental health and reduces stress.", "icon": "heart"}
    ],
    "diabetes": [
        {"title": "Monitor Regularly", "content": "Check your blood sugar at consistent times daily. Track patterns to better manage your diabetes.", "icon": "activity"},
        {"title": "Choose Low GI Foods", "content": "Low glycemic index foods like oats, legumes, and most vegetables help maintain stable blood sugar.", "icon": "leaf"},
        {"title": "Don't Skip Meals", "content": "Regular, balanced meals prevent blood sugar spikes and crashes. Aim for 3 meals + 2 small snacks.", "icon": "utensils"},
        {"title": "Stay Active", "content": "Exercise helps insulin work better. Aim for 150 minutes of moderate activity per week.", "icon": "footprints"},
        {"title": "Check Your Feet", "content": "Inspect your feet daily for cuts, blisters, or sores. Diabetic foot care prevents serious complications.", "icon": "foot"},
        {"title": "Manage Stress", "content": "Stress hormones can raise blood sugar. Practice deep breathing or meditation daily.", "icon": "brain"},
        {"title": "Stay Hydrated", "content": "Dehydration can concentrate blood sugar. Drink water regularly throughout the day.", "icon": "droplet"},
        {"title": "Know Your Numbers", "content": "Target: FBS < 100, PPBS < 140, HbA1c < 7%. Regular monitoring is key to control.", "icon": "target"}
    ],
    "women": [
        {"title": "Track Your Cycle", "content": "Understanding your menstrual cycle helps identify irregularities early and plan accordingly.", "icon": "calendar"},
        {"title": "Iron-Rich Foods", "content": "Women need more iron due to menstruation. Include leafy greens, legumes, and lean meat in your diet.", "icon": "leaf"},
        {"title": "Calcium Matters", "content": "Women are at higher risk for osteoporosis. Ensure 1000-1200mg calcium daily through diet or supplements.", "icon": "bone"},
        {"title": "Breast Self-Exam", "content": "Perform monthly breast self-exams. Early detection of changes can be lifesaving.", "icon": "heart"},
        {"title": "Pelvic Floor Exercises", "content": "Kegel exercises strengthen pelvic muscles, preventing incontinence and improving core strength.", "icon": "activity"},
        {"title": "Mental Health Matters", "content": "Women are twice as likely to experience depression. Don't hesitate to seek help when needed.", "icon": "brain"},
        {"title": "HPV Screening", "content": "Regular Pap smears and HPV tests as recommended by your doctor can prevent cervical cancer.", "icon": "shield"},
        {"title": "Folic Acid", "content": "All women of childbearing age should take 400mcg folic acid daily, even if not planning pregnancy.", "icon": "pill"}
    ],
    "pregnancy": [
        {"title": "Prenatal Vitamins", "content": "Take prenatal vitamins with folic acid daily. They're crucial for baby's brain and spine development.", "icon": "pill"},
        {"title": "Stay Active", "content": "Light exercise like walking and prenatal yoga is safe and beneficial. Aim for 30 minutes most days.", "icon": "activity"},
        {"title": "Eat for Two (Wisely)", "content": "You need only 300 extra calories in 2nd-3rd trimester. Focus on quality, not quantity.", "icon": "utensils"},
        {"title": "Rest When Needed", "content": "Fatigue is normal, especially in first and third trimesters. Listen to your body and rest.", "icon": "moon"},
        {"title": "Avoid Certain Foods", "content": "Skip raw fish, unpasteurized dairy, deli meats, and limit caffeine to 200mg/day.", "icon": "alert"},
        {"title": "Count Kicks", "content": "From 28 weeks, count baby's movements daily. Report any significant decrease to your doctor.", "icon": "baby"},
        {"title": "Stay Hydrated", "content": "Drink 10+ glasses of water daily. Dehydration can cause contractions and complications.", "icon": "droplet"},
        {"title": "Prenatal Checkups", "content": "Never skip prenatal appointments. They're crucial for monitoring you and baby's health.", "icon": "calendar"}
    ],
    "senior": [
        {"title": "Stay Social", "content": "Social connections reduce dementia risk and improve mental health. Call a friend or join a group.", "icon": "users"},
        {"title": "Fall Prevention", "content": "Remove tripping hazards, use night lights, and do balance exercises to prevent falls.", "icon": "shield"},
        {"title": "Brain Exercise", "content": "Puzzles, reading, and learning new skills keep your brain active and reduce cognitive decline.", "icon": "brain"},
        {"title": "Regular Checkups", "content": "Annual health screenings become more important with age. Don't skip your appointments.", "icon": "calendar"},
        {"title": "Medication Management", "content": "Use pill organizers and set reminders. Never stop medications without consulting your doctor.", "icon": "pill"},
        {"title": "Protein Intake", "content": "Seniors need more protein to maintain muscle mass. Include protein in every meal.", "icon": "utensils"},
        {"title": "Vitamin D", "content": "Many seniors are deficient in Vitamin D. Get 15 minutes of sunlight or take supplements.", "icon": "sun"},
        {"title": "Stay Vaccinated", "content": "Flu and pneumonia vaccines are especially important for seniors. Keep vaccinations up to date.", "icon": "shield"}
    ]
}

# Health Articles
HEALTH_ARTICLES = [
    {
        "id": "diabetes-management-101",
        "title": "Diabetes Management 101: A Complete Guide",
        "summary": "Everything you need to know about managing diabetes effectively",
        "category": "diabetes",
        "author": "Dr. Neha Gupta",
        "author_role": "Diabetologist",
        "read_time": 8,
        "content": """
## Understanding Diabetes

Diabetes is a chronic condition that affects how your body processes blood sugar (glucose). With proper management, you can live a healthy, active life.

### Types of Diabetes
1. **Type 1**: Body doesn't produce insulin
2. **Type 2**: Body doesn't use insulin properly (most common)
3. **Gestational**: Develops during pregnancy

### Key Numbers to Know
- **Fasting Blood Sugar**: < 100 mg/dL (normal)
- **Post-Meal**: < 140 mg/dL (normal)
- **HbA1c**: < 5.7% (normal), < 7% (diabetic target)

### Lifestyle Management
1. **Diet**: Focus on low glycemic foods, fiber-rich vegetables, lean proteins
2. **Exercise**: 150 minutes/week of moderate activity
3. **Monitoring**: Regular blood sugar checks
4. **Medications**: Take as prescribed, never skip

### Warning Signs
Seek immediate help if you experience:
- Very high blood sugar (>300)
- Confusion or drowsiness
- Fruity-smelling breath
- Persistent vomiting
        """,
        "tags": ["diabetes", "management", "lifestyle"],
        "views": 1250,
        "likes": 89
    },
    {
        "id": "pregnancy-nutrition-guide",
        "title": "Nutrition During Pregnancy: What to Eat & Avoid",
        "summary": "A comprehensive guide to eating right during pregnancy",
        "category": "pregnancy",
        "author": "Dr. Priya Sharma",
        "author_role": "Obstetrician",
        "read_time": 6,
        "content": """
## Eating for Two (The Right Way)

Pregnancy nutrition is about quality, not just quantity. Here's what you need to know.

### Essential Nutrients

1. **Folic Acid (400-800mcg)**
   - Prevents neural tube defects
   - Sources: Leafy greens, fortified cereals, supplements

2. **Iron (27mg)**
   - Prevents anemia
   - Sources: Lean meat, spinach, beans

3. **Calcium (1000mg)**
   - Builds baby's bones
   - Sources: Dairy, fortified plant milk, almonds

4. **Protein (75-100g)**
   - Supports baby's growth
   - Sources: Eggs, lean meat, legumes, dairy

### Foods to Avoid
- Raw or undercooked seafood, eggs, meat
- Unpasteurized dairy and juices
- High-mercury fish (shark, swordfish, king mackerel)
- Deli meats (unless heated)
- Raw sprouts
- Excess caffeine (limit to 200mg/day)

### Sample Meal Plan
**Breakfast**: Oatmeal with fruits, milk, prenatal vitamin
**Lunch**: Dal, rice, vegetables, salad
**Snack**: Yogurt with nuts
**Dinner**: Grilled fish/chicken, roti, vegetables
        """,
        "tags": ["pregnancy", "nutrition", "diet"],
        "views": 980,
        "likes": 76
    },
    {
        "id": "heart-health-tips",
        "title": "10 Ways to Keep Your Heart Healthy",
        "summary": "Simple lifestyle changes for a stronger heart",
        "category": "cardiac",
        "author": "Dr. Rajesh Mehta",
        "author_role": "Cardiologist",
        "read_time": 5,
        "content": """
## Heart Health Essentials

Heart disease is preventable. Here are 10 evidence-based tips.

1. **Exercise Regularly**: 150 minutes/week of moderate activity
2. **Eat Heart-Healthy**: More vegetables, less saturated fat
3. **Quit Smoking**: #1 preventable cause of heart disease
4. **Manage Stress**: Chronic stress damages arteries
5. **Control Blood Pressure**: Target <120/80 mmHg
6. **Maintain Healthy Weight**: BMI 18.5-24.9
7. **Limit Alcohol**: Max 1 drink/day for women, 2 for men
8. **Get Enough Sleep**: 7-9 hours nightly
9. **Know Your Numbers**: Regular cholesterol, BP checks
10. **Take Medications**: As prescribed, don't skip

### Warning Signs of Heart Attack
- Chest pain or pressure
- Pain in arm, neck, jaw
- Shortness of breath
- Cold sweat, nausea

**Call emergency services immediately if you experience these symptoms.**
        """,
        "tags": ["heart", "cardiac", "prevention"],
        "views": 1500,
        "likes": 112
    },
    {
        "id": "menopause-guide",
        "title": "Navigating Menopause: A Woman's Guide",
        "summary": "Understanding and managing menopause symptoms",
        "category": "women",
        "author": "Dr. Anita Desai",
        "author_role": "Gynecologist",
        "read_time": 7,
        "content": """
## Understanding Menopause

Menopause is a natural transition, not a disease. Here's how to navigate it gracefully.

### The Three Stages
1. **Perimenopause**: 4-8 years before menopause, irregular periods
2. **Menopause**: 12 months without period (avg age 51)
3. **Postmenopause**: The years after

### Common Symptoms
- Hot flashes and night sweats
- Mood changes
- Sleep problems
- Vaginal dryness
- Weight gain
- Memory issues

### Management Strategies

**Lifestyle**
- Regular exercise
- Cooling techniques for hot flashes
- Stress management
- Adequate sleep

**Medical Options**
- Hormone Replacement Therapy (HRT)
- Non-hormonal medications
- Vaginal estrogen for dryness

**Natural Remedies**
- Black cohosh
- Evening primrose oil
- Soy isoflavones

*Always consult your doctor before starting any treatment.*
        """,
        "tags": ["women", "menopause", "hormones"],
        "views": 870,
        "likes": 65
    }
]

# ==================== ENDPOINTS ====================

@router.get("/daily/{user_id}")
async def get_daily_tip(user_id: str):
    """Get personalized daily health tip"""
    db = get_db()
    
    # Get user interests
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    interests = user.get("interests", []) if user else []
    
    # Determine which tip categories to use
    categories = ["general"]
    if "glydex" in interests:
        categories.append("diabetes")
    if "evara" in interests:
        categories.extend(["women", "pregnancy"])
    
    # Get today's tip (consistent for the day)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    seed = hash(f"{user_id}-{today}")
    random.seed(seed)
    
    # Pick a category and tip
    category = random.choice(categories)
    tips = HEALTH_TIPS.get(category, HEALTH_TIPS["general"])
    tip = random.choice(tips)
    
    # Reset random seed
    random.seed()
    
    return {
        "tip": tip,
        "category": category,
        "date": today,
        "greeting": get_time_greeting()
    }

def get_time_greeting():
    """Get appropriate greeting based on time of day"""
    hour = datetime.now(timezone.utc).hour + 5.5  # IST
    hour = hour % 24
    if hour < 12:
        return "Good Morning"
    elif hour < 17:
        return "Good Afternoon"
    else:
        return "Good Evening"

@router.get("/all")
async def get_all_tips(category: Optional[str] = None):
    """Get all health tips, optionally filtered by category"""
    if category and category in HEALTH_TIPS:
        return {"tips": HEALTH_TIPS[category], "category": category}
    return {"tips": HEALTH_TIPS, "categories": list(HEALTH_TIPS.keys())}

@router.get("/articles")
async def get_articles(category: Optional[str] = None, limit: int = 10):
    """Get health articles"""
    articles = HEALTH_ARTICLES
    
    if category:
        articles = [a for a in articles if a.get("category") == category]
    
    # Return summary view
    return {
        "articles": [{
            "id": a["id"],
            "title": a["title"],
            "summary": a["summary"],
            "category": a["category"],
            "author": a["author"],
            "read_time": a["read_time"],
            "views": a["views"],
            "likes": a["likes"]
        } for a in articles[:limit]],
        "categories": list(set(a["category"] for a in HEALTH_ARTICLES))
    }

@router.get("/articles/{article_id}")
async def get_article(article_id: str):
    """Get full article content"""
    article = next((a for a in HEALTH_ARTICLES if a["id"] == article_id), None)
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Increment view count (in real app, this would update DB)
    article["views"] += 1
    
    return article

@router.post("/articles/{article_id}/like")
async def like_article(article_id: str, user_id: str):
    """Like an article"""
    db = get_db()
    
    # Check if already liked
    existing = await db.article_likes.find_one({
        "article_id": article_id,
        "user_id": user_id
    })
    
    if existing:
        return {"message": "Already liked", "liked": True}
    
    await db.article_likes.insert_one({
        "article_id": article_id,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Article liked!", "liked": True}

@router.get("/weekly-digest/{user_id}")
async def get_weekly_digest(user_id: str):
    """Get weekly health tips digest"""
    db = get_db()
    
    # Get user interests
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    interests = user.get("interests", []) if user else []
    
    # Build personalized digest
    digest = {
        "general_tips": random.sample(HEALTH_TIPS["general"], min(3, len(HEALTH_TIPS["general"]))),
        "featured_articles": random.sample(HEALTH_ARTICLES, min(2, len(HEALTH_ARTICLES)))
    }
    
    if "glydex" in interests:
        digest["diabetes_tips"] = random.sample(HEALTH_TIPS["diabetes"], min(2, len(HEALTH_TIPS["diabetes"])))
    
    if "evara" in interests:
        digest["women_tips"] = random.sample(HEALTH_TIPS["women"], min(2, len(HEALTH_TIPS["women"])))
    
    return digest
