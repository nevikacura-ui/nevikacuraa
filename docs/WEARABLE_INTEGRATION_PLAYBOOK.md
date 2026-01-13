# Wearable Integration Playbook: Terra & Thryve

## Overview

This playbook covers integration of wearable fitness data into Nevika Cura using two leading aggregator APIs:
- **Terra** - 100+ integrations, great for fitness/wellness apps
- **Thryve** - 500+ devices, HIPAA/GDPR compliant, stable API

Both provide unified APIs that handle the complexity of individual wearable integrations.

---

## 1. TERRA API Integration

### Overview
- **Website**: https://tryterra.co
- **Docs**: https://docs.tryterra.co
- **Supported Devices**: 100+ (Fitbit, Garmin, Apple Watch, Oura, Whoop, Samsung, etc.)
- **Data Types**: Activity, Sleep, Body, Nutrition, Daily, Menstruation
- **Pricing**: Free tier available, paid plans based on users

### Getting Started

#### Step 1: Create Terra Account
1. Sign up at https://dashboard.tryterra.co
2. Get your API credentials:
   - `API_KEY` (x-api-key header)
   - `DEV_ID` (dev-id header)

#### Step 2: Backend Integration (Python/FastAPI)

```python
# Install Terra SDK
# pip install terra-python

import requests
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta

router = APIRouter(prefix="/wearables", tags=["Wearables"])

TERRA_API_KEY = "your-api-key"
TERRA_DEV_ID = "your-dev-id"
TERRA_BASE_URL = "https://api.tryterra.co/v2"

headers = {
    "x-api-key": TERRA_API_KEY,
    "dev-id": TERRA_DEV_ID,
    "Content-Type": "application/json"
}

# Generate authentication widget session
@router.post("/terra/auth-widget")
async def generate_terra_widget(user_id: str):
    """Generate Terra auth widget for user to connect their wearable"""
    response = requests.post(
        f"{TERRA_BASE_URL}/auth/generateWidgetSession",
        headers=headers,
        json={
            "reference_id": user_id,  # Your internal user ID
            "providers": "FITBIT,GARMIN,OURA,WHOOP,APPLE,GOOGLE",
            "language": "en",
            "auth_success_redirect_url": "https://yourapp.com/wearable-connected",
            "auth_failure_redirect_url": "https://yourapp.com/wearable-failed"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        return {
            "widget_url": data.get("url"),
            "session_id": data.get("session_id")
        }
    raise HTTPException(status_code=400, detail="Failed to generate widget")

# Get user's activity data
@router.get("/terra/activity/{terra_user_id}")
async def get_activity_data(terra_user_id: str, days: int = 7):
    """Get activity data for a Terra user"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    response = requests.get(
        f"{TERRA_BASE_URL}/activity",
        headers=headers,
        params={
            "user_id": terra_user_id,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "to_webhook": "false"
        }
    )
    
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=400, detail="Failed to fetch activity")

# Get sleep data
@router.get("/terra/sleep/{terra_user_id}")
async def get_sleep_data(terra_user_id: str, days: int = 7):
    """Get sleep data for a Terra user"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    response = requests.get(
        f"{TERRA_BASE_URL}/sleep",
        headers=headers,
        params={
            "user_id": terra_user_id,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
    )
    
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=400, detail="Failed to fetch sleep data")

# Get body metrics (weight, body fat, etc.)
@router.get("/terra/body/{terra_user_id}")
async def get_body_data(terra_user_id: str, days: int = 30):
    """Get body composition data"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    response = requests.get(
        f"{TERRA_BASE_URL}/body",
        headers=headers,
        params={
            "user_id": terra_user_id,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
    )
    
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=400, detail="Failed to fetch body data")

# Webhook handler for real-time data
@router.post("/terra/webhook")
async def terra_webhook(payload: dict):
    """Handle Terra webhooks for real-time data updates"""
    event_type = payload.get("type")
    user = payload.get("user", {})
    data = payload.get("data", [])
    
    # Process based on event type
    if event_type == "activity":
        # Store activity data
        pass
    elif event_type == "sleep":
        # Store sleep data
        pass
    elif event_type == "body":
        # Store body data
        pass
    elif event_type == "user_reauth":
        # User needs to re-authenticate
        pass
    
    return {"status": "received"}
```

