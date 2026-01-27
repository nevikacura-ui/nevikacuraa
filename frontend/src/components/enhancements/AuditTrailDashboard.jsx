import React, { useState, useEffect } from 'react';
import { Shield, Eye, Search, Calendar, User, FileText, Filter, Download, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

const AuditTrailDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filter]);

  const fetchLogs = () => {
    setLogs([
      { id: '1', action: 'VIEW', resource: 'Patient Record', user: 'Dr. Vikas Jha', patient: 'Rajesh Kumar', timestamp: '2026-01-27 10:30', ip: '192.168.1.45', status: 'success' },
      { id: '2', action: 'EDIT', resource: 'Prescription', user: 'Dr. Neha Patel', patient: 'Priya Sharma', timestamp: '2026-01-27 10:25', ip: '192.168.1.32', status: 'success' },
      { id: '3', action: 'EXPORT', resource: 'Lab Reports', user: 'Staff Admin', patient: 'Multiple', timestamp: '2026-01-27 10:20', ip: '192.168.1.10', status: 'flagged' },
      { id: '4', action: 'LOGIN', resource: 'System', user: 'Dr. Vikas Jha', patient: '-', timestamp: '2026-01-27 10:00', ip: '192.168.1.45', status: 'success' },
      { id: '5', action: 'VIEW', resource: 'Billing', user: 'Receptionist', patient: 'Amit Singh', timestamp: '2026-01-27 09:55', ip: '192.168.1.22', status: 'success' },
      { id: '6', action: 'DELETE', resource: 'Appointment', user: 'Staff Admin', patient: 'Sunita Devi', timestamp: '2026-01-27 09:45', ip: '192.168.1.10', status: 'flagged' }
    ]);
  };

  const fetchStats = () => {
    setStats({
      total_actions: 1247,
      unique_users: 12,
      flagged: 3,
      most_accessed: 'Patient Records'
    });
  };

  const getActionColor = (action) => {
    const colors = {
      VIEW: 'bg-blue-100 text-blue-700',
      EDIT: 'bg-amber-100 text-amber-700',
      DELETE: 'bg-red-100 text-red-700',
      EXPORT: 'bg-purple-100 text-purple-700',
      LOGIN: 'bg-green-100 text-green-700',
      LOGOUT: 'bg-gray-100 text-gray-700'
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'flagged' && log.status !== 'flagged') return false;
    if (searchQuery && !log.user.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.patient.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4" data-testid="audit-trail-dashboard">
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-700 to-slate-900 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Audit Trail</h2>
                <p className="text-slate-300 text-sm">Security & compliance monitoring</p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.total_actions}</p>
              <p className="text-xs text-gray-500">Total Actions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.unique_users}</p>
              <p className="text-xs text-gray-500">Active Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.flagged}</p>
              <p className="text-xs text-gray-500">Flagged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-sm font-bold">{stats.most_accessed}</p>
              <p className="text-xs text-gray-500">Most Accessed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by user or patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'flagged' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('flagged')}
        >
          <AlertTriangle className="w-4 h-4 mr-1" /> Flagged
        </Button>
      </div>

      {/* Logs */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredLogs.map(log => (
              <div key={log.id} className={`p-4 hover:bg-gray-50 ${log.status === 'flagged' ? 'bg-amber-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                      {log.action === 'VIEW' && <Eye className="w-5 h-5" />}
                      {log.action === 'EDIT' && <FileText className="w-5 h-5" />}
                      {log.action === 'DELETE' && <AlertTriangle className="w-5 h-5" />}
                      {log.action === 'EXPORT' && <Download className="w-5 h-5" />}
                      {log.action === 'LOGIN' && <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                        <span className="font-medium">{log.resource}</span>
                        {log.status === 'flagged' && (
                          <Badge className="bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Flagged
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">{log.user}</span>
                        {log.patient !== '-' && <span> → Patient: {log.patient}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.timestamp}
                    </div>
                    <p className="text-xs mt-1">IP: {log.ip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditTrailDashboard;
