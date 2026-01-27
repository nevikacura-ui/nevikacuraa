import React, { useState, useEffect } from 'react';
import { Book, Play, Clock, BookOpen, Video, Heart, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Health Content Hub (#17)
const HealthContentHub = () => {
  const [activeTab, setActiveTab] = useState('articles');
  const [searchTerm, setSearchTerm] = useState('');
  const [savedItems, setSavedItems] = useState([]);

  const categories = [
    { id: 'diabetes', name: 'Diabetes', icon: '🩸', color: 'bg-red-100' },
    { id: 'heart', name: 'Heart Health', icon: '❤️', color: 'bg-pink-100' },
    { id: 'nutrition', name: 'Nutrition', icon: '🥗', color: 'bg-green-100' },
    { id: 'mental', name: 'Mental Health', icon: '🧠', color: 'bg-purple-100' },
    { id: 'pregnancy', name: 'Pregnancy', icon: '🤰', color: 'bg-blue-100' },
    { id: 'fitness', name: 'Fitness', icon: '💪', color: 'bg-orange-100' },
  ];

  const articles = [
    {
      id: 1,
      title: 'Managing Diabetes: A Complete Guide',
      category: 'diabetes',
      readTime: '8 min',
      image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400',
      author: 'Dr. Neha Patel',
      date: '2 days ago'
    },
    {
      id: 2,
      title: '10 Heart-Healthy Foods You Should Eat',
      category: 'heart',
      readTime: '5 min',
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
      author: 'Dr. Vikas Jha',
      date: '1 week ago'
    },
    {
      id: 3,
      title: 'Stress Management Techniques',
      category: 'mental',
      readTime: '6 min',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
      author: 'Dr. Priya Sharma',
      date: '3 days ago'
    },
  ];

  const videos = [
    {
      id: 1,
      title: 'Morning Yoga for Beginners',
      duration: '15:30',
      thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
      views: '12K',
      category: 'fitness'
    },
    {
      id: 2,
      title: 'Understanding Blood Sugar Levels',
      duration: '8:45',
      thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
      views: '8.5K',
      category: 'diabetes'
    },
  ];

  const toggleSave = (itemId) => {
    if (savedItems.includes(itemId)) {
      setSavedItems(savedItems.filter(id => id !== itemId));
    } else {
      setSavedItems([...savedItems, itemId]);
    }
  };

  return (
    <div className="space-y-4" data-testid="health-content-hub">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search health topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${cat.color} whitespace-nowrap`}
          >
            <span>{cat.icon}</span>
            <span className="text-sm font-medium">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4 mt-4">
          {articles.map((article) => (
            <Card key={article.id} className="overflow-hidden">
              <div className="flex">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-28 h-28 object-cover"
                />
                <CardContent className="p-3 flex-1">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-xs mb-1">
                      {categories.find(c => c.id === article.category)?.name}
                    </Badge>
                    <button onClick={() => toggleSave(article.id)}>
                      <Heart className={`w-5 h-5 ${savedItems.includes(article.id) ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                    </button>
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                    <span>{article.author}</span>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4 mt-4">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-teal-600 ml-1" />
                  </div>
                </div>
                <Badge className="absolute bottom-2 right-2 bg-black/70">
                  {video.duration}
                </Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-semibold">{video.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{video.views} views</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Featured Doctor Tips */}
      <Card className="bg-gradient-to-r from-teal-50 to-cyan-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">💡 Doctor's Tip of the Day</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            "Drink at least 8 glasses of water daily. Staying hydrated helps maintain body temperature, aids digestion, and keeps your skin healthy."
          </p>
          <p className="text-sm text-teal-600 font-medium mt-2">- Dr. Neha Patel</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthContentHub;