#### Step 3: Frontend Integration (React)

```jsx
// WearableConnect.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Watch, Activity, Moon, Heart } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const WearableConnect = ({ userId }) => {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const connectWearable = async () => {
    setConnecting(true);
    try {
      const response = await axios.post(`${API}/api/wearables/terra/auth-widget`, null, {
        params: { user_id: userId }
      });
      
      // Open Terra widget in popup or redirect
      window.open(response.data.widget_url, 'TerraConnect', 'width=500,height=700');
    } catch (error) {
      console.error('Failed to connect wearable:', error);
    }
    setConnecting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Watch className="w-5 h-5" />
          Connect Your Wearable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Sync data from Fitbit, Garmin, Apple Watch, Oura, and more.
        </p>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
            <Activity className="w-6 h-6 text-green-500" />
            <span className="text-xs mt-1">Steps</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
            <Heart className="w-6 h-6 text-red-500" />
            <span className="text-xs mt-1">Heart Rate</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
            <Moon className="w-6 h-6 text-indigo-500" />
            <span className="text-xs mt-1">Sleep</span>
          </div>
        </div>
        
        <Button 
          onClick={connectWearable} 
          disabled={connecting}
          className="w-full"
        >
          {connecting ? 'Connecting...' : 'Connect Wearable'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WearableConnect;
```

### Terra Data Types

| Endpoint | Data Available |
|----------|----------------|
| `/activity` | Steps, calories, distance, active duration, heart rate zones |
| `/sleep` | Sleep stages, duration, efficiency, heart rate during sleep |
| `/body` | Weight, body fat %, BMI, muscle mass |
| `/nutrition` | Calories consumed, macros, water intake |
| `/daily` | Daily summary combining all metrics |
| `/menstruation` | Cycle tracking data |

---

## 2. THRYVE API Integration

### Overview
- **Website**: https://thryve.health
- **Supported Devices**: 500+ (Apple Health, Garmin, Fitbit, Oura, Samsung, Polar, etc.)
- **Data Types**: Activity, Sleep, Heart Rate, Stress, HRV, SPO2
- **Compliance**: GDPR, HIPAA, ISO 9001/27001
- **Data Processing**: Germany (EU)

### Getting Started

#### Step 1: Create Thryve Account
1. Contact Thryve at https://thryve.health for API access
2. Get your API credentials:
   - `APP_ID`
   - `APP_SECRET`
   - `API_KEY`

#### Step 2: Backend Integration (Python/FastAPI)

