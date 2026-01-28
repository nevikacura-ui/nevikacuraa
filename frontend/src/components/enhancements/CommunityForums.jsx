import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, ThumbsUp, Send, Search, Plus, User, Clock, Tag, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const CommunityForums = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([
    { id: 'diabetes', name: 'Diabetes Support', icon: '🩺', count: 45 },
    { id: 'pregnancy', name: 'Pregnancy & Motherhood', icon: '🤰', count: 32 },
    { id: 'mental-health', name: 'Mental Health', icon: '🧠', count: 28 },
    { id: 'nutrition', name: 'Diet & Nutrition', icon: '🥗', count: 51 },
    { id: 'fitness', name: 'Fitness & Exercise', icon: '💪', count: 39 },
    { id: 'general', name: 'General Health', icon: '❤️', count: 67 }
  ]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('patientToken') || localStorage.getItem('token');
      const categoryParam = selectedCategory ? `?category=${selectedCategory}` : '';
      const res = await fetch(`${API}/api/community/posts${categoryParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      } else {
        // Fallback mock data
        setPosts([
          {
            id: '1',
            title: 'Managing blood sugar during festivals',
            content: 'Any tips for maintaining blood sugar levels during Diwali when there are so many sweets around?',
            author: 'Rajesh K.',
            category: 'diabetes',
            likes: 24,
            replies: 8,
            created_at: '2 hours ago',
            isDoctor: false
          },
          {
            id: '2',
            title: 'First trimester fatigue - is this normal?',
            content: 'I am 8 weeks pregnant and feeling extremely tired all the time. Is this normal?',
            author: 'Priya M.',
            category: 'pregnancy',
            likes: 18,
            replies: 12,
            created_at: '5 hours ago',
            isDoctor: false
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      // Fallback mock data
      setPosts([
        {
          id: '1',
          title: 'Managing blood sugar during festivals',
          content: 'Any tips for maintaining blood sugar levels during Diwali?',
          author: 'Rajesh K.',
          category: 'diabetes',
          likes: 24,
          replies: 8,
          created_at: '2 hours ago',
          isDoctor: false
        }
      ]);
    }
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem('patientToken') || localStorage.getItem('token');
      await fetch(`${API}/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, likes: p.likes + 1 } : p
      ));
    } catch (error) {
      // Still update UI optimistically
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, likes: p.likes + 1 } : p
      ));
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) {
      toast.error('Please fill in title and content');
      return;
    }
    
    try {
      const token = localStorage.getItem('patientToken') || localStorage.getItem('token');
      const res = await fetch(`${API}/api/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          category: newPost.category
        })
      });
      
      const data = await res.json();
      if (data.post_id) {
        toast.success('Post created successfully!');
        setShowNewPost(false);
        setNewPost({ title: '', content: '', category: 'general' });
        fetchPosts();
      }
    } catch (error) {
      toast.error('Failed to create post');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (selectedCategory && post.category !== selectedCategory) return false;
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4" data-testid="community-forums">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Community Forums</h2>
                <p className="text-purple-100 text-sm">Connect with others on their health journey</p>
              </div>
            </div>
            <Button onClick={() => setShowNewPost(true)} className="bg-white text-purple-600 hover:bg-purple-50">
              <Plus className="w-4 h-4 mr-1" /> New Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search discussions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Button>
        {categories.map(cat => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="whitespace-nowrap"
          >
            {cat.icon} {cat.name}
          </Button>
        ))}
      </div>

      {/* Trending Topics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline">#DiabetesAwareness</Badge>
          <Badge variant="outline">#MentalHealthMatters</Badge>
          <Badge variant="outline">#HealthyEating</Badge>
          <Badge variant="outline">#PregnancyTips</Badge>
        </CardContent>
      </Card>

      {/* Posts List */}
      <div className="space-y-3">
        {filteredPosts.map(post => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  post.isDoctor ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {post.isDoctor ? (
                    <span className="text-blue-600 font-bold text-sm">Dr</span>
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{post.author}</span>
                    {post.isDoctor && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Verified Doctor</Badge>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.created_at}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1">{post.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleLike(post.id)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" /> {post.likes}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500">
                      <MessageSquare className="w-4 h-4 mr-1" /> {post.replies} replies
                    </Button>
                    <Badge variant="outline" className="ml-auto">
                      <Tag className="w-3 h-3 mr-1" />
                      {categories.find(c => c.id === post.category)?.name}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Post Dialog */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={newPost.category}
                onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                className="w-full mt-1 p-2 border rounded-lg"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="What's your question or topic?"
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="Share more details..."
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                className="mt-1"
                rows={4}
              />
            </div>
            <Button onClick={handleCreatePost} className="w-full">
              <Send className="w-4 h-4 mr-2" /> Post to Community
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityForums;
