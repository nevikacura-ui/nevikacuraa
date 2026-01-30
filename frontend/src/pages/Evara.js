import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import SubscriptionGate from '@/components/SubscriptionGate';
import { 
  ArrowLeft, Heart, Calendar, MessageCircle, Bell, 
  Sparkles, Activity, Baby, Flower2, Users, Send,
  ChevronRight, Plus, Clock, Calculator, BookOpen,
  Apple, Dumbbell, Info, AlertTriangle, User, Mail, Phone, Lock,
  Home, Video, PlayCircle, MapPin, Share2, Crown, FileDown, Search, X, Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// WhatsApp share function
const shareOnWhatsApp = async (contentType, token = null, API_URL = null) => {
  // For period_report, use API to get personalized data
  if (contentType === 'period_report' && token && API_URL) {
    try {
      const response = await fetch(`${API_URL}/api/evara/share-period-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, '_blank');
        toast.success('Opening WhatsApp to share report');
      } else {
        toast.error('No period data to share. Start tracking your periods!');
      }
      return;
    } catch (error) {
      toast.error('Failed to generate report');
      return;
    }
  }
  
  const shareContent = {
    pcos_guide: {
      message: `🌸 *Understanding PCOS* 🌸\n\nLearn about symptoms, diet plans, and exercise routines for managing PCOS.\n\n✅ Symptoms & Diagnosis\n✅ PCOS-Friendly Diet\n✅ Weekly Exercise Plan\n\nDownload Nevika Cura app for the complete guide!\n\n#PCOSAwareness #WomensHealth`
    },
    pms_guide: {
      message: `🌷 *Understanding PMS* 🌷\n\nTips to manage premenstrual syndrome effectively.\n\n✅ Physical & Emotional Symptoms\n✅ Dietary Changes\n✅ Exercise & Lifestyle Tips\n\nDownload Nevika Cura app for more!\n\n#PMS #WomensWellness`
    },
    pregnancy_tips: {
      message: `🤰 *Pregnancy Week-by-Week Guide* 🤰\n\nTrack your baby's development from week 1 to 42!\n\n✅ Baby's size & growth\n✅ Mom's body changes\n✅ Weekly tips\n\nDownload Nevika Cura app!\n\n#Pregnancy #MomToBe`
    }
  };
  
  const content = shareContent[contentType];
  if (content) {
    const encodedMessage = encodeURIComponent(content.message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    toast.success('Opening WhatsApp to share!');
  }
};

// PMS Education Content
const PMS_EDUCATION = {
  title: "Understanding PMS (Premenstrual Syndrome)",
  overview: `Premenstrual Syndrome (PMS) refers to a combination of physical and emotional symptoms that occur 1-2 weeks before your period. About 75% of women experience some form of PMS. While symptoms vary from person to person, understanding your body can help you manage them better.`,
  symptoms: {
    physical: [
      "Bloating and water retention",
      "Breast tenderness or swelling",
      "Headaches or migraines",
      "Fatigue and low energy",
      "Muscle aches and joint pain",
      "Acne breakouts",
      "Digestive issues (constipation or diarrhea)",
      "Food cravings, especially for sweets"
    ],
    emotional: [
      "Mood swings and irritability",
      "Anxiety or tension",
      "Depression or sadness",
      "Difficulty concentrating",
      "Changes in sleep patterns",
      "Social withdrawal",
      "Crying spells"
    ]
  },
  management: [
    {
      title: "Dietary Changes",
      tips: [
        "Reduce salt intake to minimize bloating",
        "Eat smaller, more frequent meals",
        "Include complex carbohydrates (whole grains, fruits, vegetables)",
        "Limit caffeine and alcohol",
        "Stay hydrated with water and herbal teas"
      ]
    },
    {
      title: "Exercise & Movement",
      tips: [
        "30 minutes of moderate exercise daily",
        "Yoga and stretching for cramp relief",
        "Walking or swimming",
        "Deep breathing exercises"
      ]
    },
    {
      title: "Lifestyle Adjustments",
      tips: [
        "Prioritize 7-9 hours of sleep",
        "Practice stress management techniques",
        "Use heating pads for cramps",
        "Keep a symptom diary to track patterns"
      ]
    }
  ]
};

// PCOS Education Content
const PCOS_EDUCATION = {
  title: "Understanding PCOS (Polycystic Ovary Syndrome)",
  overview: `PCOS is a common hormonal disorder affecting 1 in 10 women of reproductive age. It occurs when the ovaries produce excess androgens (male hormones), leading to irregular periods, cysts on ovaries, and various symptoms. While there's no cure, PCOS can be effectively managed through lifestyle changes and medical treatment.`,
  
  symptoms: [
    "Irregular or missed periods",
    "Heavy bleeding during periods",
    "Excess hair growth (hirsutism) on face, chest, back",
    "Acne and oily skin",
    "Weight gain, especially around the abdomen",
    "Thinning hair or male-pattern baldness",
    "Skin darkening in neck creases, groin, under breasts",
    "Difficulty getting pregnant"
  ],
  
  diagnosis: [
    "Blood tests to check hormone levels (testosterone, insulin, thyroid)",
    "Pelvic ultrasound to examine ovaries",
    "Assessment of menstrual history and symptoms"
  ],
  
  dietPlan: {
    title: "PCOS-Friendly Diet Plan",
    principles: [
      "Focus on low glycemic index (GI) foods to manage insulin",
      "Include anti-inflammatory foods",
      "Balance protein, healthy fats, and complex carbs",
      "Eat regular meals to stabilize blood sugar"
    ],
    foods_to_include: [
      { category: "Proteins", items: "Lean chicken, fish, eggs, tofu, legumes, Greek yogurt" },
      { category: "Complex Carbs", items: "Quinoa, brown rice, oats, sweet potatoes, whole grain bread" },
      { category: "Healthy Fats", items: "Avocado, olive oil, nuts, seeds, fatty fish (salmon)" },
      { category: "Vegetables", items: "Leafy greens, broccoli, cauliflower, bell peppers, tomatoes" },
      { category: "Fruits (low GI)", items: "Berries, apples, pears, oranges, cherries" },
      { category: "Anti-inflammatory", items: "Turmeric, ginger, green tea, dark chocolate (70%+)" }
    ],
    foods_to_limit: [
      "Refined carbs (white bread, pasta, pastries)",
      "Sugary foods and drinks",
      "Processed and fried foods",
      "Red meat (limit to 1-2 times/week)",
      "Dairy (some women benefit from reducing dairy)"
    ],
    sample_day: {
      breakfast: "Overnight oats with berries, chia seeds, and almonds",
      mid_morning: "Greek yogurt with walnuts",
      lunch: "Grilled chicken salad with olive oil dressing, quinoa",
      snack: "Apple slices with almond butter",
      dinner: "Baked salmon with roasted vegetables and brown rice",
      evening: "Herbal tea (spearmint tea may help reduce androgens)"
    }
  },
  
  exercisePlan: {
    title: "Exercise Plan for PCOS",
    benefits: [
      "Improves insulin sensitivity",
      "Helps with weight management",
      "Reduces stress and anxiety",
      "Regulates hormones",
      "Improves mood and energy"
    ],
    weekly_plan: [
      {
        day: "Monday",
        activity: "Cardio",
        details: "30 min brisk walking or cycling. Start slow, maintain steady pace.",
        duration: "30-40 minutes"
      },
      {
        day: "Tuesday",
        activity: "Strength Training",
        details: "Upper body - Push-ups, dumbbell rows, shoulder press. 3 sets of 12 reps.",
        duration: "30 minutes"
      },
      {
        day: "Wednesday",
        activity: "Yoga",
        details: "Focus on poses that massage abdominal organs: Child's pose, Cobra, Butterfly pose.",
        duration: "45 minutes"
      },
      {
        day: "Thursday",
        activity: "HIIT (High Intensity)",
        details: "20 sec work, 40 sec rest. Jumping jacks, squats, burpees. Boosts metabolism.",
        duration: "20 minutes"
      },
      {
        day: "Friday",
        activity: "Strength Training",
        details: "Lower body - Squats, lunges, deadlifts. 3 sets of 12 reps.",
        duration: "30 minutes"
      },
      {
        day: "Saturday",
        activity: "Active Recovery",
        details: "Light walk, stretching, or swimming. Keep moving but don't strain.",
        duration: "30-45 minutes"
      },
      {
        day: "Sunday",
        activity: "Rest Day",
        details: "Complete rest or gentle stretching. Listen to your body.",
        duration: "As needed"
      }
    ],
    tips: [
      "Start slowly if you're new to exercise",
      "Consistency is more important than intensity",
      "Include both cardio and strength training",
      "Exercise during your higher energy days in your cycle",
      "Track your progress and how you feel"
    ]
  }
};

// Pregnancy Education Content
const PREGNANCY_EDUCATION = {
  title: "Pregnancy Guide & Education",
  trimester_guides: [
    {
      trimester: 1,
      title: "First Trimester (Weeks 1-12)",
      overview: "Your baby's major organs and systems begin to form. This is a crucial time for development.",
      baby_development: [
        "Week 4: Heart begins to beat",
        "Week 6: Brain and spinal cord developing",
        "Week 8: All major organs have begun to form",
        "Week 10: Fingers and toes separate",
        "Week 12: Baby can open and close fists"
      ],
      mom_changes: [
        "Morning sickness and nausea",
        "Breast tenderness and changes",
        "Fatigue and tiredness",
        "Frequent urination",
        "Food cravings or aversions"
      ],
      tips: [
        "Take prenatal vitamins with folic acid",
        "Avoid alcohol, smoking, and certain medications",
        "Get adequate rest",
        "Eat small, frequent meals to manage nausea",
        "Stay hydrated"
      ],
      diet_tips: [
        "Focus on folate-rich foods (spinach, lentils, citrus)",
        "Include iron-rich foods (lean meat, beans)",
        "Eat protein at every meal",
        "Avoid raw/undercooked meat and fish",
        "Limit caffeine to 200mg/day"
      ]
    },
    {
      trimester: 2,
      title: "Second Trimester (Weeks 13-26)",
      overview: "Often called the 'golden period' - energy returns and baby grows rapidly.",
      baby_development: [
        "Week 14: Baby can squint and frown",
        "Week 16: Baby can hear sounds",
        "Week 18: Baby's movements felt (quickening)",
        "Week 20: Halfway point! Anatomy scan",
        "Week 24: Lungs developing, baby is viable"
      ],
      mom_changes: [
        "Energy levels improve",
        "Baby bump becomes visible",
        "Feeling baby movements",
        "Skin changes (linea nigra, stretch marks)",
        "Back pain may begin"
      ],
      tips: [
        "Continue prenatal vitamins",
        "Start sleeping on your left side",
        "Do pregnancy-safe exercises",
        "Schedule your anatomy scan",
        "Start planning for baby's arrival"
      ],
      diet_tips: [
        "Increase calcium intake (dairy, leafy greens)",
        "Get enough omega-3 fatty acids",
        "Eat fiber-rich foods for constipation",
        "Include vitamin D sources",
        "Stay well hydrated"
      ]
    },
    {
      trimester: 3,
      title: "Third Trimester (Weeks 27-40)",
      overview: "Baby gains weight rapidly and prepares for birth. Final preparations time!",
      baby_development: [
        "Week 28: Eyes can open and close",
        "Week 32: Baby practices breathing",
        "Week 34: Central nervous system maturing",
        "Week 36: Baby drops into pelvis",
        "Week 40: Full term and ready for birth!"
      ],
      mom_changes: [
        "Shortness of breath",
        "Frequent urination returns",
        "Braxton Hicks contractions",
        "Difficulty sleeping",
        "Swelling in feet and ankles"
      ],
      tips: [
        "Monitor baby's movements daily",
        "Pack your hospital bag",
        "Take childbirth classes",
        "Practice breathing exercises",
        "Know the signs of labor"
      ],
      diet_tips: [
        "Eat smaller, more frequent meals",
        "Continue iron-rich foods",
        "Stay hydrated",
        "Avoid heavy meals before bed",
        "Include foods for lactation prep"
      ]
    }
  ],
  important_tests: [
    { test: "First Trimester Screening", when: "Weeks 11-14", purpose: "Check for chromosomal abnormalities" },
    { test: "NIPT (Non-Invasive Prenatal Testing)", when: "Week 10+", purpose: "Genetic screening" },
    { test: "Anatomy Scan", when: "Weeks 18-22", purpose: "Check baby's development" },
    { test: "Glucose Tolerance Test", when: "Weeks 24-28", purpose: "Screen for gestational diabetes" },
    { test: "Group B Strep Test", when: "Weeks 35-37", purpose: "Check for GBS bacteria" }
  ],
  warning_signs: [
    "Heavy bleeding or passing clots",
    "Severe abdominal pain",
    "Sudden swelling of face/hands",
    "Severe headache with vision changes",
    "Baby's movements significantly decrease",
    "Fluid leaking before 37 weeks"
  ]
};

// Menopause Care Content
const MENOPAUSE_CONTENT = {
  title: "Understanding Menopause",
  overview: "Menopause is a natural biological process marking the end of menstrual cycles. It's diagnosed after 12 months without a period, typically occurring in your late 40s to early 50s.",
  stages: [
    {
      stage: "Perimenopause",
      duration: "4-8 years before menopause",
      description: "Your body begins transitioning. Periods become irregular, and symptoms start.",
      symptoms: ["Irregular periods", "Hot flashes begin", "Sleep disturbances", "Mood changes"]
    },
    {
      stage: "Menopause",
      duration: "When periods stop for 12 months",
      description: "Official menopause is confirmed after 1 year without periods.",
      symptoms: ["No menstrual periods", "Hot flashes intensify", "Vaginal dryness", "Night sweats"]
    },
    {
      stage: "Postmenopause",
      duration: "Years after menopause",
      description: "Symptoms may ease, but health risks increase for osteoporosis and heart disease.",
      symptoms: ["Symptoms gradually reduce", "Bone density concerns", "Heart health focus needed"]
    }
  ],
  common_symptoms: [
    { symptom: "Hot Flashes", description: "Sudden feeling of warmth, mainly in face, neck, and chest", management: "Dress in layers, keep room cool, avoid triggers like spicy food" },
    { symptom: "Night Sweats", description: "Hot flashes that occur during sleep", management: "Use breathable bedding, keep bedroom cool, wear moisture-wicking sleepwear" },
    { symptom: "Sleep Problems", description: "Difficulty falling or staying asleep", management: "Maintain sleep schedule, limit caffeine, practice relaxation techniques" },
    { symptom: "Mood Changes", description: "Irritability, anxiety, or depression", management: "Exercise regularly, seek support, consider counseling if severe" },
    { symptom: "Vaginal Dryness", description: "Decreased lubrication and elasticity", management: "Use water-based lubricants, stay sexually active, consult doctor for treatments" },
    { symptom: "Weight Gain", description: "Metabolism slows, weight redistributes to abdomen", management: "Increase physical activity, reduce calorie intake, focus on protein" }
  ],
  tips_guides: [
    {
      title: "Nutrition for Menopause",
      tips: [
        "Increase calcium and vitamin D for bone health",
        "Eat phytoestrogen-rich foods (soy, flaxseed)",
        "Include omega-3 fatty acids",
        "Reduce sugar and processed foods",
        "Limit alcohol and caffeine",
        "Stay well hydrated"
      ]
    },
    {
      title: "Exercise Recommendations",
      tips: [
        "Weight-bearing exercises for bone health (walking, dancing)",
        "Strength training 2-3 times per week",
        "Yoga for flexibility and stress relief",
        "Cardio for heart health and weight management",
        "Pelvic floor exercises (Kegels)",
        "Aim for 150 minutes of moderate activity per week"
      ]
    },
    {
      title: "Mental Wellness",
      tips: [
        "Practice stress management techniques",
        "Stay socially connected",
        "Consider mindfulness or meditation",
        "Get adequate sleep (7-8 hours)",
        "Seek professional help if needed",
        "Join menopause support groups"
      ]
    }
  ],
  faqs: [
    { q: "What age does menopause usually start?", a: "Average age is 51, but it can occur anywhere from 45-55. Premature menopause occurs before 40." },
    { q: "How long do menopause symptoms last?", a: "Symptoms typically last 4-5 years, but can continue for 7-10 years for some women." },
    { q: "Should I take hormone therapy?", a: "HRT can help many symptoms but isn't suitable for everyone. Discuss risks and benefits with your doctor." },
    { q: "Can I still get pregnant during perimenopause?", a: "Yes, until you've gone 12 months without a period, pregnancy is possible. Use contraception if needed." },
    { q: "How can I protect my bone health?", a: "Calcium, vitamin D, weight-bearing exercise, and avoiding smoking/excessive alcohol help maintain bone density." }
  ]
};

// Women Health Community Content - Tips, Guides, Q&A
const WOMEN_HEALTH_COMMUNITY = {
  title: "Women's Health Community",
  subtitle: "Tips, Guides & Important Q&A",
  categories: [
    {
      id: "pregnancy",
      name: "Pregnancy & Baby",
      icon: "baby",
      tips: [
        { title: "Prenatal Care is Essential", content: "Schedule your first prenatal visit as soon as you know you're pregnant. Regular check-ups monitor baby's growth and your health." },
        { title: "Folic Acid Daily", content: "Take 400-800mcg of folic acid daily to prevent neural tube defects. Start even before conception if planning." },
        { title: "Stay Hydrated", content: "Drink 8-12 glasses of water daily. Proper hydration prevents constipation, UTIs, and supports amniotic fluid." },
        { title: "Safe Exercise", content: "Walking, swimming, and prenatal yoga are safe. Avoid contact sports and activities with fall risk." },
        { title: "Rest When Needed", content: "Your body is working hard. Sleep on your left side in later pregnancy to improve blood flow to baby." }
      ],
      guides: [
        { title: "Trimester Overview", content: "1st: Organ formation, nausea common. 2nd: Baby grows, energy returns. 3rd: Rapid growth, prepare for birth." },
        { title: "Warning Signs to Watch", content: "Severe headache, vision changes, heavy bleeding, severe pain, or decreased baby movement need immediate medical attention." },
        { title: "Nutrition During Pregnancy", content: "Extra 300 calories/day in 2nd-3rd trimester. Focus on protein, iron, calcium, and omega-3s. Avoid raw fish, unpasteurized dairy." }
      ],
      faqs: [
        { q: "How much weight should I gain?", a: "Normal BMI: 11-16 kg. Underweight: 12-18 kg. Overweight: 7-11 kg. Your doctor will guide based on your starting weight." },
        { q: "Is morning sickness normal?", a: "Yes, affects 70-80% of pregnant women. Usually improves after 12-14 weeks. Severe vomiting (hyperemesis) needs treatment." },
        { q: "When will I feel baby move?", a: "First pregnancy: 18-25 weeks. Subsequent pregnancies: as early as 13 weeks. Report decreased movement to your doctor." }
      ]
    },
    {
      id: "menopause",
      name: "Menopause Support",
      icon: "flower",
      tips: [
        { title: "Stay Cool", content: "Dress in layers, keep room cool, avoid spicy food and alcohol which can trigger hot flashes." },
        { title: "Bone Health Focus", content: "Increase calcium (1200mg/day) and vitamin D. Weight-bearing exercises strengthen bones." },
        { title: "Heart Health Matters", content: "Estrogen decline increases heart disease risk. Monitor cholesterol, blood pressure, and maintain healthy weight." },
        { title: "Manage Vaginal Dryness", content: "Water-based lubricants help. Vaginal estrogen creams are safe and effective for many women." },
        { title: "Sleep Hygiene", content: "Night sweats disrupt sleep. Keep bedroom cool, use moisture-wicking fabrics, avoid caffeine after noon." }
      ],
      guides: [
        { title: "Understanding the Stages", content: "Perimenopause (4-8 years): Irregular periods, symptoms start. Menopause: 12 months without period. Postmenopause: Symptoms may ease." },
        { title: "HRT - Know Your Options", content: "Hormone replacement therapy can help severe symptoms. Discuss risks/benefits with your doctor based on your health history." },
        { title: "Natural Remedies", content: "Black cohosh, evening primrose oil, and soy isoflavones may help some women. Always consult doctor before starting supplements." }
      ],
      faqs: [
        { q: "What age does menopause start?", a: "Average age is 51, but normal range is 45-55. Premature menopause occurs before 40 and needs medical evaluation." },
        { q: "How long do symptoms last?", a: "Average 4-5 years, but can continue 7-10 years. Hot flashes eventually stop for most women." },
        { q: "Can I still get pregnant?", a: "Until 12 consecutive months without a period, pregnancy is possible. Use contraception if you don't want to conceive." }
      ]
    },
    {
      id: "pms_pcos",
      name: "PMS & PCOS",
      icon: "heart",
      tips: [
        { title: "Track Your Symptoms", content: "Log symptoms for 2-3 cycles to identify patterns. This helps you and your doctor manage symptoms better." },
        { title: "Reduce Salt & Sugar", content: "Both can worsen bloating and mood swings. Limit processed foods, especially 1-2 weeks before your period." },
        { title: "Exercise Helps", content: "Regular exercise reduces cramps, improves mood, and helps with PCOS insulin resistance. Aim for 30 min/day." },
        { title: "Manage PCOS Weight", content: "Even 5-10% weight loss can restore regular periods and improve fertility in PCOS. Low-GI diet helps." },
        { title: "Stress Management", content: "Stress worsens both PMS and PCOS. Practice yoga, meditation, or deep breathing regularly." }
      ],
      guides: [
        { title: "PMS vs PMDD", content: "PMS: Mild symptoms, manageable. PMDD: Severe mood symptoms that interfere with daily life - needs medical treatment." },
        { title: "PCOS Diet Guide", content: "Focus on low glycemic index foods, lean protein, healthy fats. Limit refined carbs, sugar, and processed foods." },
        { title: "Supplements That Help", content: "PMS: Calcium, magnesium, B6. PCOS: Inositol, omega-3, vitamin D. Always consult doctor first." }
      ],
      faqs: [
        { q: "What causes PCOS?", a: "Exact cause unknown. Involves insulin resistance, hormonal imbalance, and genetics. It's manageable with lifestyle and medication." },
        { q: "Can PCOS affect fertility?", a: "PCOS is a leading cause of infertility but many women conceive with treatment. Weight loss and medications like Clomid help." },
        { q: "Is severe PMS normal?", a: "Mild PMS is normal, but symptoms that disrupt work/relationships may be PMDD. Talk to your doctor about treatment options." }
      ]
    },
    {
      id: "mental_health",
      name: "Mental Wellness",
      icon: "brain",
      tips: [
        { title: "Practice Mindfulness", content: "Even 5 minutes of daily meditation can reduce anxiety and improve focus." },
        { title: "Social Connections", content: "Maintain relationships with friends and family. Social support is crucial for mental health." },
        { title: "Set Boundaries", content: "It's okay to say no. Protect your energy and prioritize your needs." },
        { title: "Seek Help When Needed", content: "Don't hesitate to consult a mental health professional if struggling." }
      ],
      guides: [
        { title: "Managing Anxiety", content: "Identify triggers, practice grounding techniques, maintain routine, and limit caffeine." },
        { title: "Dealing with Hormonal Mood Changes", content: "Track mood with your cycle, practice self-compassion, and communicate needs to loved ones." }
      ],
      faqs: [
        { q: "Is it normal to feel emotional before periods?", a: "Yes, hormonal changes can affect mood. If severe, consult a doctor about PMDD." },
        { q: "How do I know if I need professional help?", a: "If symptoms interfere with daily life, relationships, or work for more than 2 weeks." }
      ]
    },
    {
      id: "nutrition",
      name: "Nutrition & Diet",
      icon: "apple",
      tips: [
        { title: "Eat the Rainbow", content: "Include colorful fruits and vegetables for diverse nutrients." },
        { title: "Iron Matters", content: "Women need more iron due to menstruation. Include leafy greens, beans, and lean meat." },
        { title: "Calcium for Bones", content: "Dairy, fortified foods, and leafy greens help maintain bone density." },
        { title: "Limit Processed Foods", content: "Choose whole foods over packaged items to reduce sodium and additives." }
      ],
      guides: [
        { title: "Eating for Your Cycle", content: "Menstruation: Iron-rich foods. Follicular: Fresh vegetables. Ovulation: Fiber. Luteal: Complex carbs." },
        { title: "Anti-Inflammatory Diet", content: "Focus on omega-3s, berries, leafy greens, and turmeric. Avoid sugar and processed foods." }
      ],
      faqs: [
        { q: "Should I take a multivitamin?", a: "A balanced diet is best, but supplements can help fill gaps. Consult a doctor for personalized advice." },
        { q: "How much water should I drink daily?", a: "About 2-2.5 liters (8-10 glasses). More if exercising or in hot weather." }
      ]
    },
    {
      id: "general_wellness",
      name: "General Health",
      icon: "heart",
      tips: [
        { title: "Stay Active", content: "Aim for at least 150 minutes of moderate exercise per week. Include both cardio and strength training." },
        { title: "Prioritize Sleep", content: "Adults need 7-9 hours of quality sleep. Maintain a consistent sleep schedule." },
        { title: "Manage Stress", content: "Practice deep breathing, meditation, or yoga. Take breaks when feeling overwhelmed." },
        { title: "Stay Hydrated", content: "Drink at least 8 glasses of water daily. Increase intake during exercise or hot weather." },
        { title: "Regular Check-ups", content: "Schedule annual wellness exams. Don't skip recommended screenings." }
      ],
      guides: [
        { title: "Building a Self-Care Routine", content: "Start small with 10 minutes daily. Include physical, emotional, and mental wellness activities." },
        { title: "Healthy Eating Basics", content: "Focus on whole foods, balanced macros, and plenty of fruits and vegetables." }
      ],
      faqs: [
        { q: "How often should I exercise?", a: "Aim for at least 30 minutes of moderate activity most days of the week." },
        { q: "What supplements do women need?", a: "Common needs include vitamin D, calcium, iron (if menstruating), and folic acid (if planning pregnancy)." }
      ]
    }
  ]
};

// Period Tracking Tips
const PERIOD_TRACKING_TIPS = [
  {
    phase: "Menstrual Phase (Days 1-5)",
    tips: [
      "Rest and gentle movement like yoga or walking",
      "Focus on iron-rich foods to replace blood loss",
      "Use heating pads for cramp relief",
      "Stay hydrated with warm drinks",
      "Get extra sleep if needed"
    ],
    nutrition: "Iron-rich foods: spinach, red meat, beans, dark chocolate"
  },
  {
    phase: "Follicular Phase (Days 6-14)",
    tips: [
      "Energy levels rise - great time for intense workouts",
      "Try new activities or challenges",
      "Brain power peaks - tackle complex tasks",
      "Socialize and network",
      "Plan creative projects"
    ],
    nutrition: "Focus on fermented foods, protein, and healthy fats"
  },
  {
    phase: "Ovulation (Around Day 14)",
    tips: [
      "Peak energy and confidence",
      "Best time for important conversations or presentations",
      "High-intensity workouts feel easier",
      "Libido may increase",
      "Most fertile window if trying to conceive"
    ],
    nutrition: "Light, fresh foods; vegetables, fruits, fiber-rich foods"
  },
  {
    phase: "Luteal Phase (Days 15-28)",
    tips: [
      "Energy gradually decreases",
      "Practice self-care and stress management",
      "Reduce caffeine and sugar to minimize PMS",
      "Magnesium-rich foods can help with cravings",
      "Prioritize sleep and rest"
    ],
    nutrition: "Complex carbs, magnesium-rich foods (nuts, seeds, dark chocolate)"
  }
];

// Pregnancy Calculator Component
const PregnancyCalculator = ({ onClose }) => {
  const [lmpDate, setLmpDate] = useState('');
  const [result, setResult] = useState(null);

  const calculatePregnancy = () => {
    if (!lmpDate) {
      toast.error('Please enter your Last Menstrual Period date');
      return;
    }

    const lmp = new Date(lmpDate);
    const today = new Date();
    
    // Calculate EDD (Naegele's Rule: LMP + 280 days)
    const edd = new Date(lmp);
    edd.setDate(edd.getDate() + 280);
    
    // Calculate weeks and days pregnant
    const diffTime = today - lmp;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    
    // Calculate trimester
    let trimester = 1;
    if (weeks >= 13 && weeks < 27) trimester = 2;
    else if (weeks >= 27) trimester = 3;
    
    // Pregnancy milestones
    const milestones = [
      { week: 4, event: "Missed period, pregnancy can be detected" },
      { week: 6, event: "Heartbeat may be detected on ultrasound" },
      { week: 8, event: "Baby is now called a fetus, all organs forming" },
      { week: 12, event: "End of first trimester, risk of miscarriage decreases" },
      { week: 16, event: "You might feel baby's first movements (quickening)" },
      { week: 20, event: "Anatomy scan ultrasound, halfway point!" },
      { week: 24, event: "Baby is viable outside the womb with medical help" },
      { week: 28, event: "Third trimester begins, baby's eyes can open" },
      { week: 32, event: "Baby is practicing breathing movements" },
      { week: 36, event: "Baby is considered early term" },
      { week: 37, event: "Full term! Baby could arrive anytime" },
      { week: 40, event: "Due date - only 5% of babies arrive on this day!" }
    ];
    
    const nextMilestone = milestones.find(m => m.week > weeks) || milestones[milestones.length - 1];
    
    setResult({
      weeks,
      days,
      trimester,
      edd: edd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      daysUntilDue: Math.max(0, Math.floor((edd - today) / (1000 * 60 * 60 * 24))),
      nextMilestone,
      progress: Math.min(100, (weeks / 40) * 100)
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Last Menstrual Period (LMP) Date</Label>
        <Input 
          type="date" 
          value={lmpDate}
          onChange={(e) => setLmpDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
        />
        <p className="text-xs text-gray-500 mt-1">Enter the first day of your last period</p>
      </div>
      
      <Button onClick={calculatePregnancy} className="w-full bg-blue-500 hover:bg-blue-600">
        <Calculator className="w-4 h-4 mr-2" /> Calculate
      </Button>
      
      {result && (
        <div className="space-y-4 mt-4">
          <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm opacity-80">You are</p>
                <p className="text-4xl font-bold">{result.weeks} weeks, {result.days} days</p>
                <p className="text-sm opacity-80">pregnant</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-pink-50 border-pink-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-pink-600">Expected Due Date</p>
                <p className="font-semibold text-pink-800">{result.edd}</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-purple-600">Trimester</p>
                <p className="font-semibold text-purple-800">{result.trimester}{result.trimester === 1 ? 'st' : result.trimester === 2 ? 'nd' : 'rd'}</p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <p className="text-xs text-amber-600">Days until due date</p>
              <p className="font-semibold text-amber-800">{result.daysUntilDue} days</p>
              <div className="mt-2 bg-amber-200 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${result.progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3">
              <p className="text-xs text-green-600">Next Milestone (Week {result.nextMilestone.week})</p>
              <p className="text-sm text-green-800">{result.nextMilestone.event}</p>
            </CardContent>
          </Card>
          
          <p className="text-xs text-gray-500 text-center">
            * This is an estimate. Please consult your doctor for accurate assessment.
          </p>
        </div>
      )}
    </div>
  );
};

const Evara = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showPeriodLog, setShowPeriodLog] = useState(false);
  const [showPregnancyCalc, setShowPregnancyCalc] = useState(false);
  const [showPMSEducation, setShowPMSEducation] = useState(false);
  const [showPCOSEducation, setShowPCOSEducation] = useState(false);
  const [showHomeServices, setShowHomeServices] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showPregnancyWeeks, setShowPregnancyWeeks] = useState(false);
  const [showPregnancyEducation, setShowPregnancyEducation] = useState(false);
  const [showMenopauseGuide, setShowMenopauseGuide] = useState(false);
  const [showWomenCommunity, setShowWomenCommunity] = useState(false);
  const [selectedCommunityCategory, setSelectedCommunityCategory] = useState(null);
  const [homeServices, setHomeServices] = useState([]);
  const [communitySessions, setCommunitySessions] = useState([]);
  const [pregnancyWeeks, setPregnancyWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [activeProgram, setActiveProgram] = useState(null);
  const [programContent, setProgramContent] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('evara_token'));
  
  // Staff access check
  const staffToken = localStorage.getItem('staffToken');
  const staffInfo = localStorage.getItem('staffInfo');
  const isStaffLoggedIn = !!(staffToken && staffInfo);
  
  // Effective token includes staff token
  const effectiveToken = token || staffToken;
  
  // Create effective user for staff
  const getStaffAsUser = () => {
    if (!isStaffLoggedIn) return null;
    try {
      const staff = JSON.parse(staffInfo);
      return {
        name: staff.name || staff.username,
        id: staff.id || 'staff_' + staff.username,
        phone: staff.phone || '',
        email: staff.email || '',
        isStaff: true,
        staffRole: staff.role
      };
    } catch (e) { return null; }
  };
  
  const effectiveUser = user || getStaffAsUser();

  // Subscription state
  const [showSubscription, setShowSubscription] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  
  // Signup form state
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loginMode, setLoginMode] = useState(false);
  
  // Email OTP verification state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [mockEmailOtp, setMockEmailOtp] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  
  // Onboarding form state
  const [onboardingData, setOnboardingData] = useState({
    age: '',
    marital_status: '',
    pregnancy_status: 'no',
    menstrual_status: 'regular',
    known_conditions: [],
    weight: '',
    height: '',
    lifestyle_goals: [],
    preferred_language: 'English'
  });
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  // Reminders state
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    type: 'wellness_checkin',
    title: '',
    message: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    is_recurring: false
  });
  
  // Period tracking state
  const [periodData, setPeriodData] = useState({
    start_date: '',
    flow: 'medium',
    symptoms: [],
    notes: ''
  });
  const [periodHistory, setPeriodHistory] = useState({ history: [], average_cycle_length: 28, next_predicted: null });

  // Calorie Tracker state
  const [showCaloriesTracker, setShowCaloriesTracker] = useState(false);
  const [foodDatabase, setFoodDatabase] = useState({});
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('breakfast');
  const [calorieLogs, setCalorieLogs] = useState([]);
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const conditions = ['PCOS', 'Thyroid', 'Diabetes', 'Endometriosis', 'Fibroids'];
  const goals = ['Weight Management', 'Stress Relief', 'Better Sleep', 'Hormonal Balance', 'Fertility', 'General Wellness'];
  const symptoms = ['Cramps', 'Bloating', 'Mood Swings', 'Headache', 'Fatigue', 'Back Pain', 'Breast Tenderness'];

  useEffect(() => {
    // Check for existing Nevika Cura token
    const nevikaToken = localStorage.getItem('token');
    if (nevikaToken) {
      setToken(nevikaToken);
      localStorage.setItem('evara_token', nevikaToken);
    }
    
    if (token) {
      fetchUserProfile();
    }
    fetchProfile();
    fetchPrograms();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleSignup = async () => {
    if (!signupData.name || !signupData.email || !signupData.password) {
      toast.error('Please fill in all required fields (Name, Email, Password)');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const endpoint = loginMode ? '/api/auth/login' : '/api/auth/register';
      const body = loginMode 
        ? { email: signupData.email, password: signupData.password }
        : { ...signupData, email: signupData.email };
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('evara_token', data.token);
        localStorage.setItem('token', data.token); // Also save for Nevika Cura
        setUser(data.user || { name: signupData.name, phone: signupData.phone });
        setShowSignup(false);
        toast.success(loginMode ? 'Welcome back!' : 'Account created successfully!');
        fetchProfile();
      } else {
        toast.error(data.detail || 'Authentication failed');
      }
    } catch (error) {
      toast.error('Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('evara_token');
    localStorage.removeItem('token'); // Also clear main app token
    toast.success('Logged out successfully');
  };

  // Email OTP Verification Functions
  const sendEmailOtp = async () => {
    if (!signupData.email || !signupData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setEmailOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/email-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupData.email.toLowerCase() })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setEmailOtpSent(true);
        setMockEmailOtp(data.mock_otp || '');
        setOtpResendTimer(60);
        toast.success('Verification code sent to your email!');
      } else {
        toast.error(data.detail || 'Failed to send verification code');
      }
    } catch (error) {
      toast.error('Failed to send verification code');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    const otpValue = emailOtp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit code');
      return;
    }
    
    setEmailOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/email-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: signupData.email.toLowerCase(), 
          otp: otpValue 
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.verified) {
        setEmailVerificationToken(data.verification_token);
        
        if (data.user_exists) {
          // User exists - proceed to login
          const loginRes = await fetch(`${API_URL}/api/auth/email-otp/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: signupData.email.toLowerCase(),
              verification_token: data.verification_token
            })
          });
          
          const loginData = await loginRes.json();
          
          if (loginData.token) {
            setToken(loginData.token);
            localStorage.setItem('evara_token', loginData.token);
            localStorage.setItem('token', loginData.token);
            // Save patientId for subscription flow
            if (loginData.user?.id) {
              localStorage.setItem('patientId', loginData.user.id);
            }
            setUser(loginData.user);
            setShowSignup(false);
            resetSignupForm();
            toast.success('Welcome back!');
            fetchProfile();
          } else {
            toast.error(loginData.detail || 'Login failed');
          }
        } else {
          // New user - proceed to complete registration
          toast.success('Email verified! Complete your profile.');
        }
      } else {
        toast.error(data.detail || 'Invalid verification code');
        setEmailOtp(['', '', '', '', '', '']);
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!signupData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!signupData.password || signupData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupData.email.toLowerCase(),
          name: signupData.name,
          phone: signupData.phone || '',
          password: signupData.password,
          verification_token: emailVerificationToken
        })
      });
      
      const data = await res.json();
      
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('evara_token', data.token);
        localStorage.setItem('token', data.token);
        // Save patientId for subscription flow
        if (data.user?.id) {
          localStorage.setItem('patientId', data.user.id);
        }
        setUser(data.user);
        setShowSignup(false);
        resetSignupForm();
        toast.success('Account created successfully!');
        fetchProfile();
      } else {
        toast.error(data.detail || 'Registration failed');
      }
    } catch (error) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...emailOtp];
    newOtp[index] = value.slice(-1);
    setEmailOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`evara-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleEmailOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !emailOtp[index] && index > 0) {
      const prevInput = document.getElementById(`evara-otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const resetSignupForm = () => {
    setSignupData({ name: '', email: '', phone: '', password: '' });
    setEmailOtpSent(false);
    setEmailOtp(['', '', '', '', '', '']);
    setEmailVerificationToken('');
    setMockEmailOtp('');
    setLoginMode(false);
  };

  // OTP Resend Timer effect
  useEffect(() => {
    if (otpResendTimer > 0) {
      const timer = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTimer]);

  const fetchProfile = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/evara/profile`, { headers });
      const data = await res.json();
      
      if (data.has_profile) {
        setProfile(data.profile);
        setPrograms(data.programs || []);
      } else if (token) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await fetch(`${API_URL}/api/evara/programs`);
      const data = await res.json();
      if (!profile) {
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const fetchHomeServices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/evara/home-services`);
      const data = await res.json();
      setHomeServices(data.services || []);
    } catch (error) {
      console.error('Error fetching home services:', error);
    }
  };

  const fetchCommunitySessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/evara/community/sessions`);
      const data = await res.json();
      setCommunitySessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchPregnancyWeeks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/evara/pregnancy/all-weeks`);
      const data = await res.json();
      setPregnancyWeeks(data.weeks || []);
    } catch (error) {
      console.error('Error fetching pregnancy weeks:', error);
    }
  };

  const handleOnboarding = async () => {
    if (!onboardingData.age || !onboardingData.pregnancy_status || !onboardingData.menstrual_status) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const res = await fetch(`${API_URL}/api/evara/onboarding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...onboardingData,
          age: parseInt(onboardingData.age),
          weight: onboardingData.weight ? parseFloat(onboardingData.weight) : null,
          height: onboardingData.height ? parseFloat(onboardingData.height) : null
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setPrograms(data.assigned_programs || []);
        setShowOnboarding(false);
        toast.success('Welcome to Evara! Your wellness journey begins now.');
      }
    } catch (error) {
      toast.error('Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const res = await fetch(`${API_URL}/api/evara/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId
        })
      });
      
      const data = await res.json();
      setSessionId(data.session_id);
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/evara/reminders`, { headers });
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const createReminder = async () => {
    if (!newReminder.title || !newReminder.scheduled_date) {
      toast.error('Please fill in title and date');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/evara/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newReminder)
      });
      
      if (res.ok) {
        toast.success('Reminder created!');
        fetchReminders();
        setNewReminder({
          type: 'wellness_checkin',
          title: '',
          message: '',
          scheduled_date: '',
          scheduled_time: '09:00',
          is_recurring: false
        });
      }
    } catch (error) {
      toast.error('Failed to create reminder');
    }
  };

  const logPeriod = async () => {
    if (!periodData.start_date) {
      toast.error('Please select start date');
      return;
    }
    
    try {
      const params = new URLSearchParams({
        start_date: periodData.start_date,
        flow: periodData.flow,
        ...(periodData.notes && { notes: periodData.notes })
      });
      
      if (periodData.symptoms.length > 0) {
        periodData.symptoms.forEach(s => params.append('symptoms', s));
      }
      
      const res = await fetch(`${API_URL}/api/evara/period/log?${params}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Period logged! Next predicted: ${data.next_predicted}`);
        fetchPeriodHistory();
        setPeriodData({ start_date: '', flow: 'medium', symptoms: [], notes: '' });
      }
    } catch (error) {
      toast.error('Failed to log period');
    }
  };

  const fetchPeriodHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/evara/period/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPeriodHistory(data);
    } catch (error) {
      console.error('Error fetching period history:', error);
    }
  };

  // Calorie Tracker Functions
  const fetchFoodDatabase = async () => {
    try {
      const response = await fetch(`${API_URL}/api/calories/food-database`);
      const data = await response.json();
      setFoodDatabase(data.foods || {});
    } catch (error) {
      console.error('Failed to fetch food database');
    }
  };

  const fetchCalorieLogs = async (date = selectedDate) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/calories/logs?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCalorieLogs(data.logs || []);
      setDailyTotals(data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    } catch (error) {
      console.error('Failed to fetch calorie logs');
    }
  };

  const searchFoods = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/calories/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search failed');
    }
  };

  const addFoodToLog = async (food, mealType = 'other', quantity = 1) => {
    if (!token) {
      toast.error('Please login to track calories');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/calories/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          food_name: food.name,
          calories: food.calories,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
          fiber: food.fiber || 0,
          meal_type: mealType,
          quantity: quantity,
          date: selectedDate
        })
      });
      if (response.ok) {
        toast.success(`Added ${food.name}`);
        fetchCalorieLogs();
        setFoodSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      toast.error('Failed to log food');
    }
  };

  const deleteCalorieLog = async (logId) => {
    try {
      await fetch(`${API_URL}/api/calories/logs/${logId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCalorieLogs();
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Subscription Functions
  const fetchSubscriptionPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/evara/subscription/plans`);
      const data = await response.json();
      setSubscriptionPlans(data.plans || []);
    } catch (error) {
      console.error('Failed to fetch subscription plans');
    }
  };

  const fetchUserSubscription = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/evara/subscription/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setUserSubscription(data);
    } catch (error) {
      console.error('Failed to fetch user subscription');
    }
  };

  const handleSubscribe = async (planId) => {
    if (!token) {
      toast.error('Please login to subscribe');
      return;
    }
    setSubscriptionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/evara/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: planId,
          origin_url: window.location.origin
        })
      });
      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error(data.detail || 'Failed to create checkout');
      }
    } catch (error) {
      toast.error('Failed to start checkout');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Check payment status on page load (returning from Stripe)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentStatus = urlParams.get('payment');
    
    if (sessionId && paymentStatus === 'success') {
      checkPaymentStatus(sessionId);
    } else if (paymentStatus === 'cancelled') {
      toast.info('Payment was cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/evara/subscription/status/${sessionId}`);
      const data = await response.json();
      
      if (data.payment_status === 'paid') {
        toast.success(`🎉 Welcome to ${data.plan_name}! Your subscription is now active.`);
        fetchUserSubscription();
      } else {
        toast.info('Payment is being processed...');
      }
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.error('Failed to check payment status');
    }
  };

  // Fetch subscription status on load
  useEffect(() => {
    if (token) {
      fetchUserSubscription();
    }
  }, [token]);

  const getProgramIcon = (programId) => {
    const icons = {
      menstrual_health: <Calendar className="w-6 h-6 text-pink-500" />,
      pcos_hormonal: <Activity className="w-6 h-6 text-purple-500" />,
      pregnancy_support: <Baby className="w-6 h-6 text-blue-500" />,
      menopause_care: <Flower2 className="w-6 h-6 text-rose-500" />,
      wellness_community: <Users className="w-6 h-6 text-green-500" />
    };
    return icons[programId] || <Heart className="w-6 h-6 text-pink-500" />;
  };

  if (loading && !programs.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <img src="/icons/evara-logo.png" alt="Evara" className="h-24 w-auto object-contain" />
          <p className="mt-4 text-rose-600 font-medium">Loading your wellness space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-rose-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-rose-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-rose-600" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/evara-logo.png" alt="Evara" className="h-10 sm:h-12 w-auto object-contain" />
            <div>
              <h1 className="font-semibold text-rose-800" style={{ fontFamily: 'Outfit, sans-serif' }}>Evara</h1>
              <p className="text-xs text-rose-500">Women's Wellness</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={logout} className="text-xs text-rose-500 hover:text-rose-700 transition-colors">
                Logout
              </button>
            ) : (
              <button 
                onClick={() => setShowSignup(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium rounded-full hover:from-rose-600 hover:to-pink-600 shadow-md"
              >
                Sign Up
              </button>
            )}
            <button 
              onClick={() => setShowChat(true)}
              className="p-2 bg-rose-100 hover:bg-rose-200 rounded-full transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-rose-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <SubscriptionGate
          planType="evara"
          patientId={user?.id || user?.patient_id || localStorage.getItem('patientId')}
          patientName={user?.name}
          patientPhone={user?.phone}
          patientEmail={user?.email}
        >
        {/* Welcome Section */}
        {user && (
          <Card className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 text-white border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-full">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Welcome, {user.name}!</h2>
                  <p className="text-white/80 text-sm">Your personalized wellness journey continues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!effectiveUser && (
          <Card className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 text-white border-0 shadow-xl rounded-3xl">
            <CardContent className="p-6 text-center">
              <Heart className="w-12 h-12 mx-auto mb-3" />
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Welcome to Evara</h2>
              <p className="text-white/80 text-sm mb-4">Your trusted women's wellness companion</p>
              <Button 
                onClick={() => setShowSignup(true)}
                className="bg-white text-rose-600 hover:bg-rose-50 font-semibold rounded-full px-6"
              >
                Create Your Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search Box */}
        <Card className="p-4 rounded-2xl border-0 shadow-md bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-400 w-5 h-5" />
            <Input
              placeholder="Search features, pregnancy info, period tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-10 py-3 rounded-xl border-rose-200 focus:border-rose-500 focus:ring-rose-500/20 text-base"
              data-testid="evara-search"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Search Results */}
          {searchTerm && (
            <div className="mt-3 space-y-2">
              {/* Filter and show matching features */}
              {[
                { name: 'Chat with Evara', desc: 'AI wellness assistant', icon: '💬', action: () => setShowChat(true), keywords: ['chat', 'talk', 'ask', 'ai', 'help', 'question'] },
                { name: 'Pregnancy Calculator', desc: 'Due date & trimester', icon: '🤰', action: () => setShowPregnancyCalc(true), keywords: ['pregnancy', 'pregnant', 'due date', 'trimester', 'baby', 'conception'] },
                { name: 'Reminders', desc: 'Medicine & appointment alerts', icon: '🔔', action: () => { setShowReminders(true); fetchReminders(); }, keywords: ['reminder', 'alert', 'medicine', 'appointment', 'notify'] },
                { name: 'Period Tracker', desc: 'Log & predict cycles', icon: '🩸', action: () => { setShowPeriodLog(true); if(token) fetchPeriodHistory(); }, keywords: ['period', 'cycle', 'menstrual', 'menstruation', 'track', 'log'] },
                { name: 'Calorie Tracker', desc: 'Indian foods database', icon: '🥗', action: () => { setShowCaloriesTracker(true); fetchFoodDatabase(); if(token) fetchCalorieLogs(); }, keywords: ['calorie', 'food', 'diet', 'weight', 'nutrition', 'indian'] },
                { name: 'Week-by-Week Guide', desc: 'Pregnancy journey', icon: '👶', action: () => { setShowPregnancyWeeks(true); fetchPregnancyWeeks(); }, keywords: ['week', 'pregnancy', 'baby', 'development', 'trimester', 'fetus'] },
                { name: 'PMS Guide', desc: 'Symptoms & relief tips', icon: '📖', action: () => setShowPMSEducation(true), keywords: ['pms', 'premenstrual', 'cramp', 'mood', 'bloating', 'symptom'] },
                { name: 'PCOS Guide', desc: 'Management & diet tips', icon: '📚', action: () => setShowPCOSEducation(true), keywords: ['pcos', 'polycystic', 'ovary', 'hormone', 'irregular'] },
                { name: 'Menopause Guide', desc: 'Transition & wellness', icon: '🌸', action: () => setShowMenopauseGuide(true), keywords: ['menopause', 'hot flash', 'hormone', 'transition', 'perimenopause'] },
              ].filter(item => 
                item.keywords.some(kw => kw.includes(searchTerm.toLowerCase())) ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.desc.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => { item.action(); setSearchTerm(''); }}
                  className="w-full flex items-center gap-3 p-3 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-left"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-rose-400" />
                </button>
              ))}
              
              {/* No results message */}
              {[
                { keywords: ['chat', 'talk', 'ask', 'ai', 'help', 'question'] },
                { keywords: ['pregnancy', 'pregnant', 'due date', 'trimester', 'baby', 'conception'] },
                { keywords: ['reminder', 'alert', 'medicine', 'appointment', 'notify'] },
                { keywords: ['period', 'cycle', 'menstrual', 'menstruation', 'track', 'log'] },
                { keywords: ['calorie', 'food', 'diet', 'weight', 'nutrition', 'indian'] },
                { keywords: ['week', 'pregnancy', 'baby', 'development', 'trimester', 'fetus'] },
                { keywords: ['pms', 'premenstrual', 'cramp', 'mood', 'bloating', 'symptom'] },
                { keywords: ['pcos', 'polycystic', 'ovary', 'hormone', 'irregular'] },
                { keywords: ['menopause', 'hot flash', 'hormone', 'transition', 'perimenopause'] },
              ].every(item => !item.keywords.some(kw => kw.includes(searchTerm.toLowerCase()))) && 
              !['chat with evara', 'pregnancy calculator', 'reminders', 'period tracker', 'calorie tracker', 'week-by-week guide', 'pms guide', 'pcos guide', 'menopause guide'].some(n => n.includes(searchTerm.toLowerCase())) && (
                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-xl">
                  <p className="text-sm">No results for "{searchTerm}"</p>
                  <p className="text-xs mt-1">Try: pregnancy, period, pcos, calorie, reminder</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Quick Actions - 3x2 on desktop, 2x3 on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button 
            onClick={() => setShowChat(true)}
            className="p-4 bg-white rounded-2xl shadow-md border border-rose-100 hover:border-rose-300 hover:shadow-lg transition-all flex flex-col items-center gap-2 group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">💬</span>
            </div>
            <span className="text-xs font-medium text-rose-700">Chat with Evara</span>
          </button>
          <button 
            onClick={() => { setShowPregnancyCalc(true); }}
            className="p-4 bg-white rounded-2xl shadow-md border border-rose-100 hover:border-rose-300 hover:shadow-lg transition-all flex flex-col items-center gap-2 group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">🤰</span>
            </div>
            <span className="text-xs font-medium text-rose-700">Pregnancy Calc</span>
          </button>
          <button 
            onClick={() => { setShowReminders(true); fetchReminders(); }}
            className="p-4 bg-white rounded-2xl shadow-md border border-rose-100 hover:border-rose-300 hover:shadow-lg transition-all flex flex-col items-center gap-2 group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">🔔</span>
            </div>
            <span className="text-xs font-medium text-rose-700">Reminders</span>
          </button>
          <button 
            onClick={() => { setShowPeriodLog(true); if(token) fetchPeriodHistory(); }}
            className="p-4 bg-white rounded-2xl shadow-md border border-rose-100 hover:border-rose-300 hover:shadow-lg transition-all flex flex-col items-center gap-2 group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">🩸</span>
            </div>
            <span className="text-xs font-medium text-rose-700">Period Tracker</span>
          </button>
          <button 
            onClick={() => { 
              setShowCaloriesTracker(true); 
              fetchFoodDatabase(); 
              if(token) fetchCalorieLogs(); 
            }}
            className="p-4 bg-white rounded-2xl shadow-md border border-rose-100 hover:border-rose-300 hover:shadow-lg transition-all flex flex-col items-center gap-2 group"
            data-testid="evara-calorie-tracker-btn"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">🥗</span>
            </div>
            <span className="text-xs font-medium text-rose-700">Calorie Tracker</span>
          </button>
          <button 
            onClick={() => { setShowPregnancyWeeks(true); fetchPregnancyWeeks(); }}
            className="p-4 bg-white rounded-2xl shadow-md border border-rose-100 hover:border-rose-300 hover:shadow-lg transition-all flex flex-col items-center gap-2 group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">👶</span>
            </div>
            <span className="text-xs font-medium text-rose-700 text-center">Week-by-Week</span>
          </button>
        </div>

        {/* Subscription Banner */}
        {effectiveToken && !userSubscription?.has_subscription && !isStaffLoggedIn && (
          <Card 
            className="bg-gradient-to-r from-pink-500 to-rose-500 border-0 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => { setShowSubscription(true); fetchSubscriptionPlans(); }}
            data-testid="subscription-banner"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="text-white">
                  <p className="font-semibold">Upgrade to Premium</p>
                  <p className="text-sm opacity-90">Unlock all features & AI chat</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white" />
            </CardContent>
          </Card>
        )}

        {/* Staff Access Badge */}
        {isStaffLoggedIn && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800">Staff Access</p>
                  <p className="text-sm text-amber-600">Welcome, {effectiveUser?.name}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-500 text-white text-xs font-medium rounded-full uppercase">
                {effectiveUser?.staffRole?.replace('_', ' ')}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Active Subscription Badge */}
        {userSubscription?.has_subscription && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">{userSubscription.subscription?.plan_name}</p>
                  <p className="text-sm text-green-600">{userSubscription.subscription?.days_remaining} days remaining</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">Active</span>
            </CardContent>
          </Card>
        )}

        {/* Education Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setShowPMSEducation(true)}
            className="p-4 bg-gradient-to-r from-pink-100 to-rose-100 rounded-xl border border-pink-200 hover:shadow-md transition-all flex items-center gap-3"
          >
            <BookOpen className="w-8 h-8 text-pink-600" />
            <div className="text-left">
              <p className="font-medium text-gray-800">PMS Guide</p>
              <p className="text-xs text-gray-500">Understand & manage PMS</p>
            </div>
          </button>
          <button 
            onClick={() => setShowPCOSEducation(true)}
            className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl border border-purple-200 hover:shadow-md transition-all flex items-center gap-3"
          >
            <Activity className="w-8 h-8 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-800">PCOS Guide</p>
              <p className="text-xs text-gray-500">Diet, exercise & more</p>
            </div>
          </button>
        </div>

        {/* My Programs */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Programs</h3>
          <div className="space-y-3">
            {programs.map((program) => (
              <Card 
                key={program.id} 
                className="cursor-pointer hover:shadow-md transition-all border-pink-100"
                onClick={() => {
                  if (program.id === 'menstrual_health') {
                    setShowPeriodLog(true);
                    if(token) fetchPeriodHistory();
                  } else if (program.id === 'pcos_hormonal') {
                    setShowPCOSEducation(true);
                  } else if (program.id === 'pregnancy_support') {
                    setShowPregnancyEducation(true);
                  } else if (program.id === 'menopause_care') {
                    setShowMenopauseGuide(true);
                  } else if (program.id === 'wellness_community') {
                    setShowWomenCommunity(true);
                  } else {
                    setActiveProgram(program.id);
                  }
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 rounded-lg">
                      {getProgramIcon(program.id)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{program.name}</h4>
                      <p className="text-sm text-gray-500">{program.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Disclaimer:</strong> Evara provides wellness education and support. 
              It does not replace professional medical consultation. For any health concerns, 
              please consult a healthcare provider.
            </p>
          </CardContent>
        </Card>
        </SubscriptionGate>
      </main>

      {/* Signup/Login Dialog with Email OTP */}
      <Dialog open={showSignup} onOpenChange={(open) => {
        if (!open) resetSignupForm();
        setShowSignup(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              {emailOtpSent && !emailVerificationToken ? 'Verify Email' : 
               emailVerificationToken ? 'Complete Profile' : 
               loginMode ? 'Welcome Back' : 'Join Evara'}
            </DialogTitle>
            <DialogDescription>
              {emailOtpSent && !emailVerificationToken ? 
                `Enter the 6-digit code sent to ${signupData.email}` :
               emailVerificationToken ? 
                'Finish setting up your account' :
               loginMode ?
                'Login with your email to continue' :
                'Verify your email to start your wellness journey'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Step 1: Email Input */}
            {!emailOtpSent && (
              <>
                <div>
                  <Label>Email Address *</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input 
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      data-testid="evara-email-input"
                      onKeyDown={(e) => e.key === 'Enter' && sendEmailOtp()}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {loginMode ? 'We will send a login code to your email' : 'We will send a verification code to your email'}
                  </p>
                </div>
                
                <Button 
                  onClick={sendEmailOtp}
                  className="w-full bg-pink-500 hover:bg-pink-600"
                  disabled={emailOtpLoading || !signupData.email}
                  data-testid="evara-send-otp-btn"
                >
                  {emailOtpLoading ? 'Sending...' : loginMode ? 'Send Login Code' : 'Continue with Email'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or</span>
                  </div>
                </div>
                
                <Button 
                  variant="outline"
                  onClick={() => setLoginMode(!loginMode)}
                  className="w-full"
                  data-testid="evara-toggle-login-btn"
                >
                  {loginMode ? 'Create New Account' : 'Login with Email'}
                </Button>
              </>
            )}

            {/* Step 2: OTP Verification */}
            {emailOtpSent && !emailVerificationToken && (
              <>
                <div>
                  <Label>Verification Code</Label>
                  <div className="flex gap-2 mt-2 justify-center">
                    {emailOtp.map((digit, idx) => (
                      <Input
                        key={idx}
                        id={`evara-otp-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleEmailOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleEmailOtpKeyDown(idx, e)}
                        className="w-10 h-12 text-center text-lg font-mono"
                        data-testid={`evara-otp-input-${idx}`}
                      />
                    ))}
                  </div>
                  {mockEmailOtp && (
                    <p className="text-xs text-center text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                      Demo OTP: <strong>{mockEmailOtp}</strong>
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={verifyEmailOtp}
                  className="w-full bg-pink-500 hover:bg-pink-600"
                  disabled={emailOtpLoading || emailOtp.join('').length !== 6}
                  data-testid="evara-verify-otp-btn"
                >
                  {emailOtpLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
                
                <div className="flex justify-between items-center text-sm">
                  <button 
                    onClick={() => setEmailOtpSent(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ← Change Email
                  </button>
                  {otpResendTimer > 0 ? (
                    <span className="text-gray-400">Resend in {otpResendTimer}s</span>
                  ) : (
                    <button 
                      onClick={sendEmailOtp}
                      className="text-pink-600 hover:underline"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Complete Registration */}
            {emailVerificationToken && (
              <>
                <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700">Email verified: {signupData.email}</span>
                </div>
                
                <div>
                  <Label>Full Name *</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input 
                      placeholder="Your name"
                      className="pl-10"
                      value={signupData.name}
                      onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                      data-testid="evara-name-input"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Phone Number (Optional)</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input 
                      placeholder="10-digit mobile number"
                      className="pl-10"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                      data-testid="evara-phone-input"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Password *</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input 
                      type="password"
                      placeholder="Create a password (min 6 characters)"
                      className="pl-10"
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      data-testid="evara-password-input"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={completeRegistration}
                  className="w-full bg-pink-500 hover:bg-pink-600"
                  disabled={loading}
                  data-testid="evara-complete-signup-btn"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </>
            )}
            
            <p className="text-xs text-center text-gray-400">
              This account works with Nevika Cura app too!
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Personalize Your Journey
            </DialogTitle>
            <DialogDescription>
              Help us understand you better to provide personalized wellness support.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Age *</Label>
              <Input 
                type="number" 
                placeholder="Your age"
                value={onboardingData.age}
                onChange={(e) => setOnboardingData({...onboardingData, age: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Pregnancy Status *</Label>
              <Select 
                value={onboardingData.pregnancy_status}
                onValueChange={(v) => setOnboardingData({...onboardingData, pregnancy_status: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Not Pregnant</SelectItem>
                  <SelectItem value="yes">Currently Pregnant</SelectItem>
                  <SelectItem value="planning">Planning Pregnancy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Menstrual Status *</Label>
              <Select 
                value={onboardingData.menstrual_status}
                onValueChange={(v) => setOnboardingData({...onboardingData, menstrual_status: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Periods</SelectItem>
                  <SelectItem value="irregular">Irregular Periods</SelectItem>
                  <SelectItem value="menopausal">Menopausal/Post-Menopausal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Known Conditions (Optional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {conditions.map((condition) => (
                  <label key={condition} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-full">
                    <Checkbox 
                      checked={onboardingData.known_conditions.includes(condition)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setOnboardingData({...onboardingData, known_conditions: [...onboardingData.known_conditions, condition]});
                        } else {
                          setOnboardingData({...onboardingData, known_conditions: onboardingData.known_conditions.filter(c => c !== condition)});
                        }
                      }}
                    />
                    {condition}
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Wellness Goals (Optional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {goals.map((goal) => (
                  <label key={goal} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-full">
                    <Checkbox 
                      checked={onboardingData.lifestyle_goals.includes(goal)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setOnboardingData({...onboardingData, lifestyle_goals: [...onboardingData.lifestyle_goals, goal]});
                        } else {
                          setOnboardingData({...onboardingData, lifestyle_goals: onboardingData.lifestyle_goals.filter(g => g !== goal)});
                        }
                      }}
                    />
                    {goal}
                  </label>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={handleOnboarding} 
              className="w-full bg-pink-500 hover:bg-pink-600"
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Start My Journey'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b bg-gradient-to-r from-pink-500 to-purple-500 text-white">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat with Evara
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Your compassionate wellness companion
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Heart className="w-12 h-12 mx-auto text-pink-300 mb-2" />
                  <p>Hi! I'm Evara, your wellness companion.</p>
                  <p className="text-sm">Ask me anything about women's health!</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {['Period pain relief', 'PCOS diet tips', 'Pregnancy nutrition', 'Menopause support'].map((q) => (
                      <button 
                        key={q}
                        onClick={() => { setChatInput(q); }}
                        className="text-xs bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full hover:bg-pink-200"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-pink-500 text-white rounded-br-sm' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t flex gap-2">
            <Input 
              placeholder="Type your message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              className="flex-1"
            />
            <Button 
              onClick={sendChatMessage} 
              disabled={chatLoading || !chatInput.trim()}
              className="bg-pink-500 hover:bg-pink-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pregnancy Calculator Dialog */}
      <Dialog open={showPregnancyCalc} onOpenChange={setShowPregnancyCalc}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-blue-500" />
              Pregnancy Calculator
            </DialogTitle>
            <DialogDescription>
              Calculate your due date and track your pregnancy week
            </DialogDescription>
          </DialogHeader>
          <PregnancyCalculator />
        </DialogContent>
      </Dialog>

      {/* PMS Education Dialog */}
      <Dialog open={showPMSEducation} onOpenChange={setShowPMSEducation}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-pink-500" />
                {PMS_EDUCATION.title}
              </DialogTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => shareOnWhatsApp('pms_guide')}
                className="text-green-600 border-green-300 hover:bg-green-50"
                data-testid="share-pms-btn"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <p className="text-gray-700 leading-relaxed">{PMS_EDUCATION.overview}</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Physical Symptoms</h4>
              <ul className="space-y-2">
                {PMS_EDUCATION.symptoms.physical.map((symptom, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-pink-500 mt-1">•</span>
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Emotional Symptoms</h4>
              <ul className="space-y-2">
                {PMS_EDUCATION.symptoms.emotional.map((symptom, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-purple-500 mt-1">•</span>
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
            
            {PMS_EDUCATION.management.map((section, idx) => (
              <Card key={idx} className="bg-pink-50 border-pink-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-pink-800 mb-2">{section.title}</h4>
                  <ul className="space-y-1.5">
                    {section.tips.map((tip, tidx) => (
                      <li key={tidx} className="text-sm text-pink-700 flex items-start gap-2">
                        <span>✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* PCOS Education Dialog */}
      <Dialog open={showPCOSEducation} onOpenChange={setShowPCOSEducation}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {PCOS_EDUCATION.title}
              </DialogTitle>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => shareOnWhatsApp('pcos_guide')}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                data-testid="share-pcos-btn"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start px-4 pt-2 bg-gray-50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="diet">Diet Plan</TabsTrigger>
              <TabsTrigger value="exercise">Exercise</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="p-4 space-y-4">
              <p className="text-gray-700 leading-relaxed">{PCOS_EDUCATION.overview}</p>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Common Symptoms</h4>
                <div className="grid grid-cols-1 gap-2">
                  {PCOS_EDUCATION.symptoms.map((symptom, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-600 bg-purple-50 p-2 rounded-lg">
                      <Info className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      {symptom}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Diagnosis Methods</h4>
                <ul className="space-y-2">
                  {PCOS_EDUCATION.diagnosis.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-purple-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="diet" className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <Apple className="w-5 h-5" />
                  {PCOS_EDUCATION.dietPlan.title}
                </h4>
                <div className="space-y-2 mb-4">
                  {PCOS_EDUCATION.dietPlan.principles.map((p, idx) => (
                    <p key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      {p}
                    </p>
                  ))}
                </div>
              </div>
              
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <h5 className="font-medium text-green-800 mb-3">Foods to Include</h5>
                  {PCOS_EDUCATION.dietPlan.foods_to_include.map((food, idx) => (
                    <div key={idx} className="mb-2">
                      <p className="text-sm font-medium text-green-700">{food.category}</p>
                      <p className="text-xs text-green-600">{food.items}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <h5 className="font-medium text-red-800 mb-2">Foods to Limit</h5>
                  <ul className="space-y-1">
                    {PCOS_EDUCATION.dietPlan.foods_to_limit.map((food, idx) => (
                      <li key={idx} className="text-sm text-red-600 flex items-start gap-2">
                        <span>✗</span>
                        {food}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <h5 className="font-medium text-amber-800 mb-2">Sample Day Meal Plan</h5>
                  <div className="space-y-2 text-sm">
                    <p><strong className="text-amber-700">Breakfast:</strong> {PCOS_EDUCATION.dietPlan.sample_day.breakfast}</p>
                    <p><strong className="text-amber-700">Mid-Morning:</strong> {PCOS_EDUCATION.dietPlan.sample_day.mid_morning}</p>
                    <p><strong className="text-amber-700">Lunch:</strong> {PCOS_EDUCATION.dietPlan.sample_day.lunch}</p>
                    <p><strong className="text-amber-700">Snack:</strong> {PCOS_EDUCATION.dietPlan.sample_day.snack}</p>
                    <p><strong className="text-amber-700">Dinner:</strong> {PCOS_EDUCATION.dietPlan.sample_day.dinner}</p>
                    <p><strong className="text-amber-700">Evening:</strong> {PCOS_EDUCATION.dietPlan.sample_day.evening}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="exercise" className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5" />
                  {PCOS_EDUCATION.exercisePlan.title}
                </h4>
                <div className="space-y-1 mb-4">
                  {PCOS_EDUCATION.exercisePlan.benefits.map((b, idx) => (
                    <p key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      {b}
                    </p>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-800 mb-3">Weekly Exercise Plan</h5>
                <div className="space-y-3">
                  {PCOS_EDUCATION.exercisePlan.weekly_plan.map((day, idx) => (
                    <Card key={idx} className={`border-l-4 ${day.day === 'Sunday' ? 'border-l-gray-300 bg-gray-50' : 'border-l-purple-400'}`}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">{day.day}</p>
                            <p className="text-sm text-purple-600">{day.activity}</p>
                          </div>
                          <span className="text-xs text-gray-500">{day.duration}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{day.details}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h5 className="font-medium text-blue-800 mb-2">Pro Tips</h5>
                  <ul className="space-y-1">
                    {PCOS_EDUCATION.exercisePlan.tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                        <span>💡</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Period Tracker Dialog */}
      <Dialog open={showPeriodLog} onOpenChange={setShowPeriodLog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-500" />
              Period Tracker
            </DialogTitle>
            <DialogDescription>
              Track your cycle and get predictions
            </DialogDescription>
          </DialogHeader>
          
          {token ? (
            <Tabs defaultValue="log" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="log">Log</TabsTrigger>
                <TabsTrigger value="tips">Tips</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="pms">PMS</TabsTrigger>
              </TabsList>
              
              <TabsContent value="log" className="space-y-4 pt-4">
                <div>
                  <Label>Period Start Date</Label>
                  <Input 
                    type="date"
                    value={periodData.start_date}
                    onChange={(e) => setPeriodData({...periodData, start_date: e.target.value})}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <Label>Flow Intensity</Label>
                  <Select 
                    value={periodData.flow}
                    onValueChange={(v) => setPeriodData({...periodData, flow: v})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="heavy">Heavy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Symptoms</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {symptoms.map((symptom) => (
                      <label key={symptom} className="flex items-center gap-1.5 text-sm bg-rose-50 px-3 py-1.5 rounded-full">
                        <Checkbox 
                          checked={periodData.symptoms.includes(symptom)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPeriodData({...periodData, symptoms: [...periodData.symptoms, symptom]});
                            } else {
                              setPeriodData({...periodData, symptoms: periodData.symptoms.filter(s => s !== symptom)});
                            }
                          }}
                        />
                        {symptom}
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Notes (Optional)</Label>
                  <Input 
                    placeholder="Any additional notes..."
                    value={periodData.notes}
                    onChange={(e) => setPeriodData({...periodData, notes: e.target.value})}
                  />
                </div>
                
                <Button onClick={logPeriod} className="w-full bg-rose-500 hover:bg-rose-600">
                  Log Period
                </Button>
              </TabsContent>
              
              {/* Cycle Tips Tab */}
              <TabsContent value="tips" className="space-y-4 pt-4">
                <ScrollArea className="h-[350px] pr-4">
                  {PERIOD_TRACKING_TIPS.map((phase, idx) => (
                    <Card key={idx} className="mb-3 border-rose-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-rose-600">{phase.phase}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Tips:</p>
                          <ul className="text-xs space-y-0.5">
                            {phase.tips.map((tip, i) => (
                              <li key={i} className="text-gray-600">• {tip}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                          <p className="text-xs font-medium text-green-700">🍎 Nutrition:</p>
                          <p className="text-xs text-green-600">{phase.nutrition}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
                <Button 
                  onClick={() => shareOnWhatsApp('pms_guide')}
                  variant="outline"
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" /> Share Tips on WhatsApp
                </Button>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4 pt-4">
                {periodHistory.next_predicted && (
                  <Card className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm opacity-80">Next Period Predicted</p>
                      <p className="text-2xl font-bold">{periodHistory.next_predicted}</p>
                      <p className="text-sm opacity-80 mt-1">Average cycle: {periodHistory.average_cycle_length} days</p>
                    </CardContent>
                  </Card>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Recent Periods</h4>
                  {periodHistory.history?.length > 0 ? (
                    <div className="space-y-2">
                      {periodHistory.history.map((log, idx) => (
                        <Card key={idx} className="bg-rose-50 border-rose-200">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-rose-800">{log.start_date}</p>
                                <p className="text-xs text-rose-600">Flow: {log.flow}</p>
                              </div>
                              {log.symptoms?.length > 0 && (
                                <p className="text-xs text-rose-500">{log.symptoms.length} symptoms</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No periods logged yet</p>
                  )}
                  {/* Share Period Report Button */}
                  {periodHistory.history?.length > 0 && (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => shareOnWhatsApp('period_report', token, API_URL)}
                        className="w-full mt-3 border-rose-300 text-rose-600 hover:bg-rose-50"
                        data-testid="share-period-report-btn"
                      >
                        <Share2 className="w-4 h-4 mr-2" /> Share Report via WhatsApp
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          if (!token) {
                            toast.error('Please login to download PDF');
                            return;
                          }
                          window.open(`${API_URL}/api/evara/download-pdf?token=${token}`, '_blank');
                          toast.success('Downloading PDF report...');
                        }}
                        className="w-full mt-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                        data-testid="download-evara-pdf-btn"
                      >
                        <FileDown className="w-4 h-4 mr-2" /> Download PDF Report
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="pms" className="pt-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">{PMS_EDUCATION.overview.substring(0, 200)}...</p>
                  <Button 
                    onClick={() => { setShowPeriodLog(false); setShowPMSEducation(true); }}
                    className="w-full bg-pink-500 hover:bg-pink-600"
                  >
                    Read Full PMS Guide
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 mx-auto text-rose-200 mb-4" />
              <p className="text-gray-600 mb-4">Sign up to track your period and get cycle predictions</p>
              <Button 
                onClick={() => { setShowPeriodLog(false); setShowSignup(true); }}
                className="bg-rose-500 hover:bg-rose-600"
              >
                Sign Up Now
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Week-by-Week Pregnancy Guide Dialog */}
      <Dialog open={showPregnancyWeeks} onOpenChange={setShowPregnancyWeeks}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-blue-500" />
                Week-by-Week Pregnancy Guide
              </DialogTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => shareOnWhatsApp('pregnancy_tips')}
                className="text-green-600 border-green-300 hover:bg-green-50"
                data-testid="share-pregnancy-btn"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
            <DialogDescription>
              Track your baby's development from week 1 to 42
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(85vh - 120px)' }}>
            {selectedWeek ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedWeek(null)}
                  className="mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to all weeks
                </Button>
                
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl">
                  <h3 className="text-xl font-bold text-blue-800 mb-2">{selectedWeek.title}</h3>
                  <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm mb-4">
                    Baby size: {selectedWeek.size}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Card className="border-pink-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-pink-600 flex items-center gap-2">
                        <Baby className="w-4 h-4" /> Baby's Development
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{selectedWeek.baby}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-purple-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-purple-600 flex items-center gap-2">
                        <Heart className="w-4 h-4" /> Mom's Changes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{selectedWeek.mom}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-amber-600 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Tip of the Week
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{selectedWeek.tip}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => {
                      const week1 = document.querySelector('[data-week="1"]');
                      if (week1) week1.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-center p-2 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors cursor-pointer border border-pink-200"
                  >
                    <p className="text-xs text-pink-600">1st Trimester</p>
                    <p className="font-semibold text-pink-800">Weeks 1-12</p>
                  </button>
                  <button
                    onClick={() => {
                      const week13 = document.querySelector('[data-week="13"]');
                      if (week13) week13.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-center p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer border border-purple-200"
                  >
                    <p className="text-xs text-purple-600">2nd Trimester</p>
                    <p className="font-semibold text-purple-800">Weeks 13-27</p>
                  </button>
                  <button
                    onClick={() => {
                      const week28 = document.querySelector('[data-week="28"]');
                      if (week28) week28.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
                  >
                    <p className="text-xs text-blue-600">3rd Trimester</p>
                    <p className="font-semibold text-blue-800">Weeks 28-42</p>
                  </button>
                </div>
                
                {pregnancyWeeks.map((week) => (
                  <button
                    key={week.week}
                    data-week={week.week}
                    onClick={() => setSelectedWeek(week)}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                      week.week <= 12 ? 'border-pink-200 hover:bg-pink-50' :
                      week.week <= 27 ? 'border-purple-200 hover:bg-purple-50' :
                      'border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{week.title}</p>
                        <p className="text-xs text-gray-500">Size: {week.size}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Home Services Dialog */}
      <Dialog open={showHomeServices} onOpenChange={setShowHomeServices}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-green-500" />
              Home Services
            </DialogTitle>
            <DialogDescription>
              Professional healthcare services at your doorstep
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {homeServices.map((service) => (
                <Card key={service.id} className="border-green-200 hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {service.id === 'postnatal_nurse' && <Heart className="w-4 h-4 text-pink-500" />}
                      {service.id === 'lactation_consultant' && <Baby className="w-4 h-4 text-blue-500" />}
                      {service.id === 'physiotherapy' && <Activity className="w-4 h-4 text-purple-500" />}
                      {service.id === 'sample_collection' && <MapPin className="w-4 h-4 text-green-500" />}
                      {service.name}
                    </CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {service.includes.map((item, idx) => (
                        <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.duration}
                      </span>
                      {service.redirect ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => { setShowHomeServices(false); navigate(service.redirect); }}
                          className="text-green-600 border-green-300"
                        >
                          Book Now <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => toast.info('Our team will contact you within 24 hours. Call 9403890429 for immediate assistance.')}
                        >
                          Request Service
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 italic">{service.note}</p>
                  </CardContent>
                </Card>
              ))}
              
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Important Note</p>
                      <p className="text-xs text-amber-700">
                        These services are coordinated through our partner healthcare providers. Evara facilitates booking but does not directly provide medical services.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Community Sessions Dialog */}
      <Dialog open={showCommunity} onOpenChange={setShowCommunity}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-500" />
              Live Sessions & Community
            </DialogTitle>
            <DialogDescription>
              Learn from experts and connect with other women
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Upcoming Live Session */}
              <Card className="bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-amber-800">Upcoming Live Session</CardTitle>
                    <span className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-gray-800">Monthly Q&A with Gynecologist</p>
                  <p className="text-sm text-gray-600">Submit your questions and get answers from our expert</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-amber-700">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Last Saturday of every month</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 11:00 AM IST</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Recorded Sessions */}
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <PlayCircle className="w-4 h-4" /> Recorded Sessions
              </h4>
              
              {communitySessions.map((session) => (
                <Card key={session.id} className="border-gray-200 hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{session.title}</CardTitle>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {session.duration}
                      </span>
                    </div>
                    <CardDescription>{session.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-gray-500">Hosted by: {session.host}</p>
                    <div className="flex flex-wrap gap-1">
                      {session.topics.map((topic, idx) => (
                        <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          {topic}
                        </span>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-2 bg-amber-500 hover:bg-amber-600"
                      onClick={() => toast.success(`Registered for ${session.title}! You'll receive access details via SMS.`)}
                    >
                      <PlayCircle className="w-4 h-4 mr-2" /> Watch Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Reminders Dialog */}
      <Dialog open={showReminders} onOpenChange={setShowReminders}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-500" />
              Wellness Reminders
            </DialogTitle>
          </DialogHeader>
          
          {token ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <Input 
                  placeholder="Reminder title (e.g., Take vitamins)"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                />
                <Input 
                  type="date"
                  value={newReminder.scheduled_date}
                  onChange={(e) => setNewReminder({...newReminder, scheduled_date: e.target.value})}
                />
                <Button onClick={createReminder} className="w-full bg-purple-500 hover:bg-purple-600">
                  <Plus className="w-4 h-4 mr-2" /> Add Reminder
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Your Reminders</h4>
                {reminders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No reminders yet</p>
                ) : (
                  reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <div>
                          <p className="font-medium text-sm">{reminder.title}</p>
                          <p className="text-xs text-gray-500">{reminder.scheduled_date}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="w-16 h-16 mx-auto text-purple-200 mb-4" />
              <p className="text-gray-600 mb-4">Sign up to set wellness reminders</p>
              <Button 
                onClick={() => { setShowReminders(false); setShowSignup(true); }}
                className="bg-purple-500 hover:bg-purple-600"
              >
                Sign Up Now
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pregnancy Education Dialog */}
      <Dialog open={showPregnancyEducation} onOpenChange={setShowPregnancyEducation}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Baby className="w-5 h-5" /> {PREGNANCY_EDUCATION.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Pregnancy Calculator Quick Access */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-800">Pregnancy Calculator</h4>
                      <p className="text-sm text-blue-600">Calculate your due date and track progress</p>
                    </div>
                    <Button 
                      onClick={() => { setShowPregnancyEducation(false); setShowPregnancyCalc(true); }}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Calculator className="w-4 h-4 mr-2" /> Calculate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Trimester Guides */}
              <Tabs defaultValue="1">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="1">1st Trimester</TabsTrigger>
                  <TabsTrigger value="2">2nd Trimester</TabsTrigger>
                  <TabsTrigger value="3">3rd Trimester</TabsTrigger>
                </TabsList>
                {PREGNANCY_EDUCATION.trimester_guides.map((tri) => (
                  <TabsContent key={tri.trimester} value={String(tri.trimester)} className="space-y-4 mt-4">
                    <h3 className="text-lg font-semibold text-gray-800">{tri.title}</h3>
                    <p className="text-gray-600">{tri.overview}</p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="border-blue-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-blue-600">Baby's Development</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            {tri.baby_development.map((dev, i) => (
                              <li key={i} className="text-gray-600">• {dev}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-pink-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-pink-600">Mom's Changes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            {tri.mom_changes.map((change, i) => (
                              <li key={i} className="text-gray-600">• {change}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-600">Tips & Advice</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          {tri.tips.map((tip, i) => (
                            <li key={i} className="text-gray-600">✓ {tip}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-orange-200 bg-orange-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-orange-600">Diet Tips</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          {tri.diet_tips.map((tip, i) => (
                            <li key={i} className="text-gray-600">🍎 {tip}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>

              {/* Important Tests */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Important Tests During Pregnancy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {PREGNANCY_EDUCATION.important_tests.map((test, i) => (
                      <div key={i} className="flex justify-between items-start py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-gray-800">{test.test}</p>
                          <p className="text-xs text-gray-500">{test.purpose}</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{test.when}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Warning Signs */}
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-base text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Warning Signs - Seek Help Immediately
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-red-700">
                    {PREGNANCY_EDUCATION.warning_signs.map((sign, i) => (
                      <li key={i}>⚠️ {sign}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Menopause Guide Dialog */}
      <Dialog open={showMenopauseGuide} onOpenChange={setShowMenopauseGuide}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Flower2 className="w-5 h-5" /> {MENOPAUSE_CONTENT.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Overview */}
              <p className="text-gray-600">{MENOPAUSE_CONTENT.overview}</p>

              {/* Stages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stages of Menopause</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {MENOPAUSE_CONTENT.stages.map((stage, i) => (
                    <div key={i} className="border-l-4 border-rose-300 pl-4">
                      <h4 className="font-semibold text-rose-700">{stage.stage}</h4>
                      <p className="text-xs text-gray-500 mb-1">{stage.duration}</p>
                      <p className="text-sm text-gray-600 mb-2">{stage.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {stage.symptoms.map((s, j) => (
                          <span key={j} className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Common Symptoms & Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Common Symptoms & How to Manage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {MENOPAUSE_CONTENT.common_symptoms.map((item, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-800">{item.symptom}</h5>
                      <p className="text-sm text-gray-500 mb-1">{item.description}</p>
                      <p className="text-sm text-green-600">💡 {item.management}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Tips & Guides */}
              {MENOPAUSE_CONTENT.tips_guides.map((guide, i) => (
                <Card key={i} className="border-rose-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-rose-600">{guide.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {guide.tips.map((tip, j) => (
                        <li key={j} className="text-sm text-gray-600">✓ {tip}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}

              {/* FAQs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {MENOPAUSE_CONTENT.faqs.map((faq, i) => (
                    <div key={i} className="border-b pb-3 last:border-0">
                      <p className="font-medium text-gray-800 mb-1">Q: {faq.q}</p>
                      <p className="text-sm text-gray-600">A: {faq.a}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Women Health Community Dialog */}
      <Dialog open={showWomenCommunity} onOpenChange={setShowWomenCommunity}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Users className="w-5 h-5" /> {WOMEN_HEALTH_COMMUNITY.title}
            </DialogTitle>
            <DialogDescription>{WOMEN_HEALTH_COMMUNITY.subtitle}</DialogDescription>
          </DialogHeader>
          <div className="mb-4 p-3 bg-pink-50 rounded-lg">
            <p className="text-sm text-pink-700 mb-2">Want to connect with more women? Visit our full community forum!</p>
            <Button 
              onClick={() => navigate('/community')}
              variant="outline"
              className="border-pink-300 text-pink-600 hover:bg-pink-100"
            >
              <Users className="w-4 h-4 mr-2" />
              Visit Full Community
            </Button>
          </div>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-4">
              {/* Category Selection */}
              {!selectedCommunityCategory ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {WOMEN_HEALTH_COMMUNITY.categories.map((cat) => (
                    <Card 
                      key={cat.id} 
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => setSelectedCommunityCategory(cat)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                          cat.id === 'pregnancy' ? 'bg-pink-100' :
                          cat.id === 'menopause' ? 'bg-purple-100' :
                          cat.id === 'pms_pcos' ? 'bg-rose-100' :
                          'bg-green-100'
                        }`}>
                          {cat.icon === 'heart' && <Heart className={`w-6 h-6 ${cat.id === 'pms_pcos' ? 'text-rose-600' : 'text-green-600'}`} />}
                          {cat.icon === 'baby' && <Baby className="w-6 h-6 text-pink-600" />}
                          {cat.icon === 'brain' && <Sparkles className="w-6 h-6 text-green-600" />}
                          {cat.icon === 'apple' && <Apple className="w-6 h-6 text-green-600" />}
                          {cat.icon === 'flower' && <Flower2 className="w-6 h-6 text-purple-600" />}
                        </div>
                        <h4 className="font-medium text-gray-800 text-sm">{cat.name}</h4>
                        <p className="text-xs text-gray-500">{cat.tips.length} tips, {cat.faqs.length} FAQs</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedCommunityCategory(null)}
                    className="mb-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Categories
                  </Button>
                  
                  <h3 className="text-lg font-semibold text-green-600">{selectedCommunityCategory.name}</h3>
                  
                  {/* Tips */}
                  <Card className="border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-green-600">💡 Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedCommunityCategory.tips.map((tip, i) => (
                        <div key={i} className="p-3 bg-green-50 rounded-lg">
                          <h5 className="font-medium text-gray-800">{tip.title}</h5>
                          <p className="text-sm text-gray-600">{tip.content}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  
                  {/* Guides */}
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-blue-600">📚 Guides</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedCommunityCategory.guides.map((guide, i) => (
                        <div key={i} className="p-3 bg-blue-50 rounded-lg">
                          <h5 className="font-medium text-gray-800">{guide.title}</h5>
                          <p className="text-sm text-gray-600">{guide.content}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  
                  {/* FAQs */}
                  <Card className="border-purple-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-purple-600">❓ Important Q&A</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedCommunityCategory.faqs.map((faq, i) => (
                        <div key={i} className="border-b pb-3 last:border-0">
                          <p className="font-medium text-gray-800 mb-1">Q: {faq.q}</p>
                          <p className="text-sm text-gray-600">A: {faq.a}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={showSubscription} onOpenChange={setShowSubscription}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Crown className="w-6 h-6 text-pink-600" />
              Evara Premium
            </DialogTitle>
            <DialogDescription>
              Unlock the full potential of your wellness journey
            </DialogDescription>
          </DialogHeader>

          {/* Premium Features */}
          <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl">
            <h4 className="font-semibold text-gray-800 mb-2">Premium Features:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Unlimited AI Health Chat
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Personalized Wellness Plans
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Priority Support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Exclusive Live Sessions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Detailed Health Reports
              </li>
            </ul>
          </div>

          {/* Subscription Plans */}
          <div className="space-y-3">
            {subscriptionPlans.map(plan => (
              <Card 
                key={plan.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  plan.id === 'yearly' ? 'border-pink-400 bg-pink-50' : 'border-gray-200'
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{plan.name}</p>
                      {plan.id === 'yearly' && (
                        <span className="px-2 py-0.5 bg-pink-500 text-white text-xs rounded-full">Best Value</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{plan.duration_days} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-pink-600">{plan.formatted_price}</p>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscriptionLoading}
                      data-testid={`subscribe-${plan.id}-btn`}
                    >
                      {subscriptionLoading ? 'Processing...' : 'Subscribe'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!token && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Please <button onClick={() => setShowSubscription(false)} className="text-pink-600 underline">login</button> to subscribe
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Calorie Tracker Dialog */}
      <Dialog open={showCaloriesTracker} onOpenChange={setShowCaloriesTracker}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Apple className="w-6 h-6 text-orange-600" />
              Indian Food Calorie Tracker
            </DialogTitle>
            <DialogDescription>
              Track your daily food intake with our database of 100+ Indian dishes
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            {/* Date Selector */}
            <div className="flex items-center gap-3 mb-4">
              <Label>Date:</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  fetchCalorieLogs(e.target.value);
                }}
                className="w-40"
              />
            </div>

            {/* Daily Summary */}
            <Card className="mb-4 bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  🎯 Today's Summary
                </h4>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xl font-bold text-orange-600">{dailyTotals.calories}</p>
                    <p className="text-xs text-gray-500">Calories</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-600">{dailyTotals.protein}g</p>
                    <p className="text-xs text-gray-500">Protein</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-lg font-bold text-purple-600">{dailyTotals.carbs}g</p>
                    <p className="text-xs text-gray-500">Carbs</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-lg font-bold text-yellow-600">{dailyTotals.fat}g</p>
                    <p className="text-xs text-gray-500">Fat</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-lg font-bold text-green-600">{dailyTotals.fiber}g</p>
                    <p className="text-xs text-gray-500">Fiber</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Bar */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Search Indian Foods</Label>
              <Input
                placeholder="Type to search... (e.g., Dosa, Biryani, Roti)"
                value={foodSearchQuery}
                onChange={(e) => {
                  setFoodSearchQuery(e.target.value);
                  searchFoods(e.target.value);
                }}
                className="mb-2"
                data-testid="evara-food-search-input"
              />
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <Card className="border-orange-200">
                  <CardContent className="p-2 max-h-48 overflow-y-auto">
                    {searchResults.map((food, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 hover:bg-orange-50 rounded-lg cursor-pointer"
                        onClick={() => addFoodToLog(food, food.meal_category || 'other')}
                      >
                        <div>
                          <p className="font-medium text-sm">{food.name}</p>
                          <p className="text-xs text-gray-500">{food.category} • {food.meal_category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{food.calories} cal</p>
                          <p className="text-xs text-gray-400">P:{food.protein}g C:{food.carbs}g</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Category Browser */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Browse by Category</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.keys(foodDatabase).map(category => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedFoodCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedFoodCategory(category)}
                    className={selectedFoodCategory === category ? "bg-pink-500 hover:bg-pink-600" : ""}
                  >
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                ))}
              </div>

              {/* Food Items in Selected Category */}
              {foodDatabase[selectedFoodCategory] && (
                <Card className="border-gray-200">
                  <CardContent className="p-2 max-h-52 overflow-y-auto">
                    <div className="grid gap-1">
                      {foodDatabase[selectedFoodCategory].map((food, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-2 hover:bg-pink-50 rounded-lg cursor-pointer border-b last:border-b-0"
                          onClick={() => addFoodToLog(food, selectedFoodCategory)}
                          data-testid={`evara-food-item-${idx}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{food.name}</p>
                            <p className="text-xs text-gray-400">{food.category}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="font-bold text-orange-600 text-sm">{food.calories} cal</p>
                            <p className="text-xs text-gray-400">P:{food.protein} C:{food.carbs} F:{food.fat}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Today's Food Log */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Food Log ({selectedDate})
              </h4>
              {calorieLogs.length > 0 ? (
                <Card>
                  <CardContent className="p-2">
                    {calorieLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border-b last:border-b-0">
                        <div>
                          <p className="font-medium text-sm">{log.food_name}</p>
                          <p className="text-xs text-gray-400">
                            {log.meal_type} • Qty: {log.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-orange-600">{log.calories} cal</span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteCalorieLog(log.id)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl">
                  <Apple className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">No food logged yet</p>
                  <p className="text-xs text-gray-400">Search or browse foods above to add</p>
                </div>
              )}
            </div>

            {/* Women's Nutrition Tip */}
            <Card className="bg-pink-50 border-pink-200">
              <CardContent className="p-3">
                <p className="text-sm text-pink-800">
                  💡 <strong>Tip for Women:</strong> Focus on iron-rich foods during menstruation, 
                  protein for hormonal balance, and calcium for bone health. Track your nutrition 
                  alongside your cycle for best results!
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Evara;