```python
# Thryve API Integration
import requests
import hashlib
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta

router = APIRouter(prefix="/wearables/thryve", tags=["Thryve Wearables"])

THRYVE_APP_ID = "your-app-id"
THRYVE_APP_SECRET = "your-app-secret"
THRYVE_API_KEY = "your-api-key"
THRYVE_BASE_URL = "https://api.thryve.health/v5"

def get_auth_headers():
    """Generate Thryve authentication headers"""
    return {
        "Authorization": f"Bearer {THRYVE_API_KEY}",
        "Content-Type": "application/json"
    }

# Generate connection URL for user
@router.post("/connect")
async def generate_connection(user_id: str):
    """Generate Thryve connection URL for user"""
    # Create user token (hash of user_id with secret)
    user_token = hashlib.sha256(f"{user_id}{THRYVE_APP_SECRET}".encode()).hexdigest()
    
    response = requests.post(
        f"{THRYVE_BASE_URL}/connect/url",
        headers=get_auth_headers(),
        json={
            "appId": THRYVE_APP_ID,
            "userToken": user_token,
            "partnerUserId": user_id,
            "dataTypes": ["ACTIVITY", "SLEEP", "HEART_RATE", "STEPS", "CALORIES"],
            "redirectUrl": "https://yourapp.com/thryve-callback"
        }
    )
    
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=400, detail="Failed to generate connection")

# Get user's daily data
@router.get("/daily/{user_id}")
async def get_daily_data(user_id: str, days: int = 7):
    """Get daily aggregated data"""
    user_token = hashlib.sha256(f"{user_id}{THRYVE_APP_SECRET}".encode()).hexdigest()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    response = requests.get(
        f"{THRYVE_BASE_URL}/data/daily",
        headers=get_auth_headers(),
        params={
            "userToken": user_token,
            "startDate": start_date.strftime("%Y-%m-%d"),
            "endDate": end_date.strftime("%Y-%m-%d"),
            "dataTypes": "STEPS,CALORIES,DISTANCE,ACTIVE_MINUTES,HEART_RATE"
        }
    )
    
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=400, detail="Failed to fetch daily data")

# Get sleep data
@router.get("/sleep/{user_id}")
async def get_sleep_data(user_id: str, days: int = 7):
    """Get sleep data"""
    user_token = hashlib.sha256(f"{user_id}{THRYVE_APP_SECRET}".encode()).hexdigest()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    response = requests.get(
        f"{THRYVE_BASE_URL}/data/sleep",
        headers=get_auth_headers(),
        params={
            "userToken": user_token,
            "startDate": start_date.strftime("%Y-%m-%d"),
            "endDate": end_date.strftime("%Y-%m-%d")
        }
    )
    
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=400, detail="Failed to fetch sleep data")

# Get heart rate data
@router.get("/heart-rate/{user_id}")
async def get_heart_rate_data(user_id: str, days: int = 7):
    """Get heart rate data"""
    user_token = hashlib.sha256(f"{user_id}{THRYVE_APP_SECRET}".encode()).hexdigest()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    response = requests.get(
        f"{THRYVE_BASE_URL}/data/heartRate",
        headers=get_auth_headers(),
        params={
            "userToken": user_token,
            "startDate": start_date.strftime("%Y-%m-%d"),
            "endDate": end_date.strftime("%Y-%m-%d")
        }
    )
    
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=400, detail="Failed to fetch heart rate")

# Get connected sources for user
@router.get("/sources/{user_id}")
async def get_connected_sources(user_id: str):
    """Get list of connected wearable sources for user"""
    user_token = hashlib.sha256(f"{user_id}{THRYVE_APP_SECRET}".encode()).hexdigest()
    
    response = requests.get(
        f"{THRYVE_BASE_URL}/user/sources",
        headers=get_auth_headers(),
        params={"userToken": user_token}
    )
    
    if response.status_code == 200:
        return response.json()
    raise HTTPException(status_code=400, detail="Failed to fetch sources")

# Webhook handler
@router.post("/webhook")
async def thryve_webhook(payload: dict):
    """Handle Thryve webhooks"""
    event_type = payload.get("type")
    user_id = payload.get("partnerUserId")
    data = payload.get("data")
    
    # Store data based on type
    if event_type == "DATA_UPDATE":
        # New data available
        pass
    elif event_type == "SOURCE_CONNECTED":
        # User connected a new source
        pass
    elif event_type == "SOURCE_DISCONNECTED":
        # User disconnected a source
        pass
    
    return {"status": "ok"}
```

#### Step 3: React Native SDK (Mobile)

```javascript
// For React Native apps
// npm install @thryve/react-native-sdk

import Thryve from '@thryve/react-native-sdk';

// Initialize
Thryve.initialize({
  appId: 'YOUR_APP_ID',
  appSecret: 'YOUR_APP_SECRET'
});

// Connect user
const connectWearable = async (userId) => {
  try {
    await Thryve.connect({
      partnerUserId: userId,
      dataTypes: ['ACTIVITY', 'SLEEP', 'HEART_RATE'],
      sources: ['APPLE_HEALTH', 'GOOGLE_FIT', 'FITBIT', 'GARMIN']
    });
  } catch (error) {
    console.error('Connection failed:', error);
  }
};

// Get data
const fetchData = async (userId) => {
  const data = await Thryve.getDailyData({
    partnerUserId: userId,
    startDate: '2025-01-01',
    endDate: '2025-01-13'
  });
  return data;
};
```

