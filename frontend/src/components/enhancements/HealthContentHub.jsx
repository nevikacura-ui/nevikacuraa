import React, { useState, useEffect } from 'react';
import { BookOpen, Play, Heart, Brain, Baby, Pill, Apple, Moon, Search, Filter, Bookmark, Share2, ThumbsUp, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const API = process.env.REACT_APP_BACKEND_URL;

// Health Content Hub (#17)
const HealthContentHub = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedArticles, setSavedArticles] = useState([]);
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: 'all', name: 'All', icon: BookOpen },
    { id: 'heart', name: 'Heart Health', icon: Heart },
    { id: 'diabetes', name: 'Diabetes', icon: Pill },
    { id: 'pregnancy', name: 'Pregnancy', icon: Baby },
    { id: 'mental', name: 'Mental Health', icon: Brain },
    { id: 'nutrition', name: 'Nutrition', icon: Apple },
    { id: 'sleep', name: 'Sleep', icon: Moon },
  ];

  const articles = [
    {
      id: 1,
      title: '10 Foods to Lower Blood Sugar Naturally',
      category: 'diabetes',
      type: 'article',
      readTime: '5 min',
      author: 'Dr. Vikas Jha',
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
      likes: 234,
      saved: false,
      featured: true,
      excerpt: 'Discover natural foods that can help manage your blood sugar levels effectively...'
    },
    {
      id: 2,
      title: 'Understanding Pregnancy Trimesters',
      category: 'pregnancy',
      type: 'video',
      duration: '12 min',
      author: 'Dr. Neha Patel',
      image: 'https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?w=400',
      likes: 456,
      saved: true,
      featured: true,
      excerpt: 'A comprehensive guide to what happens during each trimester of pregnancy...'
    },
    {
      id: 3,
      title: 'Managing Stress & Anxiety',
      category: 'mental',
      type: 'article',
      readTime: '8 min',
      author: 'Nevika Health Team',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
      likes: 189,
      saved: false,
      excerpt: 'Simple techniques to manage daily stress and improve mental well-being...'
    },
    {
      id: 4,
      title: 'Heart-Healthy Exercise Routine',
      category: 'heart',
      type: 'video',
      duration: '15 min',
      author: 'Dr. Vikas Jha',
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
      likes: 312,
      saved: false,
      excerpt: 'Follow this simple exercise routine to keep your heart healthy...'
    },
    {
      id: 5,
      title: 'Sleep Better Tonight: 7 Proven Tips',
      category: 'sleep',
      type: 'article',
      readTime: '6 min',
      author: 'Nevika Health Team',
      image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400',
      likes: 278,
      saved: false,
      excerpt: 'Improve your sleep quality with these science-backed tips...'
    },
    {
      id: 6,
      title: 'Balanced Diet for Diabetics',
      category: 'diabetes',
      type: 'article',
      readTime: '10 min',
      author: 'Dr. Vikas Jha',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
      likes: 445,
      saved: true,
      excerpt: 'Create a balanced meal plan that helps manage diabetes effectively...'
    },
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticles = articles.filter(a => a.featured);

  const toggleSave = (articleId) => {
    setSavedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const getCategoryIcon = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.icon : BookOpen;
  };

  return (
    <div className="space-y-4" data-testid="health-content-hub">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-teal-600" />
          Health Library
        </h2>
        <Badge variant="outline">{articles.length} articles</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search health topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 ${activeCategory === cat.id ? 'bg-teal-600' : ''}`}
          >
            <cat.icon className="w-4 h-4 mr-1" />
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Featured Section */}
      {activeCategory === 'all' && searchQuery === '' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Featured</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
            {featuredArticles.map((article) => (
              <Card 
                key={article.id} 
                className="flex-shrink-0 w-72 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="relative h-36">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                  {article.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-teal-600 ml-1" />
                      </div>
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-teal-600">Featured</Badge>
                </div>
                <CardContent className="p-3">
                  <h4 className="font-semibold text-sm line-clamp-2">{article.title}</h4>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>{article.author}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{article.type === 'video' ? article.duration : article.readTime}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Articles Grid */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {filteredArticles.map((article) => (
            <ArticleCard 
              key={article.id} 
              article={article} 
              onSave={() => toggleSave(article.id)}
              isSaved={savedArticles.includes(article.id) || article.saved}
              CategoryIcon={getCategoryIcon(article.category)}
            />
          ))}
        </TabsContent>

        <TabsContent value="articles" className="space-y-3 mt-4">
          {filteredArticles.filter(a => a.type === 'article').map((article) => (
            <ArticleCard 
              key={article.id} 
              article={article} 
              onSave={() => toggleSave(article.id)}
              isSaved={savedArticles.includes(article.id) || article.saved}
              CategoryIcon={getCategoryIcon(article.category)}
            />
          ))}
        </TabsContent>

        <TabsContent value="videos" className="space-y-3 mt-4">
          {filteredArticles.filter(a => a.type === 'video').map((article) => (
            <ArticleCard 
              key={article.id} 
              article={article} 
              onSave={() => toggleSave(article.id)}
              isSaved={savedArticles.includes(article.id) || article.saved}
              CategoryIcon={getCategoryIcon(article.category)}
            />
          ))}
        </TabsContent>
      </Tabs>

      {filteredArticles.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No articles found</p>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Article Card Component
const ArticleCard = ({ article, onSave, isSaved, CategoryIcon }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex">
        <div className="relative w-28 h-28 flex-shrink-0">
          <img 
            src={article.image} 
            alt={article.title}
            className="w-full h-full object-cover"
          />
          {article.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-4 h-4 text-teal-600 ml-0.5" />
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline" className="text-xs mb-1">
                <CategoryIcon className="w-3 h-3 mr-1" />
                {article.category}
              </Badge>
              <h4 className="font-semibold text-sm line-clamp-2">{article.title}</h4>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className="p-1"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-teal-600 text-teal-600' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.type === 'video' ? article.duration : article.readTime}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {article.likes}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {article.author}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HealthContentHub;
