import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Lightbulb, BookOpen, Clock, Heart, ThumbsUp,
  Loader2, ChevronRight, Droplet, Activity, Moon, Apple,
  Brain, Baby, Users, Sun
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const HealthTips = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [dailyTip, setDailyTip] = useState(null);
  const [allTips, setAllTips] = useState({});
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const categoryIcons = {
    general: <Activity className="w-5 h-5" />,
    diabetes: <Droplet className="w-5 h-5" />,
    women: <Heart className="w-5 h-5" />,
    pregnancy: <Baby className="w-5 h-5" />,
    senior: <Users className="w-5 h-5" />
  };
  
  const tipIcons = {
    droplet: <Droplet className="w-5 h-5 text-blue-500" />,
    eye: <Sun className="w-5 h-5 text-yellow-500" />,
    footprints: <Activity className="w-5 h-5 text-green-500" />,
    moon: <Moon className="w-5 h-5 text-indigo-500" />,
    utensils: <Apple className="w-5 h-5 text-orange-500" />,
    activity: <Activity className="w-5 h-5 text-red-500" />,
    smartphone: <Sun className="w-5 h-5 text-gray-500" />,
    heart: <Heart className="w-5 h-5 text-pink-500" />,
    leaf: <Apple className="w-5 h-5 text-green-500" />,
    brain: <Brain className="w-5 h-5 text-purple-500" />,
    target: <Activity className="w-5 h-5 text-red-500" />,
    calendar: <Clock className="w-5 h-5 text-blue-500" />,
    bone: <Activity className="w-5 h-5 text-gray-500" />,
    shield: <Heart className="w-5 h-5 text-green-500" />,
    pill: <Droplet className="w-5 h-5 text-blue-500" />,
    sun: <Sun className="w-5 h-5 text-yellow-500" />,
    users: <Users className="w-5 h-5 text-blue-500" />,
    baby: <Baby className="w-5 h-5 text-pink-500" />,
    alert: <Activity className="w-5 h-5 text-red-500" />,
    foot: <Activity className="w-5 h-5 text-orange-500" />
  };
  
  useEffect(() => {
    fetchData();
  }, [user]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [dailyRes, allRes, articlesRes] = await Promise.all([
        user?.id ? axios.get(`${API}/health-tips/daily/${user.id}`) : { data: null },
        axios.get(`${API}/health-tips/all`),
        axios.get(`${API}/health-tips/articles`)
      ]);
      
      setDailyTip(dailyRes.data);
      setAllTips(allRes.data?.tips || {});
      setArticles(articlesRes.data?.articles || []);
    } catch (error) {
      console.error('Error fetching tips:', error);
    }
    setLoading(false);
  };
  
  const handleLikeArticle = async (articleId) => {
    if (!user?.id) {
      toast.error('Please login to like articles');
      return;
    }
    
    try {
      await axios.post(`${API}/health-tips/articles/${articleId}/like?user_id=${user.id}`);
      toast.success('Article liked!');
    } catch (error) {
      toast.info('Already liked');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-xl text-gray-900">Health Tips</h1>
                <p className="text-sm text-gray-500">Daily wellness advice & articles</p>
              </div>
            </div>
            <Lightbulb className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="daily">Today's Tip</TabsTrigger>
            <TabsTrigger value="all">All Tips</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
          </TabsList>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : (
            <>
              {/* DAILY TIP TAB */}
              <TabsContent value="daily">
                {dailyTip ? (
                  <div className="space-y-6">
                    {/* Greeting */}
                    <Card className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                      <CardContent className="p-6">
                        <p className="text-lg opacity-90">{dailyTip.greeting}!</p>
                        <h2 className="text-2xl font-bold mt-1">Here's your health tip for today</h2>
                      </CardContent>
                    </Card>
                    
                    {/* Daily Tip */}
                    <Card className="border-2 border-green-200">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            {tipIcons[dailyTip.tip?.icon] || <Lightbulb className="w-6 h-6 text-green-600" />}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{dailyTip.tip?.title}</h3>
                            <p className="text-gray-600">{dailyTip.tip?.content}</p>
                            <div className="mt-3">
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full capitalize">
                                {dailyTip.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="h-auto py-4" onClick={() => setActiveTab('all')}>
                        <BookOpen className="w-5 h-5 mr-2" />
                        Browse All Tips
                      </Button>
                      <Button variant="outline" className="h-auto py-4" onClick={() => setActiveTab('articles')}>
                        <BookOpen className="w-5 h-5 mr-2" />
                        Read Articles
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">Login to get personalized daily tips</p>
                    <Button className="mt-4" onClick={() => navigate('/')}>Go to Home</Button>
                  </Card>
                )}
              </TabsContent>
              
              {/* ALL TIPS TAB */}
              <TabsContent value="all">
                <div className="space-y-6">
                  {Object.entries(allTips).map(([category, tips]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 capitalize">
                        {categoryIcons[category]}
                        {category === 'general' ? 'General Wellness' :
                         category === 'diabetes' ? 'Diabetes Care' :
                         category === 'women' ? "Women's Health" :
                         category === 'pregnancy' ? 'Pregnancy Tips' :
                         category === 'senior' ? 'Senior Health' : category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {tips.map((tip, idx) => (
                          <Card key={idx} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  {tipIcons[tip.icon] || <Lightbulb className="w-5 h-5 text-yellow-500" />}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{tip.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{tip.content}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              {/* ARTICLES TAB */}
              <TabsContent value="articles">
                {selectedArticle ? (
                  <div className="space-y-4">
                    <Button variant="ghost" onClick={() => setSelectedArticle(null)}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Articles
                    </Button>
                    
                    <Card>
                      <CardContent className="p-6">
                        <h1 className="text-2xl font-bold mb-2">{selectedArticle.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                          <span>By {selectedArticle.author}</span>
                          <span>•</span>
                          <span>{selectedArticle.read_time} min read</span>
                          <span>•</span>
                          <span>{selectedArticle.views} views</span>
                        </div>
                        
                        <div className="prose max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: selectedArticle.content?.replace(/\n/g, '<br/>').replace(/## /g, '<h2>').replace(/### /g, '<h3>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </div>
                        
                        <div className="mt-6 flex items-center gap-4">
                          <Button variant="outline" onClick={() => handleLikeArticle(selectedArticle.id)}>
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Like ({selectedArticle.likes})
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {articles.map((article) => (
                      <Card 
                        key={article.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => fetchArticle(article.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{article.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{article.summary}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{article.author}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {article.read_time} min
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" />
                                  {article.likes}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
  
  async function fetchArticle(articleId) {
    try {
      const response = await axios.get(`${API}/health-tips/articles/${articleId}`);
      setSelectedArticle(response.data);
    } catch (error) {
      toast.error('Failed to load article');
    }
  }
};

export default HealthTips;
