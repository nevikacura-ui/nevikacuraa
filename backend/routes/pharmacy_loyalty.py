"""
Orange Pharmacy Loyalty & Subscription Program
Tier-based loyalty system with Bronze, Silver, and Gold benefits
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/pharmacy/loyalty", tags=["Pharmacy Loyalty"])

# Loyalty Tier Configuration
LOYALTY_TIERS = {
    "bronze": {
        "name": "Bronze",
        "min_amount": 0,
        "points_per_100": 1,
        "diagnostics_multiplier": 2,
        "medicine_discount_percent": 0,
        "free_delivery_min": 500,
        "color": "#CD7F32"
    },
    "silver": {
        "name": "Silver", 
        "min_amount": 500,
        "points_per_100": 1,
        "diagnostics_multiplier": 2,
        "medicine_discount_percent": 5,
        "free_delivery_min": 0,  # Free delivery
        "color": "#C0C0C0"
    },
    "gold": {
        "name": "Gold",
        "min_amount": 1000,
        "points_per_100": 1,
        "diagnostics_multiplier": 2,
        "medicine_discount_percent": 10,
        "free_delivery_min": 0,  # Free delivery
        "visits_for_reward": 10,
        "color": "#FFD700"
    }
}

# Helper
def get_db():
    from server import db
    return db

def get_tier_for_amount(amount: float) -> str:
    """Determine tier based on billing amount"""
    if amount >= 1000:
        return "gold"
    elif amount >= 500:
        return "silver"
    return "bronze"

def calculate_loyalty_points(amount: float, is_diagnostic: bool = False) -> int:
    """Calculate loyalty points for a transaction"""
    base_points = int(amount // 100)  # ₹100 = 1 point
    if is_diagnostic:
        base_points *= 2  # 2x points for diagnostics
    return base_points

# Models
class LoyaltyTransaction(BaseModel):
    user_id: str
    order_id: str
    order_type: str  # pharmacy, diagnostic
    amount: float
    tier: str
    points_earned: int
    is_medicine_refill: bool = False

class RedeemPoints(BaseModel):
    points: int
    order_id: str

class GoldVisitRecord(BaseModel):
    user_id: str
    order_id: str
    amount: float

# Routes
@router.get("/tiers")
async def get_loyalty_tiers():
    """Get all loyalty tier information"""
    return {
        "tiers": LOYALTY_TIERS,
        "how_it_works": [
            "Customer tier is decided per billing amount",
            "Share your registered mobile number at billing",
            "Loyalty points and visit count are added automatically",
            "All rewards and status can be tracked via the Nevika Cura app"
        ]
    }

@router.get("/user-status")
async def get_user_loyalty_status(user_id: str):
    """Get user's loyalty status including points and Gold visit count"""
    db = get_db()
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get loyalty data
    loyalty_data = await db.user_loyalty.find_one({"user_id": user_id}, {"_id": 0})
    
    if not loyalty_data:
        loyalty_data = {
            "user_id": user_id,
            "total_points": user.get("loyalty_points", 0),
            "gold_visits": 0,
            "gold_reward_claimed": False,
            "total_orders": 0,
            "total_spent": 0
        }
    
    # Calculate current tier based on average order value
    current_tier = "bronze"
    if loyalty_data.get("total_orders", 0) > 0:
        avg_order = loyalty_data.get("total_spent", 0) / loyalty_data.get("total_orders", 1)
        current_tier = get_tier_for_amount(avg_order)
    
    return {
        "user_name": user.get("name", "User"),
        "loyalty_points": loyalty_data.get("total_points", user.get("loyalty_points", 0)),
        "gold_visits": loyalty_data.get("gold_visits", 0),
        "visits_to_gold_reward": max(0, 10 - loyalty_data.get("gold_visits", 0)),
        "gold_reward_eligible": loyalty_data.get("gold_visits", 0) >= 10 and not loyalty_data.get("gold_reward_claimed", False),
        "gold_reward_claimed": loyalty_data.get("gold_reward_claimed", False),
        "total_orders": loyalty_data.get("total_orders", 0),
        "total_spent": loyalty_data.get("total_spent", 0),
        "frequent_tier": current_tier,
        "tier_info": LOYALTY_TIERS.get(current_tier, LOYALTY_TIERS["bronze"])
    }

