import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Search, Image, Check, X, Download, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

const MedicineImageUpload = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, with_images: 0, without_images: 0, percentage: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [singleMedicine, setSingleMedicine] = useState({ name: '', image_url: '' });
  const [medicinesWithoutImages, setMedicinesWithoutImages] = useState([]);
  const [page, setPage] = useState(1);

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

  const searchMedicines = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/medicine-images/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      const data = await res.json();
      setSearchResults(data.medicines || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
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
        fetchStats();
        searchMedicines();
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
                <Label>Medicine Name</Label>
                <Input 
                  placeholder="e.g., PARACETAMOL 500MG"
                  value={singleMedicine.name}
                  onChange={(e) => setSingleMedicine({...singleMedicine, name: e.target.value.toUpperCase()})}
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input 
                  placeholder="https://example.com/medicine.jpg"
                  value={singleMedicine.image_url}
                  onChange={(e) => setSingleMedicine({...singleMedicine, image_url: e.target.value})}
                />
              </div>
              {singleMedicine.image_url && (
                <div className="border rounded-lg p-2">
                  <p className="text-xs text-gray-500 mb-2">Preview:</p>
                  <img src={singleMedicine.image_url} alt="Preview" className="w-24 h-24 object-contain mx-auto" onError={(e) => e.target.style.display='none'} />
                </div>
              )}
              <Button onClick={updateSingleImage} disabled={loading} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                {loading ? 'Uploading...' : 'Upload Image'}
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input 
                placeholder="Search medicine name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchMedicines()}
              />
              <Button onClick={searchMedicines} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((med, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${med.has_image ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex items-center gap-2">
                      {med.has_image ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-orange-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{med.name}</p>
                        <p className="text-xs text-gray-500">{med.form}</p>
                      </div>
                    </div>
                    {med.image && (
                      <img src={med.image} alt={med.name} className="w-16 h-16 object-contain mx-auto mt-2" />
                    )}
                    {!med.has_image && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => setSingleMedicine({...singleMedicine, name: med.name})}
                      >
                        Add Image
                      </Button>
                    )}
                  </div>
                ))}
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
