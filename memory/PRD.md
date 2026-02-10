# Nevika Cura Healthcare Platform - PRD

## Original Problem Statement
Multi-portal healthcare platform with specialized portals: DiaGyn, Mango Health Labs, Orange Pharmacy, FaithCare, INNERSCORE, and Reneu.

## Latest Updates (February 11, 2026)

### Completed This Session:

#### FaithCare Ismaili Features:
1. **Salgirah Date Fixed** - Changed from December 13 to **October 12**
2. **Nearest Jamatkhana Finder** - Find Jamatkhanas in India, USA, Canada
   - Location-based search using GPS
   - Filter by country
   - Shows distance in km
3. **Ramadan Diet Plans** - Specialized diets for:
   - **Diabetic**: Blood sugar management during fasting
   - **Hypertension**: Low-sodium diet during Ramadan
   - **Renal (Kidney)**: CKD-friendly fasting guide
   - Each plan includes Sehri/Iftar tips, foods to eat/avoid, monitoring guidance

#### UI Updates:
1. **Mango Logo Reverted** - Using original image logo with orange theme
2. **FaithCare Card** - Using dove logo on home page
3. **Orange Theme** - Mango portal maintains orange gradient header

### Ismaili Calendar Events:
- **Imamat Day**: July 11
- **Salgirah**: October 12 (Birthday of HH Aga Khan)
- **Navroz**: March 21 (Persian New Year)

### Jamatkhana Locations Available:
**India:** Mumbai (Hasanabad, Khetwadi, Dongri), Ahmedabad, Bangalore, Kolkata
**USA:** New York, Houston, Chicago, Los Angeles, Atlanta, Dallas, San Francisco
**Canada:** Toronto, Vancouver, Calgary, Edmonton, Montreal, Ottawa

## Architecture
```
/app
├── backend
│   ├── routes/
│   │   └── lifealign.py       # Jamatkhana & Diet Plan APIs
│   ├── models/
│   │   └── lifealign.py       # Jamatkhana DB, Diet Plans data
│   └── server.py
├── frontend
│   └── src/
│       ├── pages/
│       │   ├── FaithCare.jsx  # Dashboard with new features
│       │   ├── Mango.js       # Orange theme, original logo
│       │   └── Home.js        # FaithCare card with dove logo
```

## Key API Endpoints
- `GET /api/lifealign/jamatkhanas` - Get Jamatkhanas (filter by country, lat/lng)
- `GET /api/lifealign/jamatkhanas/nearest` - Get nearest Jamatkhana
- `GET /api/lifealign/ramadan/diet-plans` - All diet plans
- `GET /api/lifealign/ramadan/diet-plan/{condition}` - Specific plan (diabetic/hypertension/renal)
- `GET /api/lifealign/ramadan/calendar` - Ramadan calendar with timings

## Test Credentials
- **FaithCare**: FC2026001 / faith@care001
- **Staff Portal**: staff_mango / test

## Backlog / Future Tasks
1. Add more Jamatkhana locations globally
2. Real-time timezone detection for abroad users
3. Integrate with Google Maps for directions
4. Add notification reminders for Sehri/Iftar times
5. Expand diet plans to other fasting traditions (Hindu, Jain, Christian)
