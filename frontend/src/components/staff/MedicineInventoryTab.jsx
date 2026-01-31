import React, { useState, useEffect } from 'react';
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
  Image, Save, Search, Loader2, Upload, Download, FileSpreadsheet, FileText
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` }
});

const MedicineInventoryTab = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Export functions
  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'MRP', 'Discount %', 'Sale Price', 'Stock', 'Unit'];
    const rows = medicines.map(m => [
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
      // Create a simple Excel-compatible XML
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
      ${medicines.map(m => `
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
    // Create printable HTML and open in new window for PDF
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medicine Inventory - Nevika Cura</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0d9488; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #0d9488; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>🏥 Medicine Inventory</h1>
        <p style="text-align: center; color: #666;">Orange Pharmacy - Nevika Cura Healthcare</p>
        <p style="text-align: center; color: #666;">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Medicine Name</th>
              <th>Category</th>
              <th>MRP (₹)</th>
              <th>Discount</th>
              <th>Sale Price (₹)</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            ${medicines.map((m, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${m.name || '-'}</td>
                <td>${m.category || '-'}</td>
                <td>₹${m.mrp || 0}</td>
                <td>${m.discount_percent || 0}%</td>
                <td>₹${m.sale_price || m.mrp || 0}</td>
                <td>${m.stock || 0} ${m.unit || 'strip'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="footer">Total Items: ${medicines.length} | Doctor-Led. Patient-Focused.</p>
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

    const maxSize = 5 * 1024 * 1024; // 5MB
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
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      setFormData(prev => ({ ...prev, image_url: response.data.url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Save medicine
  const handleSave = async () => {
    if (!formData.name || !formData.mrp) {
      toast.error('Medicine name and MRP are required');
      return;
    }

    setSaving(true);
    try {
      if (editingMedicine) {
        await axios.put(
          `${API}/api/pharmacy/inventory/${editingMedicine.id}`, 
          formData, 
          getAuthHeaders()
        );
        toast.success('Medicine updated successfully');
      } else {
        await axios.post(`${API}/api/pharmacy/inventory`, formData, getAuthHeaders());
        toast.success('Medicine added successfully');
      }
      
      setShowAddDialog(false);
      setEditingMedicine(null);
      resetForm();
      fetchMedicines();
    } catch (error) {
      console.error('Failed to save medicine:', error);
      toast.error(error.response?.data?.detail || 'Failed to save medicine');
    } finally {
      setSaving(false);
    }
  };

  // Delete medicine
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) return;

    try {
      await axios.delete(`${API}/api/pharmacy/inventory/${id}`, getAuthHeaders());
      toast.success('Medicine deleted successfully');
      fetchMedicines();
    } catch (error) {
      console.error('Failed to delete medicine:', error);
      toast.error('Failed to delete medicine');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
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
  };

  // Open edit dialog
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

  // Filter medicines
  const filteredMedicines = medicines.filter(med => 
    med.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="medicine-search"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Export Buttons */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCSV}
            className="text-green-600 border-green-200 hover:bg-green-50"
            data-testid="export-csv-btn"
          >
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToExcel}
            disabled={exporting}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            data-testid="export-excel-btn"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToPDF}
            className="text-red-600 border-red-200 hover:bg-red-50"
            data-testid="export-pdf-btn"
          >
            <FileText className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button 
            onClick={() => { resetForm(); setEditingMedicine(null); setShowAddDialog(true); }}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            data-testid="add-medicine-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Medicine List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filteredMedicines.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No medicines in inventory</p>
            <p className="text-sm text-slate-400 mt-1">Add your first medicine to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMedicines.map((medicine) => (
            <Card key={medicine.id} className="hover:shadow-lg transition-shadow" data-testid={`medicine-card-${medicine.id}`}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {medicine.image_url ? (
                      <img src={medicine.image_url} alt={medicine.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{medicine.name}</h4>
                    {medicine.category && (
                      <Badge variant="outline" className="text-xs mt-1">{medicine.category}</Badge>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-bold text-orange-600">₹{medicine.sale_price || medicine.mrp}</span>
                      {medicine.discount_percent > 0 && (
                        <>
                          <span className="text-sm text-slate-400 line-through">₹{medicine.mrp}</span>
                          <Badge className="bg-green-100 text-green-700 text-xs">{medicine.discount_percent}% OFF</Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditDialog(medicine)}
                    className="flex-1"
                    data-testid={`edit-medicine-${medicine.id}`}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(medicine.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    data-testid={`delete-medicine-${medicine.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Medicine Name */}
            <div>
              <Label>Medicine Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Paracetamol 500mg"
                data-testid="medicine-name-input"
              />
            </div>
            
            {/* Image Upload */}
            <div>
              <Label>Product Image</Label>
              <div className="flex gap-3 items-center mt-1.5">
                <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
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
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Image
                  </Button>
                  <p className="text-xs text-slate-500 mt-1">Max 5MB, JPG/PNG</p>
                </div>
              </div>
            </div>
            
            {/* MRP and Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>MRP (₹) *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    placeholder="0.00"
                    className="pl-10"
                    data-testid="medicine-mrp-input"
                  />
                </div>
              </div>
              <div>
                <Label>Discount (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                    placeholder="0"
                    className="pl-10"
                    min="0"
                    max="100"
                    data-testid="medicine-discount-input"
                  />
                </div>
              </div>
            </div>
            
            {/* Sale Price (Calculated) */}
            <div>
              <Label>Sale Price (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={formData.sale_price}
                  readOnly
                  className="pl-10 bg-slate-50"
                  data-testid="medicine-sale-price"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Auto-calculated: MRP - Discount</p>
            </div>
            
            {/* Category */}
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Pain Relief, Antibiotics"
              />
            </div>
            
            {/* Stock and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="strip">Strip</option>
                  <option value="tablet">Tablet</option>
                  <option value="bottle">Bottle</option>
                  <option value="tube">Tube</option>
                  <option value="pack">Pack</option>
                  <option value="box">Box</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500"
              data-testid="save-medicine-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingMedicine ? 'Update' : 'Add'} Medicine
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicineInventoryTab;
