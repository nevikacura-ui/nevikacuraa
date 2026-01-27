import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Star, MapPin, Clock, Phone, Calendar, 
  GraduationCap, Award, Languages, Users, Heart, 
  MessageSquare, ChevronRight, Search, Filter,
  Loader2, CheckCircle, Stethoscope, Building
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const DoctorProfiles = () => {
  const navigate = useNavigate();
  const { doctorId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorReviews, setDoctorReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
    would_recommend: true
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  
  useEffect(() => {
    fetchDoctors();
  }, []);
  
  useEffect(() => {
    if (doctorId) {
      fetchDoctorDetails(doctorId);
    }
  }, [doctorId]);
  
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/doctors/all`);
      setDoctors(response.data?.doctors || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
    setLoading(false);
  };
  
  const fetchDoctorDetails = async (id) => {
    setLoading(true);
    try {
      const [doctorRes, reviewsRes] = await Promise.all([
        axios.get(`${API}/doctors/${id}`),
        axios.get(`${API}/doctors/${id}/reviews`).catch(() => ({ data: { reviews: [] } }))
      ]);
      setSelectedDoctor(doctorRes.data);
      setDoctorReviews(reviewsRes.data?.reviews || []);
    } catch (error) {
      console.error('Error fetching doctor details:', error);
      toast.error('Doctor not found');
      navigate('/doctors');
    }
    setLoading(false);
  };
  
  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Please login to submit a review');
      return;
    }
    if (!reviewForm.title || !reviewForm.comment) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setSubmittingReview(true);
    try {
      await axios.post(`${API}/doctors/${selectedDoctor.id}/reviews`, {
        user_id: user.id,
        user_name: user.name,
        ...reviewForm
      });
      toast.success('Review submitted successfully!');
      setShowReviewDialog(false);
      setReviewForm({ rating: 5, title: '', comment: '', would_recommend: true });
      fetchDoctorDetails(selectedDoctor.id);
    } catch (error) {
      toast.error('Failed to submit review');
    }
    setSubmittingReview(false);
  };
  
  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = !specialtyFilter || doc.specialization?.includes(specialtyFilter);
    return matchesSearch && matchesSpecialty;
  });
  
  const specialties = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];
  
  // Doctor Detail View
  if (selectedDoctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setSelectedDoctor(null); navigate('/doctors'); }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">{selectedDoctor.name}</h1>
                <p className="text-sm text-gray-500">{selectedDoctor.specialization}</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Doctor Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                  {selectedDoctor.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedDoctor.name}</h2>
                      <p className="text-indigo-600 font-medium">{selectedDoctor.qualification}</p>
                      <p className="text-gray-500">{selectedDoctor.specialization}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xl font-bold">{selectedDoctor.rating}</span>
                      </div>
                      <p className="text-sm text-gray-500">{selectedDoctor.total_reviews} reviews</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {selectedDoctor.experience_years}+ years
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {selectedDoctor.patients_treated?.toLocaleString()}+ patients
                    </Badge>
                    {selectedDoctor.featured && (
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-500">
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="w-4 h-4" />
                      {selectedDoctor.clinic}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {selectedDoctor.clinic_address}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {selectedDoctor.timings}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <Button 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => navigate('/diagyn')}
                  data-testid="book-appointment-btn"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
                <Button variant="outline" onClick={() => setShowReviewDialog(true)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Write Review
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Tabs for Details */}
          <Tabs defaultValue="about">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({doctorReviews.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-gray-600">{selectedDoctor.about}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDoctor.specialties?.map((specialty, idx) => (
                      <Badge key={idx} variant="outline" className="border-indigo-200">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Languages
                  </h3>
                  <p className="text-gray-600">{selectedDoctor.languages?.join(', ')}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Available Days
                  </h3>
                  <p className="text-gray-600">{selectedDoctor.available_days?.join(', ')}</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="education" className="mt-4 space-y-4">
              {selectedDoctor.education?.map((edu, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{edu.degree}</h4>
                      <p className="text-gray-600">{edu.institution}</p>
                      <p className="text-sm text-gray-400">{edu.year}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-4 space-y-4">
              {doctorReviews.length > 0 ? (
                doctorReviews.map((review, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{review.title}</h4>
                          <p className="text-sm text-gray-500">{review.user_name}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-gray-600">{review.comment}</p>
                      {review.would_recommend && (
                        <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Would recommend
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowReviewDialog(true)}
                    >
                      Write a Review
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
        
        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Write a Review for {selectedDoctor.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Rating</label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                      className="p-1"
                    >
                      <Star 
                        className={`w-8 h-8 ${star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Review Title</label>
                <Input
                  placeholder="e.g., Excellent care and attention"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Your Review</label>
                <Textarea
                  placeholder="Share your experience..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                />
              </div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reviewForm.would_recommend}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, would_recommend: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">I would recommend this doctor</span>
              </label>
              
              <Button 
                onClick={handleSubmitReview} 
                className="w-full"
                disabled={submittingReview}
              >
                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Review
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Doctor Listing View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Stethoscope className="w-6 h-6 text-indigo-600" />
                Our Doctors
              </h1>
              <p className="text-gray-500 text-sm">Find and book with expert specialists</p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Specialties</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>
        </div>
        
        {/* Doctor List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredDoctors.length > 0 ? (
          <div className="space-y-4">
            {filteredDoctors.map((doctor) => (
              <Card 
                key={doctor.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => { setSelectedDoctor(doctor); navigate(`/doctors/${doctor.id}`); }}
                data-testid={`doctor-card-${doctor.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                      {doctor.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{doctor.name}</h3>
                          <p className="text-sm text-gray-500">{doctor.qualification}</p>
                          <p className="text-sm text-indigo-600">{doctor.specialization}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{doctor.rating}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {doctor.experience_years}+ yrs
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {doctor.clinic}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400 self-center" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Stethoscope className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No doctors found</h3>
              <p className="text-gray-500">Try adjusting your search criteria</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DoctorProfiles;
