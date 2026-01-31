import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Plus, Edit2, Trash2, FlaskConical, IndianRupee, Percent, 
  Image, Save, Search, Loader2, Upload, Clock, Download, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` }
});

const ITEMS_PER_PAGE = 15;

const TestInventoryTab = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
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

  // Calculate sale price
  useEffect(() => {
    if (formData.cost) {
      const cost = parseFloat(formData.cost);
      const discount = parseFloat(formData.discount_percent) || 0;
      const salePrice = cost - (cost * discount / 100);
      setFormData(prev => ({ ...prev, sale_price: salePrice.toFixed(2) }));
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

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(tests.map(t => t.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [tests]);

  // Filter and paginate
  const filteredTests = useMemo(() => {
    let result = tests;
    
    if (searchQuery) {
      result = result.filter(test => 
        test.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      result = result.filter(test => test.category === selectedCategory);
    }
    
    return result;
  }, [tests, searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredTests.length / ITEMS_PER_PAGE);
  const paginatedTests = filteredTests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Cost', 'Discount %', 'Sale Price', 'Report Time', 'Sample Type'];
    const rows = filteredTests.map(t => [
      t.name || '', t.category || '', t.cost || 0, t.discount_percent || 0,
      t.sale_price || t.cost || 0, t.report_time || '', t.sample_type || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    downloadFile(csvContent, 'test_inventory.csv', 'text/csv');
    toast.success('CSV exported');
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
      </Row>
      ${filteredTests.map(t => `
      <Row>
        <Cell><Data ss:Type="String">${t.name || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${t.category || ''}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.cost || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.discount_percent || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.sale_price || t.cost || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${t.report_time || ''}</Data></Cell>
      </Row>`).join('')}
    </Table>
  </Worksheet>
</Workbook>`;
      downloadFile(xmlContent, 'test_inventory.xls', 'application/vnd.ms-excel');
      toast.success('Excel exported');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Inventory - Proton Diagnostics</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #7c3aed; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #7c3aed; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Test Inventory</h1>
        <p style="text-align: center; color: #666;">Proton Diagnostics - Nevika Cura</p>
        <p style="text-align: center; color: #666;">Generated: ${new Date().toLocaleDateString('en-IN')}</p>
        <table>
          <thead>
            <tr><th>#</th><th>Test Name</th><th>Category</th><th>Cost</th><th>Sale Price</th><th>Report Time</th></tr>
          </thead>
          <tbody>
            ${filteredTests.map((t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${t.name || '-'}</td>
                <td>${t.category || '-'}</td>
                <td>₹${t.cost || 0}</td>
                <td>₹${t.sale_price || t.cost || 0}</td>
                <td>${t.report_time || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="footer">Total: ${filteredTests.length} tests</p>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    toast.success('PDF ready');
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }

    setUploadingImage(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('type', 'test');

    try {
      const response = await axios.post(`${API}/api/upload/image`, formDataUpload, {
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image_url: response.data.url }));
      toast.success('Uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.cost) {
      toast.error('Name and cost required');
      return;
    }

    setSaving(true);
    try {
      if (editingTest) {
        await axios.put(`${API}/api/diagnostics/inventory/${editingTest.id}`, formData, getAuthHeaders());
        toast.success('Test updated');
      } else {
        await axios.post(`${API}/api/diagnostics/inventory`, formData, getAuthHeaders());
        toast.success('Test added');
      }
      setShowAddDialog(false);
      setEditingTest(null);
      resetForm();
      fetchTests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this test?')) return;
    try {
      await axios.delete(`${API}/api/diagnostics/inventory/${id}`, getAuthHeaders());
      toast.success('Test deleted');
      fetchTests();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', image_url: '', cost: '', discount_percent: '',
      sale_price: '', category: '', description: '', report_time: '',
      sample_type: '', preparation: ''
    });
  };

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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button 
            onClick={() => { resetForm(); setEditingTest(null); setShowAddDialog(true); }}
            size="sm"
            className="bg-purple-500 hover:bg-purple-600 h-9 px-3"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Add</span>
          </Button>
        </div>
        
        <div className="flex gap-2 items-center overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {categories.slice(0, 6).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
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

      {/* Test List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : filteredTests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FlaskConical className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">No tests found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Test</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 hidden sm:table-cell">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600">Cost</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600">Sale</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600 hidden sm:table-cell">Report</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600 w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedTests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800 truncate max-w-[120px] sm:max-w-none">
                          {test.name}
                        </div>
                        <div className="text-xs text-slate-400 sm:hidden">{test.report_time || '-'}</div>
                      </td>
                      <td className="py-2 px-3 hidden sm:table-cell">
                        <span className="text-slate-500 text-xs">{test.category || '-'}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-slate-500">₹{test.cost || 0}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="font-semibold text-purple-600">₹{test.sale_price || test.cost || 0}</span>
                        {test.discount_percent > 0 && (
                          <span className="ml-1 text-xs text-green-600">-{test.discount_percent}%</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center hidden sm:table-cell">
                        <span className="text-xs text-slate-500">{test.report_time || '-'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => openEditDialog(test)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(test.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {filteredTests.length} tests • Page {currentPage}/{totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-2">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-2">
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
            <DialogTitle className="text-base">{editingTest ? 'Edit Test' : 'Add Test'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-9 text-sm" placeholder="e.g., CBC" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Cost *</Label>
                <Input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="h-9 text-sm" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Discount %</Label>
                <Input type="number" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })} className="h-9 text-sm" min="0" max="100" />
              </div>
              <div>
                <Label className="text-xs">Sale Price</Label>
                <Input type="number" value={formData.sale_price} readOnly className="h-9 text-sm bg-slate-50" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="h-9 text-sm" placeholder="Hematology" />
              </div>
              <div>
                <Label className="text-xs">Report Time</Label>
                <Input value={formData.report_time} onChange={(e) => setFormData({ ...formData, report_time: e.target.value })} className="h-9 text-sm" placeholder="24 hrs" />
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Sample Type</Label>
              <Input value={formData.sample_type} onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })} className="h-9 text-sm" placeholder="Blood" />
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1 h-9 text-sm">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 text-sm bg-purple-500 hover:bg-purple-600">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestInventoryTab;
