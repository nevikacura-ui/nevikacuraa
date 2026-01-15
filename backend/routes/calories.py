"""
Calories Tracking API Routes
Provides food database and calorie logging for Evara, Glydex, and Alyne modules
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calories", tags=["Calories"])

# ============ Indian Food Database ============
# Comprehensive database with Indian foods categorized by meal type

INDIAN_FOOD_DATABASE = {
    "breakfast": [
        {"name": "Idli (2 pcs)", "calories": 80, "protein": 2, "carbs": 17, "fat": 0.4, "fiber": 0.5, "category": "South Indian"},
        {"name": "Dosa (Plain)", "calories": 120, "protein": 3, "carbs": 20, "fat": 3.5, "fiber": 1, "category": "South Indian"},
        {"name": "Masala Dosa", "calories": 206, "protein": 5, "carbs": 28, "fat": 9, "fiber": 2, "category": "South Indian"},
        {"name": "Upma (1 cup)", "calories": 170, "protein": 4, "carbs": 28, "fat": 5, "fiber": 2, "category": "South Indian"},
        {"name": "Poha (1 cup)", "calories": 180, "protein": 4, "carbs": 32, "fat": 5, "fiber": 1, "category": "Maharashtrian"},
        {"name": "Paratha (Plain)", "calories": 150, "protein": 4, "carbs": 24, "fat": 5, "fiber": 1, "category": "North Indian"},
        {"name": "Aloo Paratha", "calories": 250, "protein": 6, "carbs": 35, "fat": 10, "fiber": 2, "category": "North Indian"},
        {"name": "Gobi Paratha", "calories": 230, "protein": 5, "carbs": 32, "fat": 9, "fiber": 3, "category": "North Indian"},
        {"name": "Paneer Paratha", "calories": 280, "protein": 10, "carbs": 30, "fat": 13, "fiber": 1, "category": "North Indian"},
        {"name": "Puri (2 pcs)", "calories": 200, "protein": 4, "carbs": 28, "fat": 8, "fiber": 1, "category": "North Indian"},
        {"name": "Chole Bhature", "calories": 450, "protein": 12, "carbs": 55, "fat": 20, "fiber": 8, "category": "Punjabi"},
        {"name": "Medu Vada (2 pcs)", "calories": 170, "protein": 6, "carbs": 22, "fat": 6, "fiber": 1, "category": "South Indian"},
        {"name": "Uttapam", "calories": 160, "protein": 5, "carbs": 25, "fat": 5, "fiber": 2, "category": "South Indian"},
        {"name": "Pesarattu", "calories": 110, "protein": 7, "carbs": 15, "fat": 2, "fiber": 3, "category": "Andhra"},
        {"name": "Appam (2 pcs)", "calories": 120, "protein": 2, "carbs": 22, "fat": 3, "fiber": 1, "category": "Kerala"},
        {"name": "Puttu (1 cup)", "calories": 180, "protein": 3, "carbs": 35, "fat": 4, "fiber": 2, "category": "Kerala"},
        {"name": "Dhokla (4 pcs)", "calories": 140, "protein": 6, "carbs": 20, "fat": 4, "fiber": 1, "category": "Gujarati"},
        {"name": "Thepla (2 pcs)", "calories": 200, "protein": 5, "carbs": 28, "fat": 8, "fiber": 2, "category": "Gujarati"},
        {"name": "Bread Toast with Butter", "calories": 180, "protein": 4, "carbs": 22, "fat": 8, "fiber": 1, "category": "Continental"},
        {"name": "Omelette (2 eggs)", "calories": 180, "protein": 13, "carbs": 1, "fat": 14, "fiber": 0, "category": "Continental"},
        {"name": "Boiled Eggs (2)", "calories": 140, "protein": 12, "carbs": 1, "fat": 10, "fiber": 0, "category": "Continental"},
        {"name": "Cornflakes with Milk", "calories": 200, "protein": 7, "carbs": 35, "fat": 4, "fiber": 1, "category": "Continental"},
        {"name": "Oats Porridge", "calories": 150, "protein": 5, "carbs": 27, "fat": 3, "fiber": 4, "category": "Healthy"},
        {"name": "Muesli with Yogurt", "calories": 250, "protein": 8, "carbs": 40, "fat": 6, "fiber": 5, "category": "Healthy"},
        {"name": "Moong Dal Chilla", "calories": 120, "protein": 8, "carbs": 15, "fat": 3, "fiber": 2, "category": "Healthy"},
        {"name": "Besan Chilla", "calories": 150, "protein": 7, "carbs": 18, "fat": 5, "fiber": 3, "category": "North Indian"},
        {"name": "Ragi Dosa", "calories": 100, "protein": 4, "carbs": 18, "fat": 2, "fiber": 4, "category": "Healthy"},
        {"name": "Sabudana Khichdi", "calories": 220, "protein": 3, "carbs": 40, "fat": 6, "fiber": 1, "category": "Maharashtrian"},
    ],
    "lunch": [
        {"name": "Rice (1 cup cooked)", "calories": 130, "protein": 3, "carbs": 28, "fat": 0.3, "fiber": 0.4, "category": "Staple"},
        {"name": "Roti/Chapati", "calories": 70, "protein": 2.5, "carbs": 14, "fat": 0.5, "fiber": 1, "category": "Staple"},
        {"name": "Dal Tadka (1 cup)", "calories": 150, "protein": 8, "carbs": 20, "fat": 5, "fiber": 4, "category": "Dal"},
        {"name": "Dal Fry (1 cup)", "calories": 180, "protein": 9, "carbs": 22, "fat": 7, "fiber": 5, "category": "Dal"},
        {"name": "Sambar (1 cup)", "calories": 140, "protein": 6, "carbs": 20, "fat": 4, "fiber": 5, "category": "South Indian"},
        {"name": "Rasam (1 cup)", "calories": 50, "protein": 2, "carbs": 10, "fat": 0.5, "fiber": 2, "category": "South Indian"},
        {"name": "Rajma (1 cup)", "calories": 220, "protein": 12, "carbs": 35, "fat": 4, "fiber": 10, "category": "Punjabi"},
        {"name": "Chole (1 cup)", "calories": 200, "protein": 10, "carbs": 30, "fat": 5, "fiber": 8, "category": "Punjabi"},
        {"name": "Kadhi (1 cup)", "calories": 150, "protein": 5, "carbs": 12, "fat": 9, "fiber": 1, "category": "North Indian"},
        {"name": "Palak Paneer", "calories": 280, "protein": 14, "carbs": 12, "fat": 20, "fiber": 4, "category": "North Indian"},
        {"name": "Paneer Butter Masala", "calories": 350, "protein": 15, "carbs": 15, "fat": 26, "fiber": 2, "category": "North Indian"},
        {"name": "Shahi Paneer", "calories": 320, "protein": 14, "carbs": 14, "fat": 24, "fiber": 2, "category": "North Indian"},
        {"name": "Mutter Paneer", "calories": 280, "protein": 13, "carbs": 18, "fat": 18, "fiber": 4, "category": "North Indian"},
        {"name": "Aloo Gobi (1 cup)", "calories": 150, "protein": 4, "carbs": 20, "fat": 6, "fiber": 4, "category": "North Indian"},
        {"name": "Bhindi Masala (1 cup)", "calories": 120, "protein": 3, "carbs": 14, "fat": 6, "fiber": 5, "category": "North Indian"},
        {"name": "Baingan Bharta", "calories": 140, "protein": 3, "carbs": 15, "fat": 8, "fiber": 6, "category": "North Indian"},
        {"name": "Mixed Veg Curry", "calories": 160, "protein": 5, "carbs": 18, "fat": 7, "fiber": 5, "category": "North Indian"},
        {"name": "Chicken Curry (150g)", "calories": 280, "protein": 25, "carbs": 8, "fat": 16, "fiber": 2, "category": "Non-Veg"},
        {"name": "Butter Chicken (150g)", "calories": 350, "protein": 28, "carbs": 10, "fat": 22, "fiber": 1, "category": "Non-Veg"},
        {"name": "Chicken Biryani", "calories": 400, "protein": 20, "carbs": 45, "fat": 16, "fiber": 2, "category": "Non-Veg"},
        {"name": "Veg Biryani", "calories": 320, "protein": 8, "carbs": 50, "fat": 10, "fiber": 4, "category": "Rice Dish"},
        {"name": "Jeera Rice", "calories": 180, "protein": 4, "carbs": 35, "fat": 3, "fiber": 1, "category": "Rice Dish"},
        {"name": "Pulao", "calories": 220, "protein": 5, "carbs": 38, "fat": 6, "fiber": 2, "category": "Rice Dish"},
        {"name": "Fish Curry (150g)", "calories": 250, "protein": 22, "carbs": 8, "fat": 14, "fiber": 1, "category": "Non-Veg"},
        {"name": "Egg Curry (2 eggs)", "calories": 240, "protein": 14, "carbs": 10, "fat": 16, "fiber": 2, "category": "Non-Veg"},
        {"name": "Mutton Curry (150g)", "calories": 350, "protein": 28, "carbs": 8, "fat": 24, "fiber": 1, "category": "Non-Veg"},
        {"name": "Prawn Curry (150g)", "calories": 200, "protein": 24, "carbs": 6, "fat": 8, "fiber": 1, "category": "Non-Veg"},
        {"name": "Curd Rice", "calories": 180, "protein": 6, "carbs": 30, "fat": 4, "fiber": 1, "category": "South Indian"},
        {"name": "Lemon Rice", "calories": 200, "protein": 4, "carbs": 38, "fat": 5, "fiber": 2, "category": "South Indian"},
        {"name": "Tamarind Rice", "calories": 210, "protein": 4, "carbs": 40, "fat": 5, "fiber": 2, "category": "South Indian"},
    ],
    "dinner": [
        {"name": "Roti (2 pcs)", "calories": 140, "protein": 5, "carbs": 28, "fat": 1, "fiber": 2, "category": "Staple"},
        {"name": "Missi Roti", "calories": 120, "protein": 5, "carbs": 20, "fat": 3, "fiber": 3, "category": "North Indian"},
        {"name": "Naan", "calories": 260, "protein": 8, "carbs": 45, "fat": 5, "fiber": 2, "category": "North Indian"},
        {"name": "Butter Naan", "calories": 310, "protein": 8, "carbs": 45, "fat": 10, "fiber": 2, "category": "North Indian"},
        {"name": "Garlic Naan", "calories": 290, "protein": 8, "carbs": 46, "fat": 8, "fiber": 2, "category": "North Indian"},
        {"name": "Laccha Paratha", "calories": 180, "protein": 4, "carbs": 24, "fat": 8, "fiber": 1, "category": "North Indian"},
        {"name": "Khichdi (1 cup)", "calories": 200, "protein": 7, "carbs": 35, "fat": 4, "fiber": 3, "category": "Light Meal"},
        {"name": "Dal Khichdi", "calories": 220, "protein": 9, "carbs": 38, "fat": 4, "fiber": 4, "category": "Light Meal"},
        {"name": "Vegetable Khichdi", "calories": 230, "protein": 8, "carbs": 40, "fat": 4, "fiber": 5, "category": "Light Meal"},
        {"name": "Tandoori Chicken (2 pcs)", "calories": 260, "protein": 30, "carbs": 4, "fat": 14, "fiber": 0, "category": "Non-Veg"},
        {"name": "Tandoori Roti", "calories": 80, "protein": 3, "carbs": 16, "fat": 1, "fiber": 1, "category": "North Indian"},
        {"name": "Rumali Roti", "calories": 100, "protein": 3, "carbs": 20, "fat": 1, "fiber": 1, "category": "North Indian"},
        {"name": "Tawa Chicken", "calories": 300, "protein": 28, "carbs": 6, "fat": 18, "fiber": 1, "category": "Non-Veg"},
        {"name": "Seekh Kebab (4 pcs)", "calories": 280, "protein": 22, "carbs": 8, "fat": 18, "fiber": 1, "category": "Non-Veg"},
        {"name": "Paneer Tikka (6 pcs)", "calories": 300, "protein": 18, "carbs": 10, "fat": 22, "fiber": 2, "category": "Starters"},
        {"name": "Vegetable Soup", "calories": 80, "protein": 2, "carbs": 12, "fat": 2, "fiber": 3, "category": "Light"},
        {"name": "Tomato Soup", "calories": 100, "protein": 2, "carbs": 18, "fat": 3, "fiber": 2, "category": "Light"},
        {"name": "Clear Chicken Soup", "calories": 150, "protein": 12, "carbs": 8, "fat": 6, "fiber": 1, "category": "Light"},
        {"name": "Mulligatawny Soup", "calories": 180, "protein": 8, "carbs": 20, "fat": 7, "fiber": 3, "category": "Light"},
    ],
    "snacks": [
        {"name": "Samosa (1 pc)", "calories": 150, "protein": 3, "carbs": 18, "fat": 8, "fiber": 1, "category": "Fried"},
        {"name": "Pakora/Bhajji (4 pcs)", "calories": 180, "protein": 4, "carbs": 15, "fat": 12, "fiber": 2, "category": "Fried"},
        {"name": "Kachori (1 pc)", "calories": 180, "protein": 4, "carbs": 20, "fat": 10, "fiber": 2, "category": "Fried"},
        {"name": "Vada Pav", "calories": 290, "protein": 6, "carbs": 38, "fat": 12, "fiber": 3, "category": "Mumbai"},
        {"name": "Pav Bhaji", "calories": 350, "protein": 8, "carbs": 45, "fat": 15, "fiber": 5, "category": "Mumbai"},
        {"name": "Bhel Puri", "calories": 200, "protein": 5, "carbs": 35, "fat": 5, "fiber": 3, "category": "Chaat"},
        {"name": "Sev Puri (6 pcs)", "calories": 180, "protein": 4, "carbs": 28, "fat": 6, "fiber": 2, "category": "Chaat"},
        {"name": "Pani Puri (6 pcs)", "calories": 150, "protein": 3, "carbs": 30, "fat": 3, "fiber": 2, "category": "Chaat"},
        {"name": "Dahi Puri (6 pcs)", "calories": 200, "protein": 5, "carbs": 32, "fat": 6, "fiber": 2, "category": "Chaat"},
        {"name": "Papdi Chaat", "calories": 220, "protein": 5, "carbs": 35, "fat": 7, "fiber": 3, "category": "Chaat"},
        {"name": "Aloo Tikki", "calories": 150, "protein": 3, "carbs": 22, "fat": 6, "fiber": 2, "category": "Chaat"},
        {"name": "Ragda Pattice", "calories": 280, "protein": 8, "carbs": 40, "fat": 10, "fiber": 5, "category": "Chaat"},
        {"name": "Mathri (4 pcs)", "calories": 200, "protein": 4, "carbs": 24, "fat": 10, "fiber": 1, "category": "North Indian"},
        {"name": "Namakpare (handful)", "calories": 150, "protein": 3, "carbs": 18, "fat": 8, "fiber": 1, "category": "North Indian"},
        {"name": "Murukku (3 pcs)", "calories": 120, "protein": 2, "carbs": 16, "fat": 6, "fiber": 1, "category": "South Indian"},
        {"name": "Mixture (handful)", "calories": 180, "protein": 5, "carbs": 20, "fat": 9, "fiber": 2, "category": "South Indian"},
        {"name": "Chakli (2 pcs)", "calories": 140, "protein": 2, "carbs": 18, "fat": 7, "fiber": 1, "category": "Maharashtrian"},
        {"name": "Khandvi (4 pcs)", "calories": 100, "protein": 4, "carbs": 12, "fat": 4, "fiber": 1, "category": "Gujarati"},
        {"name": "Fafda Jalebi", "calories": 350, "protein": 5, "carbs": 50, "fat": 15, "fiber": 1, "category": "Gujarati"},
        {"name": "Sandwich (Veg)", "calories": 220, "protein": 6, "carbs": 30, "fat": 8, "fiber": 3, "category": "Continental"},
        {"name": "Grilled Sandwich", "calories": 280, "protein": 10, "carbs": 32, "fat": 12, "fiber": 2, "category": "Continental"},
        {"name": "Cutlet (2 pcs)", "calories": 200, "protein": 6, "carbs": 24, "fat": 10, "fiber": 2, "category": "Continental"},
        {"name": "Roasted Chana", "calories": 130, "protein": 8, "carbs": 20, "fat": 3, "fiber": 5, "category": "Healthy"},
        {"name": "Roasted Makhana", "calories": 100, "protein": 4, "carbs": 18, "fat": 1, "fiber": 2, "category": "Healthy"},
        {"name": "Mixed Nuts (handful)", "calories": 180, "protein": 6, "carbs": 8, "fat": 16, "fiber": 2, "category": "Healthy"},
        {"name": "Fruit Chaat", "calories": 120, "protein": 2, "carbs": 28, "fat": 0.5, "fiber": 4, "category": "Healthy"},
        {"name": "Sprouts Salad", "calories": 100, "protein": 8, "carbs": 15, "fat": 1, "fiber": 5, "category": "Healthy"},
    ],
    "beverages": [
        {"name": "Chai (1 cup)", "calories": 80, "protein": 2, "carbs": 12, "fat": 3, "fiber": 0, "category": "Hot"},
        {"name": "Masala Chai", "calories": 90, "protein": 2, "carbs": 14, "fat": 3, "fiber": 0, "category": "Hot"},
        {"name": "Green Tea", "calories": 2, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "category": "Hot"},
        {"name": "Black Coffee", "calories": 5, "protein": 0, "carbs": 1, "fat": 0, "fiber": 0, "category": "Hot"},
        {"name": "Coffee with Milk", "calories": 60, "protein": 2, "carbs": 8, "fat": 2, "fiber": 0, "category": "Hot"},
        {"name": "Filter Coffee", "calories": 90, "protein": 3, "carbs": 10, "fat": 4, "fiber": 0, "category": "Hot"},
        {"name": "Badam Milk", "calories": 200, "protein": 8, "carbs": 25, "fat": 8, "fiber": 1, "category": "Hot"},
        {"name": "Haldi Doodh", "calories": 150, "protein": 6, "carbs": 18, "fat": 6, "fiber": 0, "category": "Hot"},
        {"name": "Lassi (Sweet)", "calories": 180, "protein": 6, "carbs": 30, "fat": 4, "fiber": 0, "category": "Cold"},
        {"name": "Lassi (Salted)", "calories": 100, "protein": 5, "carbs": 12, "fat": 4, "fiber": 0, "category": "Cold"},
        {"name": "Mango Lassi", "calories": 220, "protein": 6, "carbs": 38, "fat": 5, "fiber": 1, "category": "Cold"},
        {"name": "Chaas/Buttermilk", "calories": 40, "protein": 2, "carbs": 5, "fat": 1, "fiber": 0, "category": "Cold"},
        {"name": "Jaljeera", "calories": 30, "protein": 0, "carbs": 7, "fat": 0, "fiber": 0, "category": "Cold"},
        {"name": "Aam Panna", "calories": 90, "protein": 0, "carbs": 22, "fat": 0, "fiber": 1, "category": "Cold"},
        {"name": "Nimbu Pani", "calories": 50, "protein": 0, "carbs": 12, "fat": 0, "fiber": 0, "category": "Cold"},
        {"name": "Coconut Water", "calories": 45, "protein": 2, "carbs": 9, "fat": 0.5, "fiber": 2, "category": "Cold"},
        {"name": "Fresh Orange Juice", "calories": 110, "protein": 2, "carbs": 26, "fat": 0, "fiber": 0, "category": "Cold"},
        {"name": "Fresh Apple Juice", "calories": 120, "protein": 0, "carbs": 30, "fat": 0, "fiber": 0, "category": "Cold"},
        {"name": "Mixed Fruit Juice", "calories": 130, "protein": 1, "carbs": 32, "fat": 0, "fiber": 1, "category": "Cold"},
        {"name": "Sugarcane Juice", "calories": 180, "protein": 0, "carbs": 45, "fat": 0, "fiber": 0, "category": "Cold"},
        {"name": "Thandai", "calories": 250, "protein": 6, "carbs": 35, "fat": 10, "fiber": 1, "category": "Cold"},
        {"name": "Shikanji", "calories": 80, "protein": 0, "carbs": 20, "fat": 0, "fiber": 0, "category": "Cold"},
    ],
    "sweets": [
        {"name": "Gulab Jamun (2 pcs)", "calories": 300, "protein": 4, "carbs": 45, "fat": 12, "fiber": 0, "category": "North Indian"},
        {"name": "Rasgulla (2 pcs)", "calories": 180, "protein": 4, "carbs": 35, "fat": 3, "fiber": 0, "category": "Bengali"},
        {"name": "Ras Malai (2 pcs)", "calories": 250, "protein": 6, "carbs": 35, "fat": 10, "fiber": 0, "category": "Bengali"},
        {"name": "Sandesh (2 pcs)", "calories": 160, "protein": 5, "carbs": 25, "fat": 5, "fiber": 0, "category": "Bengali"},
        {"name": "Jalebi (3 pcs)", "calories": 250, "protein": 2, "carbs": 50, "fat": 6, "fiber": 0, "category": "North Indian"},
        {"name": "Barfi (2 pcs)", "calories": 200, "protein": 4, "carbs": 30, "fat": 8, "fiber": 0, "category": "North Indian"},
        {"name": "Kaju Katli (2 pcs)", "calories": 180, "protein": 4, "carbs": 22, "fat": 9, "fiber": 0, "category": "North Indian"},
        {"name": "Peda (2 pcs)", "calories": 160, "protein": 4, "carbs": 24, "fat": 6, "fiber": 0, "category": "North Indian"},
        {"name": "Ladoo (1 pc)", "calories": 150, "protein": 3, "carbs": 25, "fat": 5, "fiber": 1, "category": "North Indian"},
        {"name": "Motichoor Ladoo", "calories": 180, "protein": 3, "carbs": 30, "fat": 6, "fiber": 0, "category": "North Indian"},
        {"name": "Besan Ladoo", "calories": 170, "protein": 4, "carbs": 22, "fat": 8, "fiber": 1, "category": "North Indian"},
        {"name": "Rava Ladoo", "calories": 140, "protein": 2, "carbs": 22, "fat": 5, "fiber": 0, "category": "South Indian"},
        {"name": "Kheer (1 cup)", "calories": 250, "protein": 6, "carbs": 40, "fat": 8, "fiber": 0, "category": "North Indian"},
        {"name": "Payasam (1 cup)", "calories": 280, "protein": 6, "carbs": 45, "fat": 9, "fiber": 1, "category": "South Indian"},
        {"name": "Halwa (1/2 cup)", "calories": 200, "protein": 3, "carbs": 30, "fat": 8, "fiber": 1, "category": "North Indian"},
        {"name": "Gajar Halwa", "calories": 220, "protein": 4, "carbs": 32, "fat": 9, "fiber": 2, "category": "North Indian"},
        {"name": "Moong Dal Halwa", "calories": 250, "protein": 5, "carbs": 30, "fat": 12, "fiber": 1, "category": "North Indian"},
        {"name": "Shrikhand (1/2 cup)", "calories": 180, "protein": 5, "carbs": 28, "fat": 6, "fiber": 0, "category": "Gujarati"},
        {"name": "Basundi (1/2 cup)", "calories": 200, "protein": 6, "carbs": 30, "fat": 7, "fiber": 0, "category": "Maharashtrian"},
        {"name": "Kulfi", "calories": 180, "protein": 5, "carbs": 25, "fat": 8, "fiber": 0, "category": "North Indian"},
        {"name": "Mysore Pak (2 pcs)", "calories": 250, "protein": 4, "carbs": 28, "fat": 14, "fiber": 1, "category": "South Indian"},
        {"name": "Pootharekulu (1 pc)", "calories": 80, "protein": 1, "carbs": 16, "fat": 2, "fiber": 0, "category": "Andhra"},
    ],
    "fruits": [
        {"name": "Apple (medium)", "calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3, "fiber": 4, "category": "Common"},
        {"name": "Banana (medium)", "calories": 105, "protein": 1.3, "carbs": 27, "fat": 0.4, "fiber": 3, "category": "Common"},
        {"name": "Orange (medium)", "calories": 62, "protein": 1.2, "carbs": 15, "fat": 0.2, "fiber": 3, "category": "Citrus"},
        {"name": "Mango (1 cup)", "calories": 100, "protein": 1.4, "carbs": 25, "fat": 0.6, "fiber": 3, "category": "Seasonal"},
        {"name": "Papaya (1 cup)", "calories": 55, "protein": 0.9, "carbs": 14, "fat": 0.2, "fiber": 2.5, "category": "Common"},
        {"name": "Watermelon (1 cup)", "calories": 46, "protein": 0.9, "carbs": 11, "fat": 0.2, "fiber": 0.6, "category": "Seasonal"},
        {"name": "Grapes (1 cup)", "calories": 104, "protein": 1.1, "carbs": 27, "fat": 0.2, "fiber": 1.4, "category": "Common"},
        {"name": "Pomegranate (1 cup)", "calories": 144, "protein": 2.9, "carbs": 33, "fat": 2, "fiber": 7, "category": "Seasonal"},
        {"name": "Guava (medium)", "calories": 68, "protein": 2.5, "carbs": 14, "fat": 1, "fiber": 9, "category": "Common"},
        {"name": "Chikoo/Sapota (2 pcs)", "calories": 140, "protein": 0.8, "carbs": 34, "fat": 1.1, "fiber": 10, "category": "Common"},
        {"name": "Custard Apple (medium)", "calories": 150, "protein": 2.5, "carbs": 38, "fat": 0.5, "fiber": 5, "category": "Seasonal"},
        {"name": "Pineapple (1 cup)", "calories": 82, "protein": 0.9, "carbs": 22, "fat": 0.2, "fiber": 2.3, "category": "Common"},
        {"name": "Litchi (10 pcs)", "calories": 66, "protein": 0.8, "carbs": 17, "fat": 0.4, "fiber": 1.3, "category": "Seasonal"},
        {"name": "Jackfruit (1 cup)", "calories": 155, "protein": 2.8, "carbs": 40, "fat": 1, "fiber": 3, "category": "Seasonal"},
        {"name": "Jamun (1 cup)", "calories": 75, "protein": 1, "carbs": 18, "fat": 0.2, "fiber": 3, "category": "Seasonal"},
        {"name": "Strawberries (1 cup)", "calories": 49, "protein": 1, "carbs": 12, "fat": 0.5, "fiber": 3, "category": "Berries"},
        {"name": "Kiwi (medium)", "calories": 42, "protein": 0.8, "carbs": 10, "fat": 0.4, "fiber": 2, "category": "Exotic"},
        {"name": "Sweet Lime/Mosambi", "calories": 43, "protein": 0.8, "carbs": 9, "fat": 0.3, "fiber": 2, "category": "Citrus"},
        {"name": "Pear (medium)", "calories": 102, "protein": 0.6, "carbs": 27, "fat": 0.2, "fiber": 6, "category": "Common"},
        {"name": "Plum (2 pcs)", "calories": 60, "protein": 1, "carbs": 15, "fat": 0.4, "fiber": 2, "category": "Seasonal"},
    ]
}


# ============ API Models ============

class FoodLogEntry(BaseModel):
    food_name: str
    calories: int
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    meal_type: str  # breakfast, lunch, dinner, snacks
    portion_size: Optional[str] = "1 serving"
    date: Optional[str] = None


class CalorieGoal(BaseModel):
    daily_calories: int = 2000
    protein_goal: int = 50
    carbs_goal: int = 250
    fat_goal: int = 65
    fiber_goal: int = 25


# ============ API Endpoints ============

@router.get("/food-database")
async def get_food_database():
    """Get the comprehensive Indian food database"""
    return {
        "success": True,
        "foods": INDIAN_FOOD_DATABASE,
        "categories": list(INDIAN_FOOD_DATABASE.keys()),
        "total_items": sum(len(foods) for foods in INDIAN_FOOD_DATABASE.values())
    }


@router.get("/food-search")
async def search_food(query: str, limit: int = 20):
    """Search for foods across all categories"""
    query_lower = query.lower()
    results = []
    
    for category, foods in INDIAN_FOOD_DATABASE.items():
        for food in foods:
            if query_lower in food["name"].lower() or query_lower in food.get("category", "").lower():
                results.append({
                    **food,
                    "meal_category": category
                })
                if len(results) >= limit:
                    break
        if len(results) >= limit:
            break
    
    return {
        "success": True,
        "query": query,
        "results": results,
        "count": len(results)
    }


@router.get("/logs")
async def get_calorie_logs(date: str, user_id: Optional[str] = None):
    """Get calorie logs for a specific date"""
    query = {"date": date}
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.calorie_logs.find(query, {"_id": 0}).to_list(100)
    
    # Calculate daily totals
    totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0}
    for log in logs:
        totals["calories"] += log.get("calories", 0)
        totals["protein"] += log.get("protein", 0)
        totals["carbs"] += log.get("carbs", 0)
        totals["fat"] += log.get("fat", 0)
        totals["fiber"] += log.get("fiber", 0)
    
    return {
        "success": True,
        "date": date,
        "logs": logs,
        "totals": totals
    }


@router.post("/log")
async def add_calorie_log(entry: FoodLogEntry, user_id: Optional[str] = None):
    """Add a food entry to the calorie log"""
    log_date = entry.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    log_entry = {
        "id": f"cal_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
        "user_id": user_id,
        "food_name": entry.food_name,
        "calories": entry.calories,
        "protein": entry.protein,
        "carbs": entry.carbs,
        "fat": entry.fat,
        "fiber": entry.fiber,
        "meal_type": entry.meal_type,
        "portion_size": entry.portion_size,
        "date": log_date,
        "logged_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.calorie_logs.insert_one(log_entry)
    
    return {
        "success": True,
        "message": f"Logged {entry.food_name} ({entry.calories} cal)",
        "log_id": log_entry["id"]
    }


@router.delete("/log/{log_id}")
async def delete_calorie_log(log_id: str):
    """Delete a calorie log entry"""
    result = await db.calorie_logs.delete_one({"id": log_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log entry not found")
    
    return {
        "success": True,
        "message": "Log entry deleted"
    }


@router.get("/summary")
async def get_calorie_summary(start_date: str, end_date: str, user_id: Optional[str] = None):
    """Get calorie summary for a date range"""
    query = {"date": {"$gte": start_date, "$lte": end_date}}
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.calorie_logs.find(query, {"_id": 0}).to_list(1000)
    
    # Group by date
    daily_summary = {}
    for log in logs:
        date = log.get("date")
        if date not in daily_summary:
            daily_summary[date] = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "meals": 0}
        daily_summary[date]["calories"] += log.get("calories", 0)
        daily_summary[date]["protein"] += log.get("protein", 0)
        daily_summary[date]["carbs"] += log.get("carbs", 0)
        daily_summary[date]["fat"] += log.get("fat", 0)
        daily_summary[date]["fiber"] += log.get("fiber", 0)
        daily_summary[date]["meals"] += 1
    
    # Calculate averages
    num_days = len(daily_summary) or 1
    avg_calories = sum(d["calories"] for d in daily_summary.values()) / num_days
    avg_protein = sum(d["protein"] for d in daily_summary.values()) / num_days
    
    return {
        "success": True,
        "start_date": start_date,
        "end_date": end_date,
        "daily_summary": daily_summary,
        "averages": {
            "calories": round(avg_calories, 1),
            "protein": round(avg_protein, 1)
        },
        "total_days": num_days
    }


@router.get("/goals")
async def get_calorie_goals(user_id: Optional[str] = None):
    """Get user's calorie goals"""
    query = {"user_id": user_id} if user_id else {"user_id": None}
    goals = await db.calorie_goals.find_one(query, {"_id": 0})
    
    if not goals:
        # Return default goals
        return {
            "success": True,
            "goals": {
                "daily_calories": 2000,
                "protein_goal": 50,
                "carbs_goal": 250,
                "fat_goal": 65,
                "fiber_goal": 25
            }
        }
    
    return {
        "success": True,
        "goals": goals
    }


@router.post("/goals")
async def set_calorie_goals(goals: CalorieGoal, user_id: Optional[str] = None):
    """Set user's calorie goals"""
    goal_data = {
        "user_id": user_id,
        "daily_calories": goals.daily_calories,
        "protein_goal": goals.protein_goal,
        "carbs_goal": goals.carbs_goal,
        "fat_goal": goals.fat_goal,
        "fiber_goal": goals.fiber_goal,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.calorie_goals.update_one(
        {"user_id": user_id},
        {"$set": goal_data},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Goals updated successfully",
        "goals": goal_data
    }
