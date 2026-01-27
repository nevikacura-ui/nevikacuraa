import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, RefreshCw, Plus, Search, Bell, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

const SmartInventoryAlerts = () => {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = () => {
    setInventory([
      { id: '1', name: 'Metformin 500mg', category: 'Medicine', stock: 45, minStock: 100, unit: 'strips', expiry: '2026-06', status: 'low' },
      { id: '2', name: 'Paracetamol 650mg', category: 'Medicine', stock: 200, minStock: 150, unit: 'strips', expiry: '2026-12', status: 'ok' },
      { id: '3', name: 'Blood Glucose Strips', category: 'Consumable', stock: 20, minStock: 50, unit: 'boxes', expiry: '2026-03', status: 'critical' },
      { id: '4', name: 'Syringes 5ml', category: 'Consumable', stock: 500, minStock: 200, unit: 'pieces', expiry: '2027-06', status: 'ok' },
      { id: '5', name: 'Insulin Lantus', category: 'Medicine', stock: 8, minStock: 20, unit: 'pens', expiry: '2026-02', status: 'expiring' },
      { id: '6', name: 'BP Monitor Cuffs', category: 'Equipment', stock: 3, minStock: 5, unit: 'pieces', expiry: null, status: 'low' }
    ]);

    setAlerts([
      { id: '1', type: 'critical', item: 'Blood Glucose Strips', message: 'Stock critically low - only 20 boxes remaining', action: 'Order Now' },
      { id: '2', type: 'expiring', item: 'Insulin Lantus', message: 'Expiring in 30 days - 8 pens remaining', action: 'Use First' },
      { id: '3', type: 'low', item: 'Metformin 500mg', message: 'Below minimum stock level', action: 'Reorder' }
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'low': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'expiring': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getStockPercentage = (stock, minStock) => Math.min((stock / minStock) * 100, 100);

  const handleReorder = (itemId) => {
    toast.success('Reorder request submitted!');
  };

  const filteredInventory = inventory.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4" data-testid="smart-inventory-alerts">
      {/* Header */}
      <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Inventory Alerts</h2>
                <p className="text-orange-100 text-sm">Smart stock management</p>
              </div>
            </div>
            <Badge className="bg-white/20">{alerts.length} Alerts</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.type === 'critical' ? 'border-l-red-500 bg-red-50' :
              alert.type === 'expiring' ? 'border-l-purple-500 bg-purple-50' :
              'border-l-amber-500 bg-amber-50'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.type === 'critical' ? 'text-red-500' :
                      alert.type === 'expiring' ? 'text-purple-500' : 'text-amber-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{alert.item}</p>
                      <p className="text-xs text-gray-600">{alert.message}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleReorder(alert.id)}>
                    {alert.action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 border rounded-lg"
        >
          <option value="all">All Items</option>
          <option value="critical">Critical</option>
          <option value="low">Low Stock</option>
          <option value="expiring">Expiring Soon</option>
        </select>
      </div>

      {/* Inventory List */}
      <Card>
        <CardContent className="p-0 divide-y">
          {filteredInventory.map(item => (
            <div key={item.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    <Badge className={getStatusColor(item.status)} variant="outline">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{item.stock} {item.unit}</p>
                  <p className="text-xs text-gray-500">Min: {item.minStock}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={getStockPercentage(item.stock, item.minStock)} 
                  className={`flex-1 h-2 ${item.status === 'critical' ? '[&>div]:bg-red-500' : item.status === 'low' ? '[&>div]:bg-amber-500' : ''}`}
                />
                {item.expiry && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Exp: {item.expiry}
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{inventory.filter(i => i.status === 'critical').length}</p>
            <p className="text-xs text-gray-500">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{inventory.filter(i => i.status === 'low').length}</p>
            <p className="text-xs text-gray-500">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{inventory.filter(i => i.status === 'expiring').length}</p>
            <p className="text-xs text-gray-500">Expiring</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SmartInventoryAlerts;
