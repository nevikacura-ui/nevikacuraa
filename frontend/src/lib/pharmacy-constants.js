import { 
  Activity, HeartPulse, Sparkles, FlaskConical, Droplets, Pill, 
  Eye, Bone, Stethoscope, Baby, Leaf 
} from 'lucide-react';

// ============ AD BANNER IMAGES ============
export const AD_BANNERS = [
  { id: 1, image: '/banners/free_delivery_banner.png', alt: 'Free Delivery on orders above Rs 500' },
  { id: 2, image: '/banners/livogen.png', alt: 'Livogen Iron Gummies' },
  { id: 3, image: '/banners/neurobion.png', alt: 'Neurobion Forte - Nerve Health' },
  { id: 4, image: '/banners/evion.png', alt: 'Evion Vitamin E' },
  { id: 5, image: '/banners/drortho.png', alt: 'Dr. Ortho Ayurvedic Oil' },
];

// ============ CATEGORY CONFIG WITH IMAGES ============
export const CATEGORIES = [
  { 
    id: 'women', 
    label: "Women's Health", 
    icon: HeartPulse, 
    color: 'bg-pink-50 text-pink-600', 
    filter: 'women',
    image: 'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'diabetes', 
    label: 'Diabetes Care', 
    icon: Activity, 
    color: 'bg-blue-50 text-blue-600', 
    filter: 'diabetes',
    image: 'https://images.pexels.com/photos/6941099/pexels-photo-6941099.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'vitamins', 
    label: 'Vitamins & Supplements', 
    icon: Pill, 
    color: 'bg-yellow-50 text-yellow-600', 
    filter: 'vitamin',
    image: 'https://images.pexels.com/photos/14027300/pexels-photo-14027300.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'ortho', 
    label: 'Ortho & Bone Care', 
    icon: Stethoscope, 
    color: 'bg-emerald-50 text-emerald-600', 
    filter: 'bone',
    image: 'https://images.pexels.com/photos/7446990/pexels-photo-7446990.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'cold', 
    label: 'Cough, Cold & Fever', 
    icon: Droplets, 
    color: 'bg-cyan-50 text-cyan-600', 
    filter: 'cold',
    image: 'https://images.pexels.com/photos/5858832/pexels-photo-5858832.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'digestive', 
    label: 'Stomach Care', 
    icon: FlaskConical, 
    color: 'bg-green-50 text-green-600', 
    filter: 'digestive',
    image: 'https://images.unsplash.com/photo-1634463278803-f9f71890e67d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=300&h=300&fit=crop'
  },
  { 
    id: 'pain', 
    label: 'Pain Relief & First Aid', 
    icon: Sparkles, 
    color: 'bg-amber-50 text-amber-600', 
    filter: 'pain',
    image: 'https://images.pexels.com/photos/4005313/pexels-photo-4005313.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'heart', 
    label: 'Heart Care', 
    icon: HeartPulse, 
    color: 'bg-red-50 text-red-500', 
    filter: 'cardiac',
    image: 'https://images.pexels.com/photos/32417922/pexels-photo-32417922.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'antibiotics', 
    label: 'Antibiotics', 
    icon: Pill, 
    color: 'bg-blue-50 text-blue-600', 
    filter: 'antibiotic',
    image: 'https://images.unsplash.com/photo-1631980839248-1a84a60c66ac?w=200&h=200&fit=crop'
  },
  { 
    id: 'skin', 
    label: 'Derma', 
    icon: Sparkles, 
    color: 'bg-pink-50 text-pink-500', 
    filter: 'skin',
    image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=200&h=200&fit=crop'
  },
  { 
    id: 'respiratory', 
    label: 'Respiratory Care', 
    icon: Stethoscope, 
    color: 'bg-teal-50 text-teal-600', 
    filter: 'respiratory',
    image: 'https://images.pexels.com/photos/6816451/pexels-photo-6816451.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'eye', 
    label: 'Eye, Ear & Oral Care', 
    icon: Eye, 
    color: 'bg-indigo-50 text-indigo-500', 
    filter: 'eye',
    image: 'https://images.unsplash.com/photo-1670201203208-055d6d79db4a?w=200&h=200&fit=crop'
  },
  { 
    id: 'neuro', 
    label: 'Neuro Care', 
    icon: Stethoscope, 
    color: 'bg-purple-50 text-purple-600', 
    filter: 'neuro',
    image: 'https://images.pexels.com/photos/5452239/pexels-photo-5452239.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
  { 
    id: 'baby', 
    label: 'Baby Care', 
    icon: Baby, 
    color: 'bg-sky-50 text-sky-500', 
    filter: 'baby',
    image: 'https://images.pexels.com/photos/32950999/pexels-photo-32950999.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  },
];

// ============ TOP BRANDS ============
export const TOP_BRANDS = [
  { id: 'sunpharma', name: 'Sun Pharma', logo: '/brands/sunpharma.png', filter: 'Sun Pharmaceutical Industries Ltd' },
  { id: 'cipla', name: 'Cipla', logo: '/brands/cipla.jpg', filter: 'Cipla Ltd' },
  { id: 'intas', name: 'Intas', logo: '/brands/intas.png', filter: 'Intas Pharmaceuticals Ltd' },
  { id: 'zydus', name: 'Zydus', logo: '/brands/zydus.jpg', filter: 'Zydus Cadila' },
  { id: 'mankind', name: 'Mankind', logo: '/brands/mankind.png', filter: 'Mankind Pharma Ltd' },
  { id: 'abbott', name: 'Abbott', logo: '/brands/abbott.jpg', filter: 'Abbott' },
  { id: 'lupin', name: 'Lupin', logo: '/brands/lupin.png', filter: 'Lupin Ltd' },
  { id: 'macleods', name: 'Macleods', logo: '/brands/macleods.jpg', filter: 'Macleods Pharmaceuticals Pvt Ltd' },
  { id: 'torrent', name: 'Torrent', logo: '/brands/torrent.jpg', filter: 'Torrent Pharmaceuticals Ltd' },
  { id: 'glenmark', name: 'Glenmark', logo: '/brands/glenmark.jpg', filter: 'Glenmark Pharmaceuticals Ltd' },
  { id: 'drreddys', name: "Dr. Reddy's", logo: '/brands/drreddys.png', filter: "Dr Reddy's Laboratories Ltd" },
  { id: 'gsk', name: 'GSK', logo: '/brands/gsk.png', filter: 'Glaxo SmithKline Pharmaceuticals Ltd' },
  { id: 'aristo', name: 'Aristo', logo: '/brands/aristo.jpg', filter: 'Aristo Pharmaceuticals Pvt Ltd' },
  { id: 'ipca', name: 'Ipca', logo: '/brands/ipca.jpg', filter: 'Ipca Laboratories Ltd' },
  { id: 'microlabs', name: 'Micro Labs', logo: '/brands/microlabs.webp', filter: 'Micro Labs Ltd' },
  { id: 'pfizer', name: 'Pfizer', logo: '/brands/pfizer.webp', filter: 'Pfizer Ltd' },
  { id: 'sanofi', name: 'Sanofi', logo: '/brands/sanofi.jpg', filter: 'Sanofi India  Ltd' },
  { id: 'wockhardt', name: 'Wockhardt', logo: '/brands/wockhardt.jpg', filter: 'Wockhardt Ltd' },
  { id: 'zuventus', name: 'Zuventus', logo: '/brands/zuventus.jpg', filter: 'Zuventus Healthcare Ltd' },
  { id: 'fibovil', name: 'Fibovil', logo: '/brands/fibovil.jpg', filter: 'Fibovil' },
];

// ============ MANUFACTURER LOGOS ============
export const MANUFACTURER_LOGOS = {
  'Sun Pharmaceutical Industries Ltd': '/brands/sunpharma.png',
  'Sun Pharma': '/brands/sunpharma.png',
  'Cipla Ltd': '/brands/cipla.jpg',
  'Cipla': '/brands/cipla.jpg',
  'Intas Pharmaceuticals Ltd': '/brands/intas.png',
  'Intas': '/brands/intas.png',
  'Zydus Cadila': '/brands/zydus.jpg',
  'Zydus': '/brands/zydus.jpg',
  'Mankind Pharma Ltd': '/brands/mankind.png',
  'Mankind': '/brands/mankind.png',
  'Abbott': '/brands/abbott.jpg',
  'Abbott Healthcare Pvt Ltd': '/brands/abbott.jpg',
  'Lupin Ltd': '/brands/lupin.png',
  'Lupin': '/brands/lupin.png',
  'Macleods Pharmaceuticals Pvt Ltd': '/brands/macleods.jpg',
  'Macleods': '/brands/macleods.jpg',
  'Torrent Pharmaceuticals Ltd': '/brands/torrent.jpg',
  'Torrent': '/brands/torrent.jpg',
  'Glenmark Pharmaceuticals Ltd': '/brands/glenmark.jpg',
  'Glenmark': '/brands/glenmark.jpg',
  "Dr Reddy's Laboratories Ltd": '/brands/drreddys.png',
  "Dr. Reddy's": '/brands/drreddys.png',
  'Glaxo SmithKline Pharmaceuticals Ltd': '/brands/gsk.png',
  'GSK': '/brands/gsk.png',
  'GlaxoSmithKline': '/brands/gsk.png',
  'Aristo Pharmaceuticals Pvt Ltd': '/brands/aristo.jpg',
  'Aristo': '/brands/aristo.jpg',
  'Ipca Laboratories Ltd': '/brands/ipca.jpg',
  'Ipca': '/brands/ipca.jpg',
  'Micro Labs Ltd': '/brands/microlabs.webp',
  'Micro Labs': '/brands/microlabs.webp',
  'Pfizer Ltd': '/brands/pfizer.webp',
  'Pfizer': '/brands/pfizer.webp',
  'Sanofi India  Ltd': '/brands/sanofi.jpg',
  'Sanofi India Ltd': '/brands/sanofi.jpg',
  'Sanofi': '/brands/sanofi.jpg',
  'Wockhardt Ltd': '/brands/wockhardt.jpg',
  'Wockhardt': '/brands/wockhardt.jpg',
  'Zuventus Healthcare Ltd': '/brands/zuventus.jpg',
  'Zuventus': '/brands/zuventus.jpg',
  'Fibovil': '/brands/fibovil.jpg',
  'Fibovil Pharmaceuticals': '/brands/fibovil.jpg',
  'Alkem Laboratories Ltd': '/brands/cipla.jpg',
  'Cadila Pharmaceuticals Ltd': '/brands/zydus.jpg',
  'Hetero Healthcare Ltd': '/brands/cipla.jpg',
  'USV Ltd': '/brands/cipla.jpg',
  'Alembic Pharmaceuticals Ltd': '/brands/cipla.jpg',
};

// ============ CHRONIC CARE CATEGORIES ============
export const CHRONIC_CARE_CATEGORIES = [
  { id: 'respiratory', label: 'Asthma & Respiratory Care', filter: 'respiratory', image: '/chronic/asthma.png' },
  { id: 'bone', label: 'Bone & Joint Health', filter: 'bone', image: '/chronic/bone.png' },
  { id: 'heart', label: 'Heart & BP Care', filter: 'cardiac', image: '/chronic/heart.png' },
  { id: 'diabetes', label: 'Diabetes', filter: 'diabetes', image: '/chronic/diabetes.png' },
];

// ============ COMMON CONCERNS ============
export const COMMON_CONCERNS = [
  { id: 'digestive', label: 'Stomach Upset', filter: 'digestive', image: '/concerns/stomach.png' },
  { id: 'pain', label: 'Headache', filter: 'pain', image: '/concerns/headache.png' },
  { id: 'cold', label: 'Fever', filter: 'cold', image: '/concerns/fever.png' },
  { id: 'skin', label: 'Skin Care', filter: 'skin', image: '/concerns/skin.png' },
];

// ============ HELPER FUNCTIONS ============
export const getManufacturerLogo = (manufacturer) => {
  if (!manufacturer) return null;
  if (MANUFACTURER_LOGOS[manufacturer]) {
    return MANUFACTURER_LOGOS[manufacturer];
  }
  const lowerMfr = manufacturer.toLowerCase();
  for (const [key, logo] of Object.entries(MANUFACTURER_LOGOS)) {
    if (lowerMfr.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerMfr)) {
      return logo;
    }
  }
  return null;
};

export const getFormIcon = (form, icons) => {
  const { Pill, Droplets, Syringe, Package } = icons;
  const f = (form || '').toLowerCase();
  if (f.includes('tablet')) return Pill;
  if (f.includes('syrup') || f.includes('liquid')) return Droplets;
  if (f.includes('injection')) return Syringe;
  if (f.includes('capsule')) return Package;
  return Pill;
};
