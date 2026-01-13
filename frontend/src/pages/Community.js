import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Heart, MessageCircle, Users, TrendingUp, 
  Plus, Send, Eye, ThumbsUp, Clock, Filter, Search,
  Loader2, AlertCircle, CheckCircle, User, Lock
} from 'lucide-react';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const CATEGORY_STYLES = {
  pregnancy: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  fertility: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  menopause: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  pcos: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  nutrition: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  mental_health: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  general: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
};

const Community = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Create post dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general',
    is_anonymous: false
  });
  const [creating, setCreating] = useState(false);
  
  // View post dialog
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const fetchData = useCallback(async () => {
    try {
      const [catRes, featRes] = await Promise.all([
        axios.get(`${API}/community/categories`),
        axios.get(`${API}/community/featured`)
      ]);
      setCategories(catRes.data.categories || []);
      setFeatured(featRes.data.featured || []);
    } catch (error) {
      console.error('Failed to fetch community data:', error);
    }
  }, []);
  
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, sort: sortBy, limit: 20 };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      
      const res = await axios.get(`${API}/community/posts`, { params });
      setPosts(res.data.posts || []);
      setTotalPages(res.data.pages || 1);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
    setLoading(false);
  }, [page, selectedCategory, sortBy]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  
  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Please fill in title and content');
      return;
    }
    
    setCreating(true);
    try {
      await axios.post(`${API}/community/posts`, newPost, {
        params: {
          user_id: user?.id,
          user_name: user?.name || 'Anonymous'
        }
      });
      toast.success('Post created successfully!');
      setShowCreateDialog(false);
      setNewPost({ title: '', content: '', category: 'general', is_anonymous: false });
      fetchPosts();
    } catch (error) {
      toast.error('Failed to create post');
    }
    setCreating(false);
  };
  
  const handleViewPost = async (postId) => {
    try {
      const res = await axios.get(`${API}/community/posts/${postId}`);
      setSelectedPost(res.data);
      setShowPostDialog(true);
    } catch (error) {
      toast.error('Failed to load post');
    }
  };
  
  const handleLikePost = async (postId) => {
    try {
      await axios.post(`${API}/community/posts/${postId}/like`, {}, {
        params: { user_id: user?.id }
      });
      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes: p.likes + 1 } : p
      ));
      if (selectedPost?.id === postId) {
        setSelectedPost(prev => ({ ...prev, likes: prev.likes + 1 }));
      }
    } catch (error) {
      toast.error('Failed to like post');
    }
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    setSubmittingComment(true);
    try {
      await axios.post(`${API}/community/posts/${selectedPost.id}/comment`, {
        content: newComment,
        is_anonymous: commentAnonymous
      }, {
        params: {
          user_id: user?.id,
          user_name: user?.name || 'Anonymous'
        }
      });
      toast.success('Comment added!');
      setNewComment('');
      // Refresh post
      const res = await axios.get(`${API}/community/posts/${selectedPost.id}`);
      setSelectedPost(res.data);
    } catch (error) {
      toast.error('Failed to add comment');
    }
    setSubmittingComment(false);
  };
  
  const getCategoryStyle = (categoryId) => {
    return CATEGORY_STYLES[categoryId] || CATEGORY_STYLES.general;
  };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-pink-700">Women's Health Community</h1>
              <p className="text-sm text-gray-500">Connect, Share & Support</p>
            </div>
          </div>
          {user && (
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-pink-600 hover:bg-pink-700"
              data-testid="create-post-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          )}
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'bg-pink-600' : ''}
          >
            All Topics
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={selectedCategory === cat.id ? `${getCategoryStyle(cat.id).bg} ${getCategoryStyle(cat.id).text}` : ''}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </Button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sort & Filter */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="most_replied">Most Replied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-gray-500">{posts.length} discussions</p>
            </div>
            
            {/* Posts List */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto" />
                <p className="text-gray-500 mt-2">Loading discussions...</p>
              </div>
            ) : posts.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">No discussions yet</h3>
                <p className="text-gray-500 mb-4">Be the first to start a conversation!</p>
                {user && (
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-pink-600 hover:bg-pink-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Start Discussion
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map(post => (
                  <Card 
                    key={post.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleViewPost(post.id)}
                    data-testid={`post-${post.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={`${getCategoryStyle(post.category).bg} ${getCategoryStyle(post.category).text}`}>
                          {categories.find(c => c.id === post.category)?.name || post.category}
                        </Badge>
                        <span className="text-xs text-gray-500">{formatDate(post.created_at)}</span>
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">{post.title}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">{post.content}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {post.author_name || 'Anonymous'}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {post.likes || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {post.replies_count || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button 
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Featured Discussions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                  Trending Discussions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {featured.map(item => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => handleViewPost(item.id)}
                  >
                    <Badge className={`${getCategoryStyle(item.category).bg} ${getCategoryStyle(item.category).text} text-xs mb-2`}>
                      {categories.find(c => c.id === item.category)?.name || item.category}
                    </Badge>
                    <h4 className="font-medium text-sm text-gray-800 line-clamp-2">{item.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {item.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {item.replies_count}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Community Guidelines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-600" />
                  Community Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>• Be respectful and supportive</p>
                <p>• No medical advice - consult doctors</p>
                <p>• Use anonymous posting if needed</p>
                <p>• Report inappropriate content</p>
                <p>• Share experiences, not judgments</p>
              </CardContent>
            </Card>
            
            {/* Not logged in prompt */}
            {!user && (
              <Card className="bg-pink-50 border-pink-200">
                <CardContent className="p-4 text-center">
                  <Lock className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-700 mb-3">Login to post and comment</p>
                  <Button 
                    onClick={() => navigate('/')}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      {/* Create Post Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start a Discussion</DialogTitle>
            <DialogDescription>Share your thoughts, questions, or experiences</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select 
                value={newPost.category} 
                onValueChange={(v) => setNewPost(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What's on your mind?"
                data-testid="post-title-input"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={newPost.content}
                onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share your thoughts, questions, or experiences..."
                rows={5}
                data-testid="post-content-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={newPost.is_anonymous}
                onChange={(e) => setNewPost(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="anonymous" className="text-sm text-gray-600">
                Post anonymously
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePost}
              disabled={creating}
              className="bg-pink-600 hover:bg-pink-700"
              data-testid="submit-post-btn"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Post Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <Badge className={`${getCategoryStyle(selectedPost.category).bg} ${getCategoryStyle(selectedPost.category).text} w-fit`}>
                  {categories.find(c => c.id === selectedPost.category)?.name || selectedPost.category}
                </Badge>
                <DialogTitle className="text-xl mt-2">{selectedPost.title}</DialogTitle>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {selectedPost.author_name || 'Anonymous'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(selectedPost.created_at)}
                  </span>
                </div>
              </DialogHeader>
              
              <div className="py-4 border-b">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.content}</p>
                <div className="flex items-center gap-4 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleLikePost(selectedPost.id)}
                    data-testid="like-post-btn"
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    {selectedPost.likes || 0}
                  </Button>
                  <span className="text-sm text-gray-500">
                    {selectedPost.replies_count || 0} comments
                  </span>
                </div>
              </div>
              
              {/* Comments */}
              <div className="space-y-4">
                <h4 className="font-semibold">Comments</h4>
                {selectedPost.comments?.length > 0 ? (
                  selectedPost.comments.map(comment => (
                    <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{comment.author_name || 'Anonymous'}</span>
                        <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                )}
                
                {/* Add Comment */}
                {user && (
                  <div className="space-y-2 pt-4 border-t">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      data-testid="comment-input"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="comment-anon"
                          checked={commentAnonymous}
                          onChange={(e) => setCommentAnonymous(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="comment-anon" className="text-sm text-gray-600">
                          Comment anonymously
                        </Label>
                      </div>
                      <Button 
                        onClick={handleAddComment}
                        disabled={submittingComment}
                        className="bg-pink-600 hover:bg-pink-700"
                        data-testid="submit-comment-btn"
                      >
                        {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default Community;
