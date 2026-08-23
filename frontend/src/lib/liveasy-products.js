// Product Catalog - All brands
// Company products with Name, Image, MRP

// Product type images
const IMG = {
  serum: 'https://images.unsplash.com/photo-1741896135512-084b251887f7?w=200&h=200&fit=crop',
  serumSet: 'https://images.unsplash.com/photo-1767256046031-743d33937c4e?w=200&h=200&fit=crop',
  niacinamide: 'https://images.unsplash.com/photo-1766940095250-5c7715ab57ea?w=200&h=200&fit=crop',
  serumDrop: 'https://images.pexels.com/photos/4841388/pexels-photo-4841388.jpeg?auto=compress&w=200&h=200&fit=crop',
  serumBottle: 'https://images.pexels.com/photos/9496260/pexels-photo-9496260.jpeg?auto=compress&w=200&h=200&fit=crop',
  cleanser: 'https://images.unsplash.com/photo-1741896136350-db887ec67c46?w=200&h=200&fit=crop',
  sunscreen: 'https://images.pexels.com/photos/12851388/pexels-photo-12851388.jpeg?auto=compress&w=200&h=200&fit=crop',
  lipbalm: 'https://images.pexels.com/photos/22821336/pexels-photo-22821336.jpeg?auto=compress&w=200&h=200&fit=crop',
  moisturizer: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&h=200&fit=crop',
  hairserum: 'https://images.unsplash.com/photo-1599948128020-9a44505b0d1b?w=200&h=200&fit=crop',
  toner: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200&h=200&fit=crop',
  cotton: 'https://images.unsplash.com/photo-1598871955497-27e7814b405d?w=200&h=200&fit=crop',
  bandage: 'https://images.pexels.com/photos/13105347/pexels-photo-13105347.jpeg?auto=compress&w=200&h=200&fit=crop',
  painrelief: 'https://images.unsplash.com/photo-1699158660201-11b79ce7db2c?w=200&h=200&fit=crop',
  thermometer: 'https://images.pexels.com/photos/7584479/pexels-photo-7584479.jpeg?auto=compress&w=200&h=200&fit=crop',
  wipes: 'https://images.pexels.com/photos/30344708/pexels-photo-30344708.jpeg?auto=compress&w=200&h=200&fit=crop',
  diaper: 'https://images.pexels.com/photos/30344708/pexels-photo-30344708.jpeg?auto=compress&w=200&h=200&fit=crop',
  ortho: 'https://images.pexels.com/photos/7991959/pexels-photo-7991959.jpeg?auto=compress&w=200&h=200&fit=crop',
  nutrition: 'https://images.pexels.com/photos/4378601/pexels-photo-4378601.jpeg?auto=compress&w=200&h=200&fit=crop',
  ors: 'https://images.pexels.com/photos/4719950/pexels-photo-4719950.jpeg?auto=compress&w=200&h=200&fit=crop',
  seeds: 'https://images.pexels.com/photos/6208145/pexels-photo-6208145.jpeg?auto=compress&w=200&h=200&fit=crop',
};

