# Configuration data for clinics, doctors, fees
# This will be migrated to MongoDB

CLINICS_DATA = {
    "clinics": [
        {
            "id": "pushpa_clinic",
            "name": "Pushpa Clinic",
            "address": "A-1, Sai Darshan, Near Don Bosco High School",
            "city": "Naigaon East, Maharashtra",
            "phone": "+91 9403890429",
            "hours": "11 AM - 2 PM, 6 PM - 10 PM",
            "map_link": "https://maps.google.com/?q=Pushpa+Clinic+Naigaon",
            "services": ["Consultations", "Sonography", "Lab Tests"],
            "logo": "https://customer-assets.emergentagent.com/job_medhealth-portal/artifacts/x55478bz_5_20260102_012214_0001.png",
            "doctors": ["Dr. Neha Patel", "Dr. Vikas Jha"]
        },
        {
            "id": "amnion_clinic",
            "name": "Amnion Clinic",
            "address": "G-7, Rashmi Star City Phase 5, Opp Thakur School",
            "city": "Naigaon East, Maharashtra",
            "phone": "+91 9403890429",
            "hours": "11 AM - 2 PM, 6 PM - 10 PM",
            "map_link": "https://maps.google.com/?q=Amnion+Clinic+Naigaon",
            "services": ["Consultations", "Pharmacy", "Diagnostics"],
            "logo": "https://customer-assets.emergentagent.com/job_medhealth-portal/artifacts/jc4rkjh4_9_20260102_012214_0005.png",
            "doctors": ["Dr. Vikas Jha", "Dr. Neha Patel"]
        }
    ]
}

