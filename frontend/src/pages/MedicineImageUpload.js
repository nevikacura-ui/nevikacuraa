import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Search, Image, Check, X, Download, FileText, ArrowLeft, Loader2, ExternalLink, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

// Helper function to open Google Image Search
const openGoogleImageSearch = (medicineName) => {
  const searchQuery = encodeURIComponent(`${medicineName} medicine tablet strip packaging india`);
  const googleUrl = `https://www.google.com/search?q=${searchQuery}&tbm=isch`;
  window.open(googleUrl, '_blank');
  toast.success('Google Images opened! Right-click an image → Copy image address → Paste here');
};

const MedicineImageUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [stats, setStats] = useState({ total: 0, with_images: 0, without_images: 0, percentage: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [singleMedicine, setSingleMedicine] = useState({ name: '', image_url: '' });
  const [medicinesWithoutImages, setMedicinesWithoutImages] = useState([]);
  const [page, setPage] = useState(1);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchMedicinesWithoutImages();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/medicine-images/stats`);
      const data = await res.json();
      setStats({
        total: data.total_medicines,
        with_images: data.with_images,
        without_images: data.without_images,
        percentage: data.percentage_complete
      });
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchMedicinesWithoutImages = async () => {
    try {
      const res = await fetch(`${API}/api/medicine-images/without-images?page=${page}&per_page=50`);
      const data = await res.json();
      setMedicinesWithoutImages(data.medicines || []);
    } catch (error) {
      console.error('Failed to fetch medicines without images');
    }
  };

  // Real-time search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchMedicines();
      } else if (searchQuery.trim().length === 0) {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchMedicines = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/medicine-images/search?q=${encodeURIComponent(searchQuery)}&limit=30`);
      const data = await res.json();
      setSearchResults(data.medicines || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!singleMedicine.name) {
      toast.error('Please select or enter a medicine name first');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewFile(e.target.result);
    reader.readAsDataURL(file);
    
    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'medicine');
      
      const uploadRes = await fetch(`${API}/api/upload/image`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      
      if (uploadData.url) {
        // Update medicine with uploaded image URL
        setSingleMedicine(prev => ({ ...prev, image_url: uploadData.url }));
        toast.success('Image uploaded! Click "Save Image" to complete.');
      } else {
        toast.error('Upload failed: ' + (uploadData.detail || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const updateSingleImage = async () => {
    if (!singleMedicine.name || !singleMedicine.image_url) {
      toast.error('Please enter medicine name and image URL');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/medicine-images/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine_name: singleMedicine.name, image_url: singleMedicine.image_url })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setSingleMedicine({ name: '', image_url: '' });
        setPreviewFile(null);
        fetchStats();
        if (searchQuery) searchMedicines();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const uploadCSV = async () => {
    if (!csvData.trim()) {
      toast.error('Please enter CSV data');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('csv_data', csvData);
      
      const res = await fetch(`${API}/api/medicine-images/upload-csv`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.summary);
        setCsvData('');
        fetchStats();
        fetchMedicinesWithoutImages();
      }
    } catch (error) {
      toast.error('CSV upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = medicinesWithoutImages.slice(0, 100).map(m => `${m.name},`).join('\n');
    const header = "# Medicine Image Upload Template\n# Format: medicine_name,image_url\n# Example: PARACETAMOL 500MG,https://example.com/paracetamol.jpg\n\n";
    const blob = new Blob([header + template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medicine_images_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Medicine Image Upload</h1>
            <p className="text-slate-600">Add images to medicines - No login required</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.total.toLocaleString()}</p>
              <p className="text-sm opacity-90">Total Medicines</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.with_images}</p>
              <p className="text-sm opacity-90">With Images</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.without_images.toLocaleString()}</p>
              <p className="text-sm opacity-90">Need Images</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.percentage}%</p>
              <p className="text-sm opacity-90">Complete</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Single Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-500" />
                Single Medicine Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Medicine Name *</Label>
                <Input 
                  placeholder="e.g., PARACETAMOL 500MG or search below"
                  value={singleMedicine.name}
                  onChange={(e) => setSingleMedicine({...singleMedicine, name: e.target.value.toUpperCase()})}
                  className="font-medium"
                />
                {singleMedicine.name && (
                  <p className="text-xs text-green-600 mt-1">✓ Medicine selected: {singleMedicine.name}</p>
                )}
              </div>
              
              {/* File Upload Option */}
              <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700 mb-2">Upload Image File</p>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !singleMedicine.name}
                    className="bg-white"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Choose Image File</>
                    )}
                  </Button>
                  {!singleMedicine.name && (
                    <p className="text-xs text-orange-600 mt-2">Select a medicine name first</p>
                  )}
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">Or paste URL</span>
                </div>
              </div>
              
              <div>
                <Label>Image URL</Label>
                <Input 
                  placeholder="https://example.com/medicine.jpg"
                  value={singleMedicine.image_url}
                  onChange={(e) => setSingleMedicine({...singleMedicine, image_url: e.target.value})}
                />
              </div>
              
              {/* Preview */}
              {(singleMedicine.image_url || previewFile) && (
                <div className="border rounded-lg p-3 bg-slate-50">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Preview:</p>
                  <img 
                    src={singleMedicine.image_url || previewFile} 
                    alt="Preview" 
                    className="w-32 h-32 object-contain mx-auto rounded-lg border bg-white" 
                    onError={(e) => e.target.style.display='none'} 
                  />
                </div>
              )}
              
              <Button 
                onClick={updateSingleImage} 
                disabled={loading || !singleMedicine.name || !singleMedicine.image_url} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> Save Image</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* CSV Bulk Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Bulk CSV Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <div>
                <Label>CSV Data (medicine_name,image_url)</Label>
                <textarea
                  className="w-full h-40 p-3 border rounded-lg text-sm font-mono"
                  placeholder="PARACETAMOL 500MG,https://example.com/paracetamol.jpg
CROCIN ADVANCE,https://example.com/crocin.jpg
DOLO 650,https://example.com/dolo.jpg"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                />
              </div>
              <Button onClick={uploadCSV} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                <Upload className="w-4 h-4 mr-2" />
                {loading ? 'Processing...' : 'Upload CSV'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-orange-500" />
              Search Medicines
              {loading && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Type to search... (starts searching after 2 characters)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={searchMedicines} disabled={loading} variant="outline">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            
            {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
              <div className="text-center py-8 text-slate-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No medicines found for "{searchQuery}"</p>
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div>
                <p className="text-sm text-slate-600 mb-3">Found {searchResults.length} medicines</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.map((med, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${med.has_image ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} ${singleMedicine.name === med.name ? 'ring-2 ring-blue-500' : ''}`}>
                      <div className="flex items-center gap-2">
                        {med.has_image ? (
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" title={med.name}>{med.name}</p>
                          <p className="text-xs text-gray-500">{med.form}</p>
                        </div>
                      </div>
                      {med.image && (
                        <img src={med.image} alt={med.name} className="w-20 h-20 object-contain mx-auto mt-2 rounded border bg-white" />
                      )}
                      {!med.has_image && (
                        <Button 
                          size="sm" 
                          variant={singleMedicine.name === med.name ? "default" : "outline"}
                          className={`w-full mt-2 ${singleMedicine.name === med.name ? 'bg-blue-600' : ''}`}
                          onClick={() => {
                            setSingleMedicine({...singleMedicine, name: med.name});
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            toast.success(`Selected: ${med.name}. Now upload or paste an image URL.`);
                          }}
                        >
                          {singleMedicine.name === med.name ? '✓ Selected' : 'Select to Add Image'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medicines Without Images */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Image className="w-5 h-5 text-red-500" />
                Medicines Needing Images ({stats.without_images.toLocaleString()})
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPage(Math.max(1, page-1)); fetchMedicinesWithoutImages(); }} disabled={page === 1}>
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm">Page {page}</span>
                <Button variant="outline" size="sm" onClick={() => { setPage(page+1); fetchMedicinesWithoutImages(); }}>
                  Next
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {medicinesWithoutImages.map((med, idx) => (
                <div 
                  key={idx} 
                  className="p-2 bg-slate-50 rounded-lg text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setSingleMedicine({...singleMedicine, name: med.name})}
                >
                  <p className="font-medium truncate" title={med.name}>{med.name}</p>
                  <p className="text-gray-500">{med.form}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MedicineImageUpload;