export const LIVEASY_PRODUCTS = {
  // =========== HEALTH & NUTRITION ===========
  'Nutritional Drinks': [
    { name: 'Liveasy Wellness Multivitamin Multimineral', mrp: 622, company: 'Liveasy', image: IMG.nutrition },
    { name: 'Liveasy Wellness Calcium Magnesium Zinc', mrp: 533, company: 'Liveasy', image: IMG.nutrition },
  ],
  'Rehydration Beverages': [
    { name: 'Liveasy ORS Liquid Oral Rehydration Solution', mrp: 31.50, company: 'Liveasy', image: IMG.ors },
    { name: 'Liveasy Wellness Antacid Mint Flavour', mrp: 149, company: 'Liveasy', image: IMG.ors },
  ],
  'Energy Foods': [
    { name: 'Liveasy Foods Healthy Roasted Seed Mix', mrp: 374, company: 'Liveasy', image: IMG.seeds },
  ],

  // =========== ORTHOPEDIC SUPPORT ===========
  'Back & Abdomen Support': [
    { name: 'Liveasy Universal Shoulder Immobilizer', mrp: 535, company: 'Liveasy', image: IMG.ortho },
    { name: 'Liveasy Ortho Care Neck Support', mrp: 349, company: 'Liveasy', image: IMG.ortho },
  ],
  'Ankle, Foot & Leg': [
    { name: 'Liveasy Ortho Care Acupressure Sandals', mrp: 608, company: 'Liveasy', image: IMG.ortho },
    { name: 'Liveasy Ortho Care Knee Cap (Pair)', mrp: 409, company: 'Liveasy', image: IMG.ortho },
    { name: 'Liveasy Pro Ortho Care Knee Cap XL', mrp: 449, company: 'Liveasy', image: IMG.ortho },
    { name: 'Liveasy Knee Cap Modern Orthopedic', mrp: 409, company: 'Liveasy', image: IMG.ortho },
  ],
  'Upper Body Support': [
    { name: 'Liveasy Ortho Care Reusable Hot And Cold Pack', mrp: 311, company: 'Liveasy', image: IMG.ortho },
  ],

  // =========== FIRST AID ===========
  'Bandages': [
    { name: 'Liveasy Ortho Care Cotton Crepe Bandage 10cm', mrp: 350, company: 'Liveasy', image: IMG.bandage },
    { name: 'Liveasy Ortho Care Cotton Crepe Bandage 8cm', mrp: 281, company: 'Liveasy', image: IMG.bandage },
    { name: 'Liveasy Ortho Care Cotton Crepe Bandage 6cm', mrp: 234, company: 'Liveasy', image: IMG.bandage },
    { name: 'Liveasy Ortho Care Cotton Crepe Bandage 15cm', mrp: 375, company: 'Liveasy', image: IMG.bandage },
    { name: 'Liveasy Surgical Rolled Bandage Pack', mrp: 203, company: 'Liveasy', image: IMG.bandage },
    { name: 'Liveasy Essentials Waterproof Bandage', mrp: 281, company: 'Liveasy', image: IMG.bandage },
  ],
  'Pain Relief': [
    { name: 'Liveasy Wellness Pain Relief Gel Tube', mrp: 102, company: 'Liveasy', image: IMG.painrelief },
    { name: 'Liveasy Wellness Pain Relief Spray', mrp: 205, company: 'Liveasy', image: IMG.painrelief },
    { name: 'Liveasy Wellness Pain Relief Balm Jar', mrp: 39, company: 'Liveasy', image: IMG.painrelief },
  ],
  'Antiseptic Solution': [
    { name: 'Liveasy Wellness Mosquito Repellent', mrp: 47, company: 'Liveasy', image: IMG.painrelief },
    { name: 'Liveasy Hygiene Itch Protect+ Cream', mrp: 110, company: 'Liveasy', image: IMG.painrelief },
  ],
  'Cotton Wool': [
    { name: 'Liveasy Surgical Absorbent Cotton Wool', mrp: 469, company: 'Liveasy', image: IMG.cotton },
    { name: 'Liveasy Cotton Balls 50 Nos', mrp: 69, company: 'Liveasy', image: IMG.cotton },
    { name: 'Liveasy Paper Stick Cotton Swabs 200', mrp: 98, company: 'Liveasy', image: IMG.cotton },
    { name: 'Liveasy Essentials Paper Stick Cotton Buds', mrp: 61, company: 'Liveasy', image: IMG.cotton },
  ],

  // =========== SURGICAL SUPPLIES ===========
  'Surgical Tools': [
    { name: 'Liveasy Surgical Microporous Tape', mrp: 22, company: 'Liveasy', image: IMG.thermometer },
    { name: 'Liveasy Essentials Nail Cutter', mrp: 135, company: 'Liveasy', image: IMG.thermometer },
    { name: 'Liveasy Digital Thermometer', mrp: 249, company: 'Liveasy', image: IMG.thermometer },
  ],

  // =========== BABY CARE ===========
  'Diapers & Wipes': [
    { name: 'Liveasy Soft & Gentle Baby Wipes', mrp: 199, company: 'Liveasy', image: IMG.wipes },
    { name: 'Liveasy Adult Diaper Tape Style (L) 10 Pcs', mrp: 563, company: 'Liveasy', image: IMG.diaper },
    { name: 'Liveasy Adult Diaper Tape Style (XL) 10 Pcs', mrp: 586, company: 'Liveasy', image: IMG.diaper },
  ],

  // =========== WOMEN'S HEALTH ===========
  'Feminine Hygiene': [
    { name: 'Liveasy Essentials Cleansing Aloe Vera Facial Wipes', mrp: 199, company: 'Liveasy', image: IMG.wipes },
    { name: 'Liveasy Essentials Tongue Cleaner', mrp: 99, company: 'Liveasy', image: IMG.thermometer },
    { name: 'Liveasy Essentials Strawberry Lip Balm', mrp: 159, company: 'Liveasy', image: IMG.lipbalm },
  ],

  // =========== SKIN CARE - MINIMALIST ===========
  'Minimalist': [
    // Face Cleansers
    { name: 'Minimalist Salicylic Acid + LHA 02% Face Cleanser', mrp: 299, company: 'Minimalist', image: IMG.cleanser },
    { name: 'Minimalist 6% Oat Extract Gentle Cleanser', mrp: 299, company: 'Minimalist', image: IMG.cleanser },
    { name: 'Minimalist 02% Salicylic Acid + LHA Face Cleanser 250ml', mrp: 599, company: 'Minimalist', image: IMG.cleanser },
    { name: 'Minimalist Aquaporin Booster 05% Cleanser', mrp: 299, company: 'Minimalist', image: IMG.cleanser },
    // Sunscreens
    { name: 'Minimalist Sunscreen SPF 50 PA++++', mrp: 399, company: 'Minimalist', image: IMG.sunscreen },
    { name: 'Minimalist Vitamin B5 Sunscreen SPF 50 PA++++', mrp: 249, company: 'Minimalist', image: IMG.sunscreen },
    { name: 'Minimalist Light Fluid Face Sunscreen SPF 50', mrp: 499, company: 'Minimalist', image: IMG.sunscreen },
    { name: 'Minimalist Sunscreen SPF 60 PA++++', mrp: 599, company: 'Minimalist', image: IMG.sunscreen },
    { name: 'Minimalist Sunscreen with Niacinamide SPF 50', mrp: 699, company: 'Minimalist', image: IMG.sunscreen },
    // Moisturizers
    { name: 'Minimalist Vitamin B5 10% Gel Moisturizer', mrp: 349, company: 'Minimalist', image: IMG.moisturizer },
    { name: 'Minimalist B12 + Repair Complex 5.5% Face Moisturizer', mrp: 399, company: 'Minimalist', image: IMG.moisturizer },
    // Face Serums
    { name: 'Minimalist 2% Salicylic Acid Face Serum 10ml', mrp: 249, company: 'Minimalist', image: IMG.serum },
    { name: 'Minimalist 2% Salicylic Acid Face Serum 30ml', mrp: 549, company: 'Minimalist', image: IMG.serum },
    { name: 'Minimalist 2% Salicylic Acid Face Serum 60ml', mrp: 949, company: 'Minimalist', image: IMG.serum },
    { name: 'Minimalist 10% Vitamin C Brightening Serum 10ml', mrp: 299, company: 'Minimalist', image: IMG.serumBottle },
    { name: 'Minimalist 10% Vitamin C Brightening Serum 30ml', mrp: 699, company: 'Minimalist', image: IMG.serumBottle },
    { name: 'Minimalist 16% Vitamin C Face Serum', mrp: 599, company: 'Minimalist', image: IMG.serumBottle },
    { name: 'Minimalist Niacinamide 10% Face Serum 30ml', mrp: 599, company: 'Minimalist', image: IMG.niacinamide },
    { name: 'Minimalist 10% Niacinamide Face Serum 10ml', mrp: 249, company: 'Minimalist', image: IMG.niacinamide },
    { name: 'Minimalist 5% Niacinamide Face Serum for Blemishes', mrp: 599, company: 'Minimalist', image: IMG.niacinamide },
    { name: 'Minimalist Niacinamide 05% Face Serum', mrp: 249, company: 'Minimalist', image: IMG.niacinamide },
    { name: 'Minimalist 0.3% Retinol Face Serum Anti-Aging', mrp: 599, company: 'Minimalist', image: IMG.serumDrop },
    { name: 'Minimalist Hyaluronic Acid 2% Face Serum', mrp: 599, company: 'Minimalist', image: IMG.serumDrop },
    { name: 'Minimalist Hyaluronic + PGA Face Serum', mrp: 249, company: 'Minimalist', image: IMG.serumDrop },
    { name: 'Minimalist 32% AHA PHA BHA Exfoliating Serum', mrp: 699, company: 'Minimalist', image: IMG.serumSet },
    { name: 'Minimalist Alpha Arbutin Face Serum', mrp: 549, company: 'Minimalist', image: IMG.serumSet },
    { name: 'Minimalist Multi-Peptides Face Serum', mrp: 699, company: 'Minimalist', image: IMG.serumSet },
    // Toners
    { name: 'Minimalist 3% PHA Face Toner', mrp: 399, company: 'Minimalist', image: IMG.toner },
    { name: 'Minimalist HOCl Skin Relief Spray Toner', mrp: 399, company: 'Minimalist', image: IMG.toner },
    // Lip Care
    { name: 'Minimalist L-Ascorbic Acid 8% Lip Balm', mrp: 399, company: 'Minimalist', image: IMG.lipbalm },
    { name: 'Minimalist SPF 30 Lip Balm', mrp: 299, company: 'Minimalist', image: IMG.lipbalm },
    // Hair Care
    { name: 'Minimalist 18% Hair Actives Growth Serum', mrp: 799, company: 'Minimalist', image: IMG.hairserum },
    { name: 'Minimalist Anti-Dandruff Hair Serum', mrp: 499, company: 'Minimalist', image: IMG.hairserum },
    { name: 'Minimalist Frizz Control Complex SPF 30 Hair Serum', mrp: 599, company: 'Minimalist', image: IMG.hairserum },
    { name: 'Minimalist Frizz Control Complex Hair Serum 10ml', mrp: 199, company: 'Minimalist', image: IMG.hairserum },
    // Repair & Bond
    { name: 'Minimalist 5% Maleic Bond Repair Complex', mrp: 199, company: 'Minimalist', image: IMG.serum },
  ],

  // =========== SKIN CARE - CETAPHIL ===========
  'Cetaphil': [
    // Cleansers
    { name: 'Cetaphil Gentle Skin Cleanser Face Wash 236ml', mrp: 769, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Oily Skin Cleanser 118ml', mrp: 749, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Bright Healthy Radiance Creamy Cleanser 100g', mrp: 799, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Gentle Exfoliating SA Face Cleanser 236ml', mrp: 1250, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Gentle Skin Cleanser 1 Ltr', mrp: 1899, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Gentle Skin Cleanser 118ml', mrp: 459, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Hydrating Foaming Cream Face Cleanser 236ml', mrp: 1050, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Gentle Exfoliating & Hydrating SA Face Cleanser 236ml', mrp: 1450, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Oil Control Foam Face Wash 236ml', mrp: 1050, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1643747238009-6863ea63e78d?w=200&h=200&fit=crop' },
    // Moisturizers & Lotions
    { name: 'Cetaphil Moisturizing Lotion 100ml', mrp: 789, company: 'Cetaphil', image: 'https://images.pexels.com/photos/7038225/pexels-photo-7038225.jpeg?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Moisturizing Lotion 473ml', mrp: 1799, company: 'Cetaphil', image: 'https://images.pexels.com/photos/7038225/pexels-photo-7038225.jpeg?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Moisturizing Cream 80g', mrp: 899, company: 'Cetaphil', image: 'https://images.pexels.com/photos/7038225/pexels-photo-7038225.jpeg?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Daily Advance Ultra Hydrating Moisturizer 30g', mrp: 279, company: 'Cetaphil', image: 'https://images.pexels.com/photos/7038225/pexels-photo-7038225.jpeg?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Optimal Hydration Face Cream 50g', mrp: 1299, company: 'Cetaphil', image: 'https://images.pexels.com/photos/7038225/pexels-photo-7038225.jpeg?auto=compress&w=200&h=200&fit=crop' },
    // Brightening & Radiance
    { name: 'Cetaphil Bright Healthy Radiance Face Cream 50g', mrp: 1299, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1750085036829-ae889357991f?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Bright Healthy Radiance Night Cream 50g', mrp: 1299, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1750085036829-ae889357991f?w=200&h=200&fit=crop' },
    // Serums
    { name: 'Cetaphil BHR Glow Perfecting Face Serum 10ml', mrp: 990, company: 'Cetaphil', image: IMG.serumBottle },
    { name: 'Cetaphil BHR Perfecting Face Serum 30ml', mrp: 2299, company: 'Cetaphil', image: IMG.serumBottle },
    { name: 'Cetaphil Optimal Hydration Activation Face Serum 30ml', mrp: 849, company: 'Cetaphil', image: IMG.serumBottle },
    // Soap Bars
    { name: 'Cetaphil Cleansing & Moisturising Syndet Soap 75g', mrp: 225, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1750085036829-ae889357991f?w=200&h=200&fit=crop' },
    { name: 'Cetaphil Cleansing & Moisturising Syndet Soap Bar 4x100g', mrp: 800, company: 'Cetaphil', image: 'https://images.unsplash.com/photo-1750085036829-ae889357991f?w=200&h=200&fit=crop' },
    // Baby Care
    { name: 'Cetaphil Advanced Protection Baby Cream 85g', mrp: 749, company: 'Cetaphil', image: 'https://images.pexels.com/photos/31110098/pexels-photo-31110098.png?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Baby Moisturising Oil 200ml', mrp: 749, company: 'Cetaphil', image: 'https://images.pexels.com/photos/31110098/pexels-photo-31110098.png?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Baby Shampoo 200ml', mrp: 728, company: 'Cetaphil', image: 'https://images.pexels.com/photos/31110098/pexels-photo-31110098.png?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Baby Wash & Shampoo 230ml', mrp: 849, company: 'Cetaphil', image: 'https://images.pexels.com/photos/31110098/pexels-photo-31110098.png?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Mild Baby Soap Bar 4x100g', mrp: 756, company: 'Cetaphil', image: 'https://images.pexels.com/photos/31110098/pexels-photo-31110098.png?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Mild Bar Baby Soap 75g', mrp: 238, company: 'Cetaphil', image: 'https://images.pexels.com/photos/31110098/pexels-photo-31110098.png?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Moisturising Bath & Baby Wash 230ml', mrp: 819, company: 'Cetaphil', image: 'https://images.pexels.com/photos/31110098/pexels-photo-31110098.png?auto=compress&w=200&h=200&fit=crop' },
    { name: 'Cetaphil Soothing Moisturising Baby Cream 100g', mrp: 499, company: 'Cetaphil', image: 'https://images.pexels.com/photos/31110098/pexels-photo-31110098.png?auto=compress&w=200&h=200&fit=crop' },
    // Sunscreen
    { name: 'Cetaphil Light Sunscreen Gel SPF 50+ 50ml', mrp: 1299, company: 'Cetaphil', image: IMG.sunscreen },
  ],
};

export default LIVEASY_PRODUCTS;
