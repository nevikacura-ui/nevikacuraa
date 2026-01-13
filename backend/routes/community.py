"""
Women's Health Community
Forums, discussions, Q&A for women's health topics
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/community", tags=["Community"])

# Models
class CreatePost(BaseModel):
    title: str
    content: str
    category: str  # pregnancy, fertility, menopause, pcos, general, nutrition, mental_health
    is_anonymous: bool = False

class CreateComment(BaseModel):
    content: str
    is_anonymous: bool = False

# Helper
def get_db():
    from server import db
    return db

# Sample community topics/categories
COMMUNITY_CATEGORIES = [
    {"id": "pregnancy", "name": "Pregnancy & Baby", "icon": "👶", "color": "pink"},
    {"id": "fertility", "name": "Fertility & Trying", "icon": "🌸", "color": "purple"},
    {"id": "menopause", "name": "Menopause Support", "icon": "🦋", "color": "blue"},
    {"id": "pcos", "name": "PCOS Warriors", "icon": "💪", "color": "teal"},
    {"id": "nutrition", "name": "Diet & Nutrition", "icon": "🥗", "color": "green"},
    {"id": "mental_health", "name": "Mental Wellness", "icon": "🧘", "color": "indigo"},
    {"id": "general", "name": "General Health", "icon": "❤️", "color": "red"},
]

# Sample featured discussions (seed data)
FEATURED_DISCUSSIONS = [
    {
        "id": "feat_1",
        "title": "Tips for managing morning sickness",
        "category": "pregnancy",
        "preview": "Ginger tea and small frequent meals worked wonders for me...",
        "replies_count": 45,
        "likes": 128,
        "created_at": "2026-01-10T10:00:00Z",
        "author": "MomToBe2026"
    },
    {
        "id": "feat_2", 
        "title": "PCOS diet that actually works",
        "category": "pcos",
        "preview": "After trying many diets, low-GI Indian foods have been game-changing...",
        "replies_count": 67,
        "likes": 203,
        "created_at": "2026-01-08T15:30:00Z",
        "author": "PCOSFighter"
    },
    {
        "id": "feat_3",
        "title": "Navigating menopause at work",
        "category": "menopause",
        "preview": "Here are some strategies that helped me manage symptoms during meetings...",
        "replies_count": 32,
        "likes": 89,
        "created_at": "2026-01-05T09:00:00Z",
        "author": "GracefulTransition"
    }
]

@router.get("/categories")
async def get_community_categories():
    """Get all community categories"""
    return {"categories": COMMUNITY_CATEGORIES}

@router.get("/featured")
async def get_featured_discussions():
    """Get featured/trending discussions"""
    return {"featured": FEATURED_DISCUSSIONS}

@router.get("/posts")
async def get_community_posts(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    sort: str = "recent"  # recent, popular, most_replied
):
    """Get community posts with filters"""
    db = get_db()
    
    query = {"status": "active"}
    if category:
        query["category"] = category
    
    sort_field = {"recent": ("created_at", -1), "popular": ("likes", -1), "most_replied": ("replies_count", -1)}
    sort_by = sort_field.get(sort, ("created_at", -1))
    
    skip = (page - 1) * limit
    total = await db.community_posts.count_documents(query)
    
    posts = await db.community_posts.find(query, {"_id": 0}).sort(sort_by[0], sort_by[1]).skip(skip).limit(limit).to_list(limit)
    
    return {
        "posts": posts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.post("/posts")
async def create_post(post: CreatePost, user_id: str = None, user_name: str = "Anonymous"):
    """Create a new community post"""
    db = get_db()
    
    if not post.title.strip() or not post.content.strip():
        raise HTTPException(status_code=400, detail="Title and content are required")
    
    post_doc = {
        "id": str(uuid.uuid4()),
        "title": post.title.strip(),
        "content": post.content.strip(),
        "category": post.category,
        "author_id": user_id if not post.is_anonymous else None,
        "author_name": "Anonymous" if post.is_anonymous else user_name,
        "is_anonymous": post.is_anonymous,
        "likes": 0,
        "replies_count": 0,
        "comments": [],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.community_posts.insert_one(post_doc)
    
    return {"success": True, "post": {k: v for k, v in post_doc.items() if k != "_id"}}

@router.get("/posts/{post_id}")
async def get_post_details(post_id: str):
    """Get a single post with comments"""
    db = get_db()
    
    post = await db.community_posts.find_one({"id": post_id, "status": "active"}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return post

@router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user_id: str = None):
    """Like a post"""
    db = get_db()
    
    result = await db.community_posts.update_one(
        {"id": post_id, "status": "active"},
        {"$inc": {"likes": 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"success": True}

@router.post("/posts/{post_id}/comment")
async def add_comment(post_id: str, comment: CreateComment, user_id: str = None, user_name: str = "Anonymous"):
    """Add a comment to a post"""
    db = get_db()
    
    if not comment.content.strip():
        raise HTTPException(status_code=400, detail="Comment content is required")
    
    comment_doc = {
        "id": str(uuid.uuid4()),
        "author_id": user_id if not comment.is_anonymous else None,
        "author_name": "Anonymous" if comment.is_anonymous else user_name,
        "content": comment.content.strip(),
        "likes": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.community_posts.update_one(
        {"id": post_id, "status": "active"},
        {
            "$push": {"comments": comment_doc},
            "$inc": {"replies_count": 1}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"success": True, "comment": comment_doc}

@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user_id: str = None):
    """Soft delete a post (mark as deleted)"""
    db = get_db()
    
    # Only allow deletion if user owns the post (or admin)
    post = await db.community_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.get("author_id") != user_id and user_id is not None:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.community_posts.update_one(
        {"id": post_id},
        {"$set": {"status": "deleted"}}
    )
    
    return {"success": True}

@router.get("/stats")
async def get_community_stats():
    """Get community statistics"""
    db = get_db()
    
    total_posts = await db.community_posts.count_documents({"status": "active"})
    total_comments = 0
    
    posts = await db.community_posts.find({"status": "active"}, {"_id": 0, "replies_count": 1}).to_list(10000)
    total_comments = sum(p.get("replies_count", 0) for p in posts)
    
    # Count by category
    category_counts = {}
    for cat in COMMUNITY_CATEGORIES:
        count = await db.community_posts.count_documents({"category": cat["id"], "status": "active"})
        category_counts[cat["id"]] = count
    
    return {
        "total_posts": total_posts,
        "total_comments": total_comments,
        "categories": category_counts,
        "active_categories": [c for c in COMMUNITY_CATEGORIES if category_counts.get(c["id"], 0) > 0]
    }