@router.post("/record-transaction")
async def record_loyalty_transaction(transaction: LoyaltyTransaction):
    """Record a loyalty transaction after order completion"""
    db = get_db()
    
    # Calculate tier and points
    tier = get_tier_for_amount(transaction.amount)
    is_diagnostic = transaction.order_type == "diagnostic"
    points_earned = calculate_loyalty_points(transaction.amount, is_diagnostic)
    
    # Bonus points for medicine refills
    bonus_points = 20 if transaction.is_medicine_refill else 0
    total_points = points_earned + bonus_points
    
    # Record transaction
    tx_record = {
        "id": str(uuid.uuid4()),
        "user_id": transaction.user_id,
        "order_id": transaction.order_id,
        "order_type": transaction.order_type,
        "amount": transaction.amount,
        "tier": tier,
        "points_earned": total_points,
        "bonus_points": bonus_points,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.loyalty_transactions.insert_one(tx_record)
    
    # Update user loyalty data
    update_data = {
        "$inc": {
            "total_points": total_points,
            "total_orders": 1,
            "total_spent": transaction.amount
        }
    }
    
    # Increment gold visits if gold tier
    if tier == "gold":
        update_data["$inc"]["gold_visits"] = 1
    
    await db.user_loyalty.update_one(
        {"user_id": transaction.user_id},
        update_data,
        upsert=True
    )
    
    # Also update main user document
    await db.users.update_one(
        {"id": transaction.user_id},
        {"$inc": {"loyalty_points": total_points}}
    )
    
    # Get updated status
    loyalty_data = await db.user_loyalty.find_one({"user_id": transaction.user_id}, {"_id": 0})
    
    return {
        "success": True,
        "transaction": {k: v for k, v in tx_record.items() if k != "_id"},
        "tier_applied": tier,
        "points_earned": total_points,
        "gold_visits": loyalty_data.get("gold_visits", 0) if loyalty_data else 0,
        "gold_reward_eligible": loyalty_data.get("gold_visits", 0) >= 10 if loyalty_data else False
    }

@router.post("/claim-gold-reward")
async def claim_gold_reward(user_id: str):
    """Claim Gold tier 10-visit reward"""
    db = get_db()
    
    loyalty_data = await db.user_loyalty.find_one({"user_id": user_id})
    if not loyalty_data:
        raise HTTPException(status_code=404, detail="Loyalty data not found")
    
    if loyalty_data.get("gold_visits", 0) < 10:
        raise HTTPException(status_code=400, detail=f"Need {10 - loyalty_data.get('gold_visits', 0)} more Gold visits")
    
    if loyalty_data.get("gold_reward_claimed", False):
        raise HTTPException(status_code=400, detail="Gold reward already claimed")
    
    # Mark reward as claimed and create reward record
    await db.user_loyalty.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "gold_reward_claimed": True,
                "gold_reward_claimed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create reward voucher
    reward = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "gold_10_visit_reward",
        "benefits": [
            "15% Extra Discount on next order",
            "Free Delivery (3 orders)",
            "Free Basic Health Checkup worth ₹500"
        ],
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.loyalty_rewards.insert_one(reward)
    
    return {
        "success": True,
        "message": "Congratulations! Gold 10-visit reward claimed!",
        "reward": {k: v for k, v in reward.items() if k != "_id"}
    }

@router.get("/calculate-benefits")
async def calculate_order_benefits(amount: float, order_type: str = "pharmacy", is_refill: bool = False):
    """Calculate benefits for a given order amount"""
    tier = get_tier_for_amount(amount)
    tier_info = LOYALTY_TIERS[tier]
    
    is_diagnostic = order_type == "diagnostic"
    points = calculate_loyalty_points(amount, is_diagnostic)
    bonus = 20 if is_refill else 0
    
    discount = 0
    if tier in ["silver", "gold"]:
        discount = amount * (tier_info["medicine_discount_percent"] / 100)
    
    free_delivery = tier_info["free_delivery_min"] == 0 or amount >= tier_info["free_delivery_min"]
    
    return {
        "tier": tier,
        "tier_name": tier_info["name"],
        "tier_color": tier_info["color"],
        "points_earned": points + bonus,
        "base_points": points,
        "bonus_points": bonus,
        "discount_percent": tier_info["medicine_discount_percent"],
        "discount_amount": round(discount, 2),
        "free_delivery": free_delivery,
        "final_amount": round(amount - discount, 2)
    }

@router.get("/history")
async def get_loyalty_history(user_id: str, page: int = 1, limit: int = 20):
    """Get user's loyalty transaction history"""
    db = get_db()
    
    skip = (page - 1) * limit
    total = await db.loyalty_transactions.count_documents({"user_id": user_id})
    
    transactions = await db.loyalty_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "transactions": transactions,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/terms-and-conditions")
async def get_loyalty_terms():
    """Get Loyalty Program Terms & Conditions"""
    return {
        "title": "Orange Pharmacy Loyalty & Subscription Program - Terms & Conditions",
        "effective_date": "January 1, 2026",
        "sections": [
            {
                "title": "1. Program Overview",
                "content": [
                    "1.1 The Orange Pharmacy Loyalty Program ('Program') is operated by Nevika Cura Healthcare ('Company').",
                    "1.2 By participating in the Program, you agree to these Terms and Conditions.",
                    "1.3 The Program offers tier-based benefits (Bronze, Silver, Gold) determined by billing amount per transaction."
                ]
            },
            {
                "title": "2. Eligibility",
                "content": [
                    "2.1 The Program is open to all customers with a valid registered mobile number.",
                    "2.2 Participants must be 18 years or older.",
                    "2.3 Employees of Nevika Cura and their immediate family members may participate but are not eligible for special promotions."
                ]
            },
            {
                "title": "3. Tier Benefits",
                "content": [
                    "3.1 BRONZE (Any purchase): Earn 1 loyalty point per ₹100 spent. 2× points on diagnostics.",
                    "3.2 SILVER (₹500+ per bill): All Bronze benefits plus extra discount on medicines and free delivery.",
                    "3.3 GOLD (₹1000+ per bill): All Silver benefits plus 10-visit reward tracking.",
                    "3.4 Tier is determined per transaction based on billing amount. Benefits apply only to the qualifying bill."
                ]
            },
            {
                "title": "4. Loyalty Points",
                "content": [
                    "4.1 Points are earned on eligible purchases at the rate of 1 point per ₹100 spent.",
                    "4.2 Diagnostic purchases earn 2× loyalty points.",
                    "4.3 Regular medicine refills earn 20 bonus points.",
                    "4.4 Points are added automatically after successful payment.",
                    "4.5 Points can be redeemed for discounts at the rate of 100 points = ₹10.",
                    "4.6 Points have no cash value and cannot be transferred or sold.",
                    "4.7 Points expire 12 months from the date of earning if not redeemed."
                ]
            },
            {
                "title": "5. Gold 10-Visit Reward",
                "content": [
                    "5.1 Gold members (₹1000+ per transaction) earn 1 visit credit per qualifying transaction.",
                    "5.2 After 10 qualifying Gold visits, members become eligible for the Gold Reward.",
                    "5.3 Gold Reward includes: Extra discount, free delivery on 3 orders, and free/discounted health checkup.",
                    "5.4 The Gold Reward must be claimed within 90 days of eligibility.",
                    "5.5 Visit count resets after claiming the reward.",
                    "5.6 Visit count and reward status are tracked automatically through the Nevika Cura app."
                ]
            },
            {
                "title": "6. Redemption",
                "content": [
                    "6.1 Points can be redeemed during checkout on the Nevika Cura app or website.",
                    "6.2 Minimum redemption is 100 points (₹10 value).",
                    "6.3 Points cannot be redeemed for cash.",
                    "6.4 Points must be redeemed before the order is placed.",
                    "6.5 Redemption is final and cannot be reversed."
                ]
            },
            {
                "title": "7. Program Changes",
                "content": [
                    "7.1 The Company reserves the right to modify, suspend, or terminate the Program at any time.",
                    "7.2 Changes will be communicated via the app, email, or SMS.",
                    "7.3 Accumulated points will remain valid for 30 days after any program termination notice.",
                    "7.4 The Company may change point earning rates, redemption values, or tier thresholds with 15 days notice."
                ]
            },
            {
                "title": "8. Account Termination",
                "content": [
                    "8.1 The Company may terminate membership for fraudulent activity, abuse, or violation of terms.",
                    "8.2 Upon termination, all accumulated points and benefits are forfeited.",
                    "8.3 Members may voluntarily close their account by contacting customer support."
                ]
            },
            {
                "title": "9. Privacy",
                "content": [
                    "9.1 Personal information collected is governed by our Privacy Policy.",
                    "9.2 Transaction data is used to calculate points and provide personalized offers.",
                    "9.3 We do not sell personal information to third parties."
                ]
            },
            {
                "title": "10. Limitation of Liability",
                "content": [
                    "10.1 The Program is provided 'as is' without warranties of any kind.",
                    "10.2 The Company is not liable for any loss or damage arising from participation.",
                    "10.3 In no event shall liability exceed the value of points in the member's account."
                ]
            },
            {
                "title": "11. Governing Law",
                "content": [
                    "11.1 These Terms are governed by the laws of India.",
                    "11.2 Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.",
                    "11.3 If any provision is found invalid, the remaining provisions remain in effect."
                ]
            },
            {
                "title": "12. Contact Information",
                "content": [
                    "For questions about the Loyalty Program:",
                    "Email: nevikacura@gmail.com",
                    "Phone: +91 8108500511 (Orange Pharmacy)",
                    "Address: Nevika Cura Healthcare, Mumbai, Maharashtra, India"
                ]
            }
        ],
        "last_updated": "January 13, 2026",
        "acceptance": "By participating in the Orange Pharmacy Loyalty Program, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions."
    }

@router.get("/faq")
async def get_loyalty_faq():
    """Get Loyalty Program FAQ"""
    return {
        "title": "Orange Pharmacy Loyalty Program - FAQ",
        "faqs": [
            {
                "q": "How do I join the Loyalty Program?",
                "a": "Simply share your registered mobile number at billing. The program is free to join and you automatically start earning points on every purchase."
            },
            {
                "q": "How are tiers determined?",
                "a": "Your tier is decided per transaction based on your billing amount: Bronze (any amount), Silver (₹500+), Gold (₹1000+). Benefits apply only to the qualifying bill."
            },
            {
                "q": "How do I earn loyalty points?",
                "a": "You earn 1 point for every ₹100 spent on medicines or diagnostics. Diagnostic purchases earn 2× points. Regular medicine refills earn 20 bonus points."
            },
            {
                "q": "How do I redeem my points?",
                "a": "Points can be redeemed during checkout on the Nevika Cura app. 100 points = ₹10 discount. You can also redeem for free delivery."
            },
            {
                "q": "What is the Gold 10-Visit Reward?",
                "a": "After making 10 qualifying purchases of ₹1000 or more each, Gold members become eligible for a special reward including extra discounts, free delivery, and a free health checkup."
            },
            {
                "q": "Do my points expire?",
                "a": "Yes, points expire 12 months from the date of earning if not redeemed. We'll send you a reminder before expiry."
            },
            {
                "q": "Can I transfer my points to someone else?",
                "a": "No, loyalty points are non-transferable and linked to your registered mobile number."
            },
            {
                "q": "How do I check my points balance?",
                "a": "You can check your points, tier status, and Gold visit count anytime on the Nevika Cura app under the Pharmacy section."
            },
            {
                "q": "What if I return a product?",
                "a": "Points earned on returned items will be deducted from your account. If you've already redeemed those points, the equivalent amount will be adjusted."
            },
            {
                "q": "Are there any products excluded from earning points?",
                "a": "Prescription medicines earn full points. Some promotional items or already-discounted products may have reduced or no point earning."
            }
        ]
    }

@router.get("/leaderboard")
async def get_loyalty_leaderboard(limit: int = 10):
    """Get top customers leaderboard"""
    db = get_db()
    
    # Aggregate top customers by points
    pipeline = [
        {"$sort": {"total_points": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "user_id": 1,
            "total_points": 1,
            "gold_visits": 1,
            "total_orders": 1,
            "total_spent": 1
        }}
    ]
    
    top_customers_raw = await db.user_loyalty.aggregate(pipeline).to_list(limit)
    
    # Enrich with user names (anonymized for privacy)
    leaderboard = []
    for idx, customer in enumerate(top_customers_raw):
        # Get user name
        user = await db.users.find_one({"id": customer["user_id"]}, {"_id": 0, "name": 1})
        name = user.get("name", "Anonymous") if user else "Anonymous"
        
        # Anonymize name: "John Doe" -> "J***n D**e"
        if len(name) > 2:
            parts = name.split()
            anonymized_parts = []
            for part in parts:
                if len(part) > 2:
                    anonymized_parts.append(f"{part[0]}{'*' * (len(part)-2)}{part[-1]}")
                else:
                    anonymized_parts.append(part)
            display_name = " ".join(anonymized_parts)
        else:
            display_name = name
        
        # Determine tier
        tier = "bronze"
        if customer.get("gold_visits", 0) >= 5:
            tier = "gold"
        elif customer.get("total_orders", 0) >= 3:
            tier = "silver"
        
        # Badge for top 3
        badge = None
        if idx == 0:
            badge = {"icon": "🥇", "label": "Top Customer"}
        elif idx == 1:
            badge = {"icon": "🥈", "label": "2nd Place"}
        elif idx == 2:
            badge = {"icon": "🥉", "label": "3rd Place"}
        
        leaderboard.append({
            "rank": idx + 1,
            "display_name": display_name,
            "points": customer.get("total_points", 0),
            "gold_visits": customer.get("gold_visits", 0),
            "total_orders": customer.get("total_orders", 0),
            "tier": tier,
            "badge": badge
        })
    
    return {
        "leaderboard": leaderboard,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "total_participants": await db.user_loyalty.count_documents({})
    }
