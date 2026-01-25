// Static data for Home page components
// DO NOT MODIFY - Contains all original data

export const healthTips = [
  { tip: "Stay hydrated! Drink at least 8 glasses of water daily for optimal health.", icon: "💧", category: "Hydration" },
  { tip: "A 30-minute walk can boost your mood and improve cardiovascular health.", icon: "🚶", category: "Exercise" },
  { tip: "Get 7-9 hours of quality sleep to help your body repair and rejuvenate.", icon: "😴", category: "Sleep" },
  { tip: "Include colorful vegetables in every meal for essential vitamins and minerals.", icon: "🥗", category: "Nutrition" },
  { tip: "Practice deep breathing for 5 minutes daily to reduce stress and anxiety.", icon: "🧘", category: "Mental Health" },
  { tip: "Regular health check-ups can detect problems early when they're easier to treat.", icon: "🩺", category: "Prevention" },
  { tip: "Limit screen time before bed to improve sleep quality.", icon: "📱", category: "Digital Wellness" },
  { tip: "Wash your hands frequently to prevent the spread of infections.", icon: "🧼", category: "Hygiene" },
  { tip: "Take short breaks every hour if you work at a desk to prevent strain.", icon: "⏰", category: "Work Health" },
  { tip: "Laugh often! It reduces stress hormones and boosts immune function.", icon: "😄", category: "Mental Health" },
  { tip: "Eat breakfast within an hour of waking to kickstart your metabolism.", icon: "🍳", category: "Nutrition" },
  { tip: "Maintain good posture to prevent back pain and improve breathing.", icon: "🧍", category: "Posture" }
];

export const spotlightServices = [
  {
    id: 'diagyn-appointment',
    title: 'Book Appointment',
    subtitle: 'DiaGyn Healthcare',
    description: 'Skip the queue! Book your doctor appointment online in just 2 minutes',
    cta: 'Book Now',
    path: '/diagyn',
    gradient: 'from-teal-500 to-cyan-500',
    bgImage: 'from-teal-50 to-cyan-100'
  },
  {
    id: 'diagyn-spotlight',
    title: 'Women\'s Health Week',
    subtitle: 'Special consultations at DiaGyn',
    description: 'Comprehensive gynecological care with experienced specialists',
    cta: 'Book Now',
    path: '/diagyn',
    gradient: 'from-pink-500 to-rose-500',
    bgImage: 'from-pink-50 to-rose-100'
  },
  {
    id: 'proton-spotlight',
    title: 'Full Body Checkup',
    subtitle: 'Proton Diagnostics',
    description: 'Complete health screening with 50+ tests at special rates',
    cta: 'View Packages',
    path: '/proton',
    gradient: 'from-blue-500 to-cyan-500',
    bgImage: 'from-blue-50 to-cyan-100'
  },
  {
    id: 'pharmacy-spotlight',
    title: 'Medicine Delivery',
    subtitle: 'Orange Pharmacy',
    description: 'Get your prescriptions delivered within 2 hours',
    cta: 'Order Now',
    path: '/pharmacy',
    gradient: 'from-orange-500 to-amber-500',
    bgImage: 'from-orange-50 to-amber-100'
  },
  {
    id: 'glydex-spotlight',
    title: 'Diabetes Management',
    subtitle: 'Glydex Program',
    description: 'Personalized care plans for better glucose control',
    cta: 'Learn More',
    path: '/glydex',
    gradient: 'from-teal-500 to-emerald-500',
    bgImage: 'from-teal-50 to-emerald-100'
  }
];

export const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    location: "Mumbai",
    rating: 5,
    text: "Nevika Cura has transformed how I manage my family's health. The medicine delivery is super quick, and booking appointments is so easy!",
    service: "DiaGyn Healthcare",
    avatar: "PS"
  },
  {
    id: 2,
    name: "Rahul Mehta",
    location: "Thane",
    rating: 5,
    text: "The Glydex diabetes program helped me control my sugar levels better than ever. The personalized care plan made all the difference.",
    service: "Glydex",
    avatar: "RM"
  },
  {
    id: 3,
    name: "Anjali Patel",
    location: "Vasai",
    rating: 5,
    text: "As a new mother, Evara's women wellness programs have been invaluable. The doctors are caring and the app makes everything convenient.",
    service: "Evara",
    avatar: "AP"
  },
  {
    id: 4,
    name: "Suresh Kumar",
    location: "Bhayandar",
    rating: 5,
    text: "Got my full body checkup done at Proton. Professional staff, quick results, and the health dashboard helps me track everything.",
    service: "Proton Diagnostics",
    avatar: "SK"
  }
];

export const whyChooseUs = [
  { icon: 'Trophy', value: '20+', label: 'Years Experience', color: 'from-amber-400 to-orange-500' },
  { icon: 'Users', value: '50,000+', label: 'Happy Patients', color: 'from-blue-400 to-cyan-500' },
  { icon: 'Clock', value: 'Same Day', label: 'Appointments', color: 'from-teal-400 to-emerald-500' },
  { icon: 'Shield', value: '24/7', label: 'Support Available', color: 'from-purple-400 to-pink-500' }
];