DOCTORS_DATA = {
    "doctors": [
        {
            "id": "dr_vikas_jha",
            "name": "Dr. Vikas Jha",
            "specialization": "Physician & Diabetologist",
            "qualification": "M.B.B.S (Mumbai), C. Diabetology (Delhi), Dip. in Diabetology (UK)",
            "experience": "",
            "avatar": "VJ",
            "color": "from-teal-400 to-emerald-500",
            "schedules": {
                "Pushpa Clinic": [
                    {"days": ["Monday", "Wednesday", "Friday"], "time": "18:00-22:00"}
                ],
                "Amnion Clinic": [
                    {"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "time": "11:00-14:00"},
                    {"days": ["Tuesday", "Thursday", "Saturday"], "time": "18:00-22:00"}
                ]
            }
        },
        {
            "id": "dr_neha_patel",
            "name": "Dr. Neha Patel",
            "specialization": "Obstetrician & Gynaecologist",
            "qualification": "M.B.B.S (Mumbai), DGO (Mumbai), FMAS (Delhi)",
            "experience": "Infertility Specialist & Laproscopic Surgeon",
            "avatar": "NP",
            "color": "from-pink-400 to-rose-500",
            "schedules": {
                "Amnion Clinic": [
                    {"days": ["Monday", "Wednesday", "Friday"], "time": "18:00-22:00"}
                ],
                "Pushpa Clinic": [
                    {"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "time": "11:00-14:00"},
                    {"days": ["Tuesday", "Thursday", "Saturday"], "time": "18:00-22:00"}
                ]
            }
        }
    ]
}

FEE_CODES_DATA = {
    "consultation_fees": [
        {"code": "NF", "label": "No Fees", "amount": 0, "color": "bg-gray-50 text-gray-600", "category": "general"},
        {"code": "G1", "label": "General - First", "amount": 150, "color": "bg-gray-100 text-gray-800", "category": "general"},
        {"code": "G2", "label": "General - Follow up", "amount": 100, "color": "bg-gray-100 text-gray-800", "category": "general"},
        {"code": "S1", "label": "Speciality - First", "amount": 300, "color": "bg-blue-100 text-blue-800", "category": "speciality"},
        {"code": "S2", "label": "Speciality - Follow up", "amount": 200, "color": "bg-blue-100 text-blue-800", "category": "speciality"},
        {"code": "D1", "label": "Diabetes - First", "amount": 500, "color": "bg-purple-100 text-purple-800", "category": "diabetes"},
        {"code": "D2", "label": "Diabetes - Follow up", "amount": 400, "color": "bg-purple-100 text-purple-800", "category": "diabetes"},
        {"code": "D3", "label": "Diabetes - Follow up", "amount": 300, "color": "bg-purple-100 text-purple-800", "category": "diabetes"},
        {"code": "O1", "label": "OBGY - First", "amount": 500, "color": "bg-pink-100 text-pink-800", "category": "obgy"},
        {"code": "O2", "label": "OBGY - Follow up", "amount": 400, "color": "bg-pink-100 text-pink-800", "category": "obgy"},
        {"code": "O3", "label": "OBGY - Follow up", "amount": 300, "color": "bg-pink-100 text-pink-800", "category": "obgy"},
        {"code": "E1", "label": "Emergency", "amount": 600, "color": "bg-red-100 text-red-800", "category": "emergency"}
    ],
    "scan_fees": [
        {"code": "ES", "label": "Early Scan", "amount": 1000, "color": "bg-cyan-100 text-cyan-800", "category": "pregnancy"},
        {"code": "NT", "label": "NT Scan", "amount": 1200, "color": "bg-cyan-100 text-cyan-800", "category": "pregnancy"},
        {"code": "GS", "label": "Growth Scan", "amount": 1500, "color": "bg-cyan-100 text-cyan-800", "category": "pregnancy"},
        {"code": "FL", "label": "Follicular", "amount": 200, "color": "bg-teal-100 text-teal-800", "category": "gynaecology"},
        {"code": "UP", "label": "USG Pelvis", "amount": 1000, "color": "bg-teal-100 text-teal-800", "category": "gynaecology"},
        {"code": "UT", "label": "UpT", "amount": 100, "color": "bg-teal-100 text-teal-800", "category": "gynaecology"}
    ]
}

SERVICES_DATA = {
    "services": [
        {
            "id": "diagyn",
            "name": "DiaGyn Healthcare",
            "description": "Doctor consultations for diabetes and gynecology",
            "logo": "https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg",
            "path": "/diagyn",
            "bg_color": "#ffffff",
            "is_dark": False,
            "active": True
        },
        {
            "id": "proton",
            "name": "Proton Diagnostics",
            "description": "Lab tests and diagnostic services",
            "logo": "https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/saez5270_5_20260107_021040_0002.jpg",
            "path": "/proton",
            "bg_color": "#ffffff",
            "is_dark": False,
            "active": True
        },
        {
            "id": "pharmacy",
            "name": "Orange Pharmacy",
            "description": "Medicine orders and delivery",
            "logo": "https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg",
            "path": "/pharmacy",
            "bg_color": "#ffffff",
            "is_dark": False,
            "active": True
        },
        {
            "id": "evara",
            "name": "Evara",
            "description": "Women's wellness programs",
            "logo": "/icons/evara-logo.png",
            "path": "/evara",
            "bg_color": "#511b63",
            "is_dark": True,
            "active": True
        },
        {
            "id": "glydex",
            "name": "Glydex",
            "description": "Diabetes management program",
            "logo": "/glydex-logo.png",
            "path": "/glydex",
            "bg_color": "#121f33",
            "is_dark": True,
            "active": True
        },
        {
            "id": "alyne",
            "name": "ALYNE",
            "description": "Advanced health services",
            "logo": "https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png",
            "path": "/alyne",
            "bg_color": "#0a1628",
            "is_dark": True,
            "active": True
        }
    ]
}

CERTIFICATIONS_DATA = {
    "certifications": [
        {"name": "Govt Registered Clinic", "full_name": "Government Registered Healthcare Facility", "color": "bg-teal-100 text-teal-700"},
        {"name": "Govt Certified Sonography Centre", "full_name": "Government Registered Sonography Facility", "color": "bg-blue-100 text-blue-700"},
        {"name": "CAP Certified Lab", "full_name": "College of American Pathologists Certified", "color": "bg-purple-100 text-purple-700"},
        {"name": "FSSAI Approved Pharmacy", "full_name": "Food Safety and Standards Authority of India Approved", "color": "bg-orange-100 text-orange-700"},
        {"name": "ISO 9001", "full_name": "Quality Management Certified", "color": "bg-green-100 text-green-700"}
    ]
}

TESTIMONIALS_DATA = {
    "testimonials": [
        {
            "id": 1,
            "name": "Priya Sharma",
            "location": "Mumbai",
            "rating": 5,
            "text": "Nevika Cura has transformed how I manage my family's health. The medicine delivery is super quick, and booking appointments is so easy!",
            "service": "DiaGyn Healthcare",
            "avatar": "PS",
            "active": True
        },
        {
            "id": 2,
            "name": "Rahul Mehta",
            "location": "Thane",
            "rating": 5,
            "text": "The Glydex diabetes program helped me control my sugar levels better than ever. The personalized care plan made all the difference.",
            "service": "Glydex",
            "avatar": "RM",
            "active": True
        },
        {
            "id": 3,
            "name": "Anjali Patel",
            "location": "Vasai",
            "rating": 5,
            "text": "As a new mother, Evara's women wellness programs have been invaluable. The doctors are caring and the app makes everything convenient.",
            "service": "Evara",
            "avatar": "AP",
            "active": True
        },
        {
            "id": 4,
            "name": "Suresh Kumar",
            "location": "Bhayandar",
            "rating": 5,
            "text": "Got my full body checkup done at Proton. Professional staff, quick results, and the health dashboard helps me track everything.",
            "service": "Proton Diagnostics",
            "avatar": "SK",
            "active": True
        }
    ]
}

HEALTH_TIPS_DATA = {
    "health_tips": [
        {"tip": "Stay hydrated! Drink at least 8 glasses of water daily for optimal health.", "icon": "💧", "category": "Hydration"},
        {"tip": "A 30-minute walk can boost your mood and improve cardiovascular health.", "icon": "🚶", "category": "Exercise"},
        {"tip": "Get 7-9 hours of quality sleep to help your body repair and rejuvenate.", "icon": "😴", "category": "Sleep"},
        {"tip": "Include colorful vegetables in every meal for essential vitamins and minerals.", "icon": "🥗", "category": "Nutrition"},
        {"tip": "Practice deep breathing for 5 minutes daily to reduce stress and anxiety.", "icon": "🧘", "category": "Mental Health"},
        {"tip": "Regular health check-ups can detect problems early when they're easier to treat.", "icon": "🩺", "category": "Prevention"},
        {"tip": "Limit screen time before bed to improve sleep quality.", "icon": "📱", "category": "Digital Wellness"},
        {"tip": "Wash your hands frequently to prevent the spread of infections.", "icon": "🧼", "category": "Hygiene"},
        {"tip": "Take short breaks every hour if you work at a desk to prevent strain.", "icon": "⏰", "category": "Work Health"},
        {"tip": "Laugh often! It reduces stress hormones and boosts immune function.", "icon": "😄", "category": "Mental Health"},
        {"tip": "Eat breakfast within an hour of waking to kickstart your metabolism.", "icon": "🍳", "category": "Nutrition"},
        {"tip": "Maintain good posture to prevent back pain and improve breathing.", "icon": "🧍", "category": "Posture"}
    ]
}
