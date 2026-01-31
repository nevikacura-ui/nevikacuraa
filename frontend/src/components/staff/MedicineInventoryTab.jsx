import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Plus, Edit2, Trash2, Package, IndianRupee, Percent, 
  Image, Save, Search, Loader2, Upload, Download, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` }
});

const ITEMS_PER_PAGE = 15;

const MedicineInventoryTab = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    mrp: '',
    discount_percent: '',
    sale_price: '',
    category: '',
    description: '',
    stock: '',
    unit: 'strip'
  });

  // Calculate sale price when MRP or discount changes
  useEffect(() => {
    if (formData.mrp && formData.discount_percent) {
      const mrp = parseFloat(formData.mrp);
      const discount = parseFloat(formData.discount_percent);
      const salePrice = mrp - (mrp * discount / 100);
      setFormData(prev => ({ ...prev, sale_price: salePrice.toFixed(2) }));
    }
  }, [formData.mrp, formData.discount_percent]);

  // Fetch medicines
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/pharmacy/inventory`, getAuthHeaders());
      setMedicines(response.data.medicines || []);
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
      toast.error('Failed to load medicine inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(medicines.map(m => m.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [medicines]);

  // Filter and paginate medicines
  const filteredMedicines = useMemo(() => {
    let result = medicines;
    
    // Filter by search
    if (searchQuery) {
      result = result.filter(med => 
        med.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(med => med.category === selectedCategory);
    }
    
    return result;
  }, [medicines, searchQuery, selectedCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredMedicines.length / ITEMS_PER_PAGE);
  const paginatedMedicines = filteredMedicines.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'MRP', 'Discount %', 'Sale Price', 'Stock', 'Unit'];
    const rows = filteredMedicines.map(m => [
      m.name || '',
      m.category || '',
      m.mrp || 0,
      m.discount_percent || 0,
      m.sale_price || m.mrp || 0,
      m.stock || 0,
      m.unit || 'strip'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    downloadFile(csvContent, 'medicine_inventory.csv', 'text/csv');
    toast.success('CSV exported successfully');
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Medicine Inventory">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Name</Data></Cell>
        <Cell><Data ss:Type="String">Category</Data></Cell>
        <Cell><Data ss:Type="String">MRP</Data></Cell>
        <Cell><Data ss:Type="String">Discount %</Data></Cell>
        <Cell><Data ss:Type="String">Sale Price</Data></Cell>
        <Cell><Data ss:Type="String">Stock</Data></Cell>
        <Cell><Data ss:Type="String">Unit</Data></Cell>
      </Row>
      ${filteredMedicines.map(m => `
      <Row>
        <Cell><Data ss:Type="String">${m.name || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${m.category || ''}</Data></Cell>
        <Cell><Data ss:Type="Number">${m.mrp || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${m.discount_percent || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${m.sale_price || m.mrp || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${m.stock || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${m.unit || 'strip'}</Data></Cell>
      </Row>`).join('')}
    </Table>
  </Worksheet>
</Workbook>`;
      
      downloadFile(xmlContent, 'medicine_inventory.xls', 'application/vnd.ms-excel');
      toast.success('Excel exported successfully');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medicine Inventory - Nevika Cura</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0d9488; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #0d9488; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Medicine Inventory</h1>
        <p style="text-align: center; color: #666;">Orange Pharmacy - Nevika Cura Healthcare</p>
        <p style="text-align: center; color: #666;">Generated: ${new Date().toLocaleDateString('en-IN')}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Medicine Name</th>
              <th>Category</th>
              <th>MRP</th>
              <th>Discount</th>
              <th>Sale Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMedicines.map((m, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${m.name || '-'}</td>
                <td>${m.category || '-'}</td>
                <td>₹${m.mrp || 0}</td>
                <td>${m.discount_percent || 0}%</td>
                <td>₹${m.sale_price || m.mrp || 0}</td>
                <td>${m.stock || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="footer">Total: ${filteredMedicines.length} items</p>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    toast.success('PDF ready for download');
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('type', 'medicine');

    try {
      const response = await axios.post(`${API}/api/upload/image`, formDataUpload, {
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image_url: response.data.url }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Save medicine
  const handleSave = async () => {
    if (!formData.name || !formData.mrp) {
      toast.error('Name and MRP are required');
      return;
    }

    setSaving(true);
    try {
      if (editingMedicine) {
        await axios.put(`${API}/api/pharmacy/inventory/${editingMedicine.id}`, formData, getAuthHeaders());
        toast.success('Medicine updated');
      } else {
        await axios.post(`${API}/api/pharmacy/inventory`, formData, getAuthHeaders());
        toast.success('Medicine added');
      }
      
      setShowAddDialog(false);
      setEditingMedicine(null);
      resetForm();
      fetchMedicines();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Delete medicine
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medicine?')) return;
    try {
      await axios.delete(`${API}/api/pharmacy/inventory/${id}`, getAuthHeaders());
      toast.success('Medicine deleted');
      fetchMedicines();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', image_url: '', mrp: '', discount_percent: '',
      sale_price: '', category: '', description: '', stock: '', unit: 'strip'
    });
  };

  const openEditDialog = (medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name || '',
      image_url: medicine.image_url || '',
      mrp: medicine.mrp?.toString() || '',
      discount_percent: medicine.discount_percent?.toString() || '',
      sale_price: medicine.sale_price?.toString() || '',
      category: medicine.category || '',
      description: medicine.description || '',
      stock: medicine.stock?.toString() || '',
      unit: medicine.unit || 'strip'
    });
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex flex-col gap-2">
        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
              data-testid="medicine-search"
            />
          </div>
          <Button 
            onClick={() => { resetForm(); setEditingMedicine(null); setShowAddDialog(true); }}
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 h-9 px-3"
            data-testid="add-medicine-btn"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Add</span>
          </Button>
        </div>
        
        {/* Category Filter + Export */}
        <div className="flex gap-2 items-center overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {categories.slice(0, 6).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
          {/* Export dropdown */}
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={exportToCSV} className="h-7 px-2 text-xs">
              <Download className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={exportToExcel} className="h-7 px-2 text-xs">
              <FileSpreadsheet className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={exportToPDF} className="h-7 px-2 text-xs">
              <FileText className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Medicine List - Table View */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : filteredMedicines.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">No medicines found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* List View */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Medicine</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 hidden sm:table-cell">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600">MRP</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600">Sale</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600 w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedMedicines.map((medicine) => (
                    <tr key={medicine.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800 truncate max-w-[150px] sm:max-w-none">
                          {medicine.name}
                        </div>
                        <div className="text-xs text-slate-400 sm:hidden">{medicine.category || '-'}</div>
                      </td>
                      <td className="py-2 px-3 hidden sm:table-cell">
                        <span className="text-slate-500 text-xs">{medicine.category || '-'}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-slate-500">₹{medicine.mrp || 0}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="font-semibold text-orange-600">₹{medicine.sale_price || medicine.mrp || 0}</span>
                        {medicine.discount_percent > 0 && (
                          <span className="ml-1 text-xs text-green-600">-{medicine.discount_percent}%</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openEditDialog(medicine)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(medicine.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {filteredMedicines.length} items • Page {currentPage}/{totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingMedicine ? 'Edit Medicine' : 'Add Medicine'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Paracetamol 500mg"
                className="h-9 text-sm"
              />
            </div>
            
            {/* Image */}
            <div>
              <Label className="text-xs">Image</Label>
              <div className="flex gap-2 items-center mt-1">
                <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                  id="medicine-image-upload"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('medicine-image-upload').click()}
                  disabled={uploadingImage}
                  className="h-8 text-xs"
                >
                  {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  Upload
                </Button>
              </div>
            </div>
            
            {/* Pricing */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">MRP *</Label>
                <Input
                  type="number"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  placeholder="0"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Discount %</Label>
                <Input
                  type="number"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                  placeholder="0"
                  className="h-9 text-sm"
                  min="0" max="100"
                />
              </div>
              <div>
                <Label className="text-xs">Sale Price</Label>
                <Input
                  type="number"
                  value={formData.sale_price}
                  readOnly
                  className="h-9 text-sm bg-slate-50"
                />
              </div>
            </div>
            
            {/* Category & Stock */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Pain Relief"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Stock</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1 h-9 text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 text-sm bg-orange-500 hover:bg-orange-600">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicineInventoryTab;