### Thryve Data Types

| Data Type | Description |
|-----------|-------------|
| STEPS | Daily step count |
| CALORIES | Calories burned |
| DISTANCE | Distance traveled |
| ACTIVE_MINUTES | Minutes of activity |
| HEART_RATE | Resting & active heart rate |
| HEART_RATE_VARIABILITY | HRV measurements |
| SLEEP | Sleep duration & stages |
| SPO2 | Blood oxygen levels |
| STRESS | Stress score |
| BODY | Weight, body composition |

---

## 3. Comparison: Terra vs Thryve

| Feature | Terra | Thryve |
|---------|-------|--------|
| **Devices** | 100+ | 500+ |
| **Best For** | Fitness/wellness apps | Healthcare apps |
| **Compliance** | Standard | HIPAA, GDPR, ISO |
| **Data Processing** | US | Germany (EU) |
| **React Support** | Web widget | React Native SDK |
| **Pricing** | Free tier + paid | Contact for pricing |
| **Real-time Data** | Webhooks + BLE streaming | Webhooks |
| **API Stability** | Regular updates | 5+ years stable |

---

## 4. Recommended Implementation for Nevika Cura

### Option A: Use Thryve (Recommended for Healthcare)
- HIPAA compliant out of the box
- More stable API (important for medical apps)
- Better for Glydex (diabetes tracking) integration

### Option B: Use Terra (Good for Fitness Features)
- Free tier to start
- Faster setup with auth widget
- Better documentation

### Option C: Use Both (Best Coverage)
- Thryve for health-critical data (heart rate, SpO2)
- Terra for fitness data (steps, workouts)
- Unified frontend showing combined data

---

## 5. Integration with Glydex (Diabetes)

```python
# Combine wearable data with Glydex blood sugar tracking
@router.get("/glydex/combined-health/{user_id}")
async def get_combined_health_data(user_id: str):
    """Get combined blood sugar + wearable health data"""
    db = get_db()
    
    # Get blood sugar logs
    blood_sugar = await db.blood_sugar_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", -1).limit(30).to_list(30)
    
    # Get wearable activity data (from Terra/Thryve)
    activity = await get_wearable_activity(user_id, days=30)
    
    # Correlate activity with blood sugar
    insights = generate_correlation_insights(blood_sugar, activity)
    
    return {
        "blood_sugar": blood_sugar,
        "activity": activity,
        "insights": insights,
        "correlations": {
            "high_activity_days": "Lower average blood sugar",
            "sleep_quality": "Impact on morning FBS"
        }
    }

def generate_correlation_insights(blood_sugar, activity):
    """Generate insights correlating activity with blood sugar"""
    insights = []
    
    # Example: Check if high step days correlate with better blood sugar
    # This would use actual data analysis in production
    
    insights.append({
        "type": "positive",
        "title": "Activity Impact",
        "message": "Days with 8000+ steps show 15% lower post-meal glucose"
    })
    
    return insights
```

---

## 6. Next Steps

1. **Choose Provider**: Thryve for healthcare compliance, Terra for quick start
2. **Get API Keys**: Sign up and get credentials
3. **Backend Setup**: Add routes to `/app/backend/routes/wearables.py`
4. **Frontend UI**: Build wearable connection and data display components
5. **Glydex Integration**: Correlate activity data with blood sugar trends
6. **Evara Integration**: Sync menstruation data, activity for women's health

---

## Resources

### Terra
- Dashboard: https://dashboard.tryterra.co
- Docs: https://docs.tryterra.co
- Integrations: https://tryterra.co/integrations

### Thryve
- Website: https://thryve.health
- API Docs: Contact for access
- React Native SDK: Available upon registration