export const featuredDoctors = [
  {
    id: 1,
    name: 'Dr. Vikas Jha',
    specialization: 'Physician & Diabetologist',
    experience: '',
    qualification: 'M.B.B.S (Mumbai), C. Diabetology (Delhi), Dip. in Diabetology (UK)',
    image: null,
    avatar: 'VJ',
    color: 'from-teal-400 to-emerald-500',
    clinic: 'DiaGyn Healthcare'
  },
  {
    id: 2,
    name: 'Dr. Neha Patel',
    specialization: 'Obstetrician & Gynaecologist',
    experience: 'Infertility Specialist & Laproscopic Surgeon',
    qualification: 'M.B.B.S (Mumbai), DGO (Mumbai), FMAS (Delhi)',
    image: null,
    avatar: 'NP',
    color: 'from-pink-400 to-rose-500',
    clinic: 'DiaGyn Healthcare'
  }
];

export const certifications = [
  { name: 'Govt Registered Clinic', fullName: 'Government Registered Healthcare Facility', color: 'bg-teal-100 text-teal-700' },
  { name: 'Govt Certified Sonography Centre', fullName: 'Government Registered Sonography Facility', color: 'bg-blue-100 text-blue-700' },
  { name: 'CAP Certified Lab', fullName: 'College of American Pathologists Certified', color: 'bg-purple-100 text-purple-700' },
  { name: 'FSSAI Approved Pharmacy', fullName: 'Food Safety and Standards Authority of India Approved', color: 'bg-orange-100 text-orange-700' },
  { name: 'ISO 9001', fullName: 'Quality Management Certified', color: 'bg-green-100 text-green-700' }
];

export const howItWorksSteps = [
  {
    step: 1,
    title: 'Book',
    description: 'Choose service & schedule online',
    icon: 'Calendar',
    color: 'from-teal-400 to-cyan-500'
  },
  {
    step: 2,
    title: 'Visit or Deliver',
    description: 'Visit clinic or doorstep delivery',
    icon: 'Stethoscope',
    color: 'from-blue-400 to-indigo-500'
  },
  {
    step: 3,
    title: 'Get Healthy',
    description: 'Track your health journey',
    icon: 'Heart',
    color: 'from-pink-400 to-rose-500'
  }
];

export const clinicLocations = [
  {
    id: 'pushpa',
    name: 'Pushpa Clinic',
    logo: 'https://customer-assets.emergentagent.com/job_medhealth-portal/artifacts/x55478bz_5_20260102_012214_0001.png',
    address: 'A-1, Sai Darshan, Near Don Bosco High School',
    city: 'Naigaon East, Maharashtra',
    phone: '+91 9403890429',
    hours: '11 AM - 2 PM, 6 PM - 10 PM',
    mapLink: 'https://maps.google.com/?q=Pushpa+Clinic+Naigaon',
    services: ['Consultations', 'Sonography', 'Lab Tests']
  },
  {
    id: 'amnion',
    name: 'Amnion General & Speciality Clinic',
    logo: 'https://customer-assets.emergentagent.com/job_medhealth-portal/artifacts/jc4rkjh4_9_20260102_012214_0005.png',
    address: 'G-7, Rashmi Star City Phase 5, Opp Thakur School',
    city: 'Naigaon East, Maharashtra',
    phone: '+91 9403890429',
    hours: '11 AM - 2 PM, 6 PM - 10 PM',
    mapLink: 'https://maps.google.com/?q=Amnion+Clinic+Naigaon',
    services: ['Consultations', 'Pharmacy', 'Diagnostics']
  }
];

export const services = [
  {
    id: 'diagyn',
    name: 'DiaGyn Healthcare',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg',
    path: '/diagyn',
    bgColor: '#ffffff',
    isDark: false
  },
  {
    id: 'proton',
    name: 'Proton Diagnostics',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/saez5270_5_20260107_021040_0002.jpg',
    path: '/proton',
    bgColor: '#ffffff',
    isDark: false
  },
  {
    id: 'pharmacy',
    name: 'Orange Pharmacy',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg',
    path: '/pharmacy',
    bgColor: '#ffffff',
    isDark: false
  },
  {
    id: 'evara',
    name: 'Evara',
    logo: '/icons/evara-logo.png',
    path: '/evara',
    bgColor: '#511b63',
    isDark: true,
    fillLogo: true,
    logoScale: 0.85
  },
  {
    id: 'glydex',
    name: 'Glydex',
    logo: '/glydex-logo.png',
    path: '/glydex',
    bgColor: '#121f33',
    isDark: true,
    fillLogo: true
  },
  {
    id: 'alyne',
    name: 'ALYNE',
    logo: 'https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png',
    path: '/alyne',
    bgColor: '#0a1628',
    isDark: true,
    fillLogo: true
  }
];
