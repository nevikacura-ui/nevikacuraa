import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Plus, Edit2, Trash2, FlaskConical, IndianRupee, Percent, 
  Image, Save, Search, Loader2, Upload, Clock, Download, FileSpreadsheet, FileText
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` }
});

const TestInventoryTab = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    cost: '',
    discount_percent: '',
    sale_price: '',
    category: '',
    description: '',
    report_time: '',
    sample_type: '',
    preparation: ''
  });

  // Export functions
  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Cost', 'Discount %', 'Sale Price', 'Report Time', 'Sample Type'];
    const rows = tests.map(t => [
      t.name || '',
      t.category || '',
      t.cost || 0,
      t.discount_percent || 0,
      t.sale_price || t.cost || 0,
      t.report_time || '',
      t.sample_type || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    downloadFile(csvContent, 'test_inventory.csv', 'text/csv');
    toast.success('CSV exported successfully');
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Test Inventory">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Name</Data></Cell>
        <Cell><Data ss:Type="String">Category</Data></Cell>
        <Cell><Data ss:Type="String">Cost</Data></Cell>
        <Cell><Data ss:Type="String">Discount %</Data></Cell>
        <Cell><Data ss:Type="String">Sale Price</Data></Cell>
        <Cell><Data ss:Type="String">Report Time</Data></Cell>
        <Cell><Data ss:Type="String">Sample Type</Data></Cell>
      </Row>
      ${tests.map(t => `
      <Row>
        <Cell><Data ss:Type="String">${t.name || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${t.category || ''}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.cost || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.discount_percent || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.sale_price || t.cost || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${t.report_time || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${t.sample_type || ''}</Data></Cell>
      </Row>`).join('')}
    </Table>
  </Worksheet>
</Workbook>`;
      
      downloadFile(xmlContent, 'test_inventory.xls', 'application/vnd.ms-excel');
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
        <title>Test Inventory - Nevika Cura</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #7c3aed; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #7c3aed; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>🔬 Test Inventory</h1>
        <p style="text-align: center; color: #666;">Proton Diagnostics - Nevika Cura Healthcare</p>
        <p style="text-align: center; color: #666;">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Test Name</th>
              <th>Category</th>
              <th>Cost (₹)</th>
              <th>Discount</th>
              <th>Sale Price (₹)</th>
              <th>Report Time</th>
            </tr>
          </thead>
          <tbody>
            ${tests.map((t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${t.name || '-'}</td>
                <td>${t.category || '-'}</td>
                <td>₹${t.cost || 0}</td>
                <td>${t.discount_percent || 0}%</td>
                <td>₹${t.sale_price || t.cost || 0}</td>
                <td>${t.report_time || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="footer">Total Tests: ${tests.length} | Doctor-Led. Patient-Focused.</p>
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

  // Calculate sale price when cost or discount changes
  useEffect(() => {
    if (formData.cost && formData.discount_percent) {
      const cost = parseFloat(formData.cost);
      const discount = parseFloat(formData.discount_percent);
      const salePrice = cost - (cost * discount / 100);
      setFormData(prev => ({ ...prev, sale_price: salePrice.toFixed(2) }));
    } else if (formData.cost) {
      setFormData(prev => ({ ...prev, sale_price: formData.cost }));
    }
  }, [formData.cost, formData.discount_percent]);

  // Fetch tests
  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/diagnostics/inventory`, getAuthHeaders());
      setTests(response.data.tests || []);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
      toast.error('Failed to load test inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

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
    formDataUpload.append('type', 'test');

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

  // Save test
  const handleSave = async () => {
    if (!formData.name || !formData.cost) {
      toast.error('Test name and cost are required');
      return;
    }

    setSaving(true);
    try {
      if (editingTest) {
        await axios.put(
          `${API}/api/diagnostics/inventory/${editingTest.id}`, 
          formData, 
          getAuthHeaders()
        );
        toast.success('Test updated successfully');
      } else {
        await axios.post(`${API}/api/diagnostics/inventory`, formData, getAuthHeaders());
        toast.success('Test added successfully');
      }
      
      setShowAddDialog(false);
      setEditingTest(null);
      resetForm();
      fetchTests();
    } catch (error) {
      console.error('Failed to save test:', error);
      toast.error(error.response?.data?.detail || 'Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  // Delete test
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;

    try {
      await axios.delete(`${API}/api/diagnostics/inventory/${id}`, getAuthHeaders());
      toast.success('Test deleted successfully');
      fetchTests();
    } catch (error) {
      console.error('Failed to delete test:', error);
      toast.error('Failed to delete test');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      image_url: '',
      cost: '',
      discount_percent: '',
      sale_price: '',
      category: '',
      description: '',
      report_time: '',
      sample_type: '',
      preparation: ''
    });
  };

  // Open edit dialog
  const openEditDialog = (test) => {
    setEditingTest(test);
    setFormData({
      name: test.name || '',
      image_url: test.image_url || '',
      cost: test.cost?.toString() || '',
      discount_percent: test.discount_percent?.toString() || '',
      sale_price: test.sale_price?.toString() || '',
      category: test.category || '',
      description: test.description || '',
      report_time: test.report_time || '',
      sample_type: test.sample_type || '',
      preparation: test.preparation || ''
    });
    setShowAddDialog(true);
  };

  // Filter tests
  const filteredTests = tests.filter(test => 
    test.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="test-search"
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
            onClick={() => { resetForm(); setEditingTest(null); setShowAddDialog(true); }}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            data-testid="add-test-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Test
          </Button>
        </div>
      </div>

      {/* Test List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredTests.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <FlaskConical className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No tests in inventory</p>
            <p className="text-sm text-slate-400 mt-1">Add your first test to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTests.map((test) => (
            <Card key={test.id} className="hover:shadow-lg transition-shadow" data-testid={`test-card-${test.id}`}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg bg-purple-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {test.image_url ? (
                      <img src={test.image_url} alt={test.name} className="w-full h-full object-cover" />
                    ) : (
                      <FlaskConical className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{test.name}</h4>
                    {test.category && (
                      <Badge variant="outline" className="text-xs mt-1 border-purple-200 text-purple-600">{test.category}</Badge>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-bold text-purple-600">₹{test.sale_price || test.cost}</span>
                      {test.discount_percent > 0 && (
                        <>
                          <span className="text-sm text-slate-400 line-through">₹{test.cost}</span>
                          <Badge className="bg-green-100 text-green-700 text-xs">{test.discount_percent}% OFF</Badge>
                        </>
                      )}
                    </div>
                    {test.report_time && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        Report in {test.report_time}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditDialog(test)}
                    className="flex-1"
                    data-testid={`edit-test-${test.id}`}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(test.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    data-testid={`delete-test-${test.id}`}
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
              {editingTest ? 'Edit Test' : 'Add New Test'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Test Name */}
            <div>
              <Label>Test Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Complete Blood Count (CBC)"
                data-testid="test-name-input"
              />
            </div>
            
            {/* Image Upload */}
            <div>
              <Label>Test Image</Label>
              <div className="flex gap-3 items-center mt-1.5">
                <div className="w-20 h-20 rounded-lg bg-purple-50 flex items-center justify-center overflow-hidden border-2 border-dashed border-purple-200">
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-purple-400" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                    id="test-image-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => document.getElementById('test-image-upload').click()}
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
            
            {/* Cost and Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost (₹) *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    className="pl-10"
                    data-testid="test-cost-input"
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
                    data-testid="test-discount-input"
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
                  data-testid="test-sale-price"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Auto-calculated: Cost - Discount</p>
            </div>
            
            {/* Report Time */}
            <div>
              <Label>Report Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={formData.report_time}
                  onChange={(e) => setFormData({ ...formData, report_time: e.target.value })}
                  placeholder="e.g., 24 hours, Same day, 2-3 days"
                  className="pl-10"
                  data-testid="test-report-time-input"
                />
              </div>
            </div>
            
            {/* Category */}
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Hematology, Biochemistry"
              />
            </div>
            
            {/* Sample Type */}
            <div>
              <Label>Sample Type</Label>
              <Input
                value={formData.sample_type}
                onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                placeholder="e.g., Blood, Urine, Stool"
              />
            </div>
            
            {/* Preparation Instructions */}
            <div>
              <Label>Preparation Instructions</Label>
              <Textarea
                value={formData.preparation}
                onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
                placeholder="e.g., Fasting required for 8-12 hours"
                rows={2}
              />
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
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500"
              data-testid="save-test-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingTest ? 'Update' : 'Add'} Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestInventoryTab;
