import React, { useState } from 'react';
import { Radio, Send, Users, Filter, CheckCircle, Clock, MessageSquare, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

const BroadcastMessages = () => {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [channel, setChannel] = useState('all');
  const [sent, setSent] = useState(false);
  const [recentBroadcasts, setRecentBroadcasts] = useState([
    { id: '1', title: 'Flu Vaccination Camp', recipients: 450, delivered: 432, read: 280, date: '2 days ago' },
    { id: '2', title: 'Clinic Holiday Notice', recipients: 1200, delivered: 1180, read: 890, date: '1 week ago' }
  ]);

  const patientGroups = [
    { id: 'diabetes', name: 'Diabetes Patients', count: 245 },
    { id: 'pregnancy', name: 'Pregnancy Care', count: 89 },
    { id: 'seniors', name: 'Senior Citizens', count: 156 },
    { id: 'regular', name: 'Regular Visitors', count: 420 },
    { id: 'all', name: 'All Patients', count: 1200 }
  ];

  const channels = [
    { id: 'all', name: 'All Channels', icon: Bell },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
    { id: 'sms', name: 'SMS', icon: MessageSquare },
    { id: 'push', name: 'Push Notification', icon: Bell }
  ];

  const toggleGroup = (groupId) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(g => g !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const getTotalRecipients = () => {
    if (selectedGroups.includes('all')) {
      return patientGroups.find(g => g.id === 'all').count;
    }
    return selectedGroups.reduce((sum, gId) => {
      const group = patientGroups.find(g => g.id === gId);
      return sum + (group?.count || 0);
    }, 0);
  };

  const sendBroadcast = () => {
    if (!title || !message || selectedGroups.length === 0) {
      toast.error('Please fill all fields and select at least one group');
      return;
    }

    toast.success(`Broadcast sent to ${getTotalRecipients()} patients!`);
    setSent(true);
    
    setRecentBroadcasts([
      { id: Date.now().toString(), title, recipients: getTotalRecipients(), delivered: 0, read: 0, date: 'Just now' },
      ...recentBroadcasts
    ]);
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setSelectedGroups([]);
    setSent(false);
  };

  return (
    <div className="space-y-4" data-testid="broadcast-messages">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Broadcast Messages</h2>
              <p className="text-purple-100 text-sm">Send health tips & announcements</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!sent ? (
        <>
          {/* Message Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g., Health Camp Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
              </div>
            </CardContent>
          </Card>

          {/* Select Recipients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" /> Select Recipients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {patientGroups.map(group => (
                  <Button
                    key={group.id}
                    variant={selectedGroups.includes(group.id) ? "default" : "outline"}
                    className="justify-start h-auto py-2"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs opacity-70">{group.count} patients</p>
                    </div>
                  </Button>
                ))}
              </div>
              {selectedGroups.length > 0 && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700">
                    <Users className="w-4 h-4 inline mr-1" />
                    Sending to <strong>{getTotalRecipients()}</strong> patients
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Channel Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Send Via</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {channels.map(ch => (
                  <Button
                    key={ch.id}
                    variant={channel === ch.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChannel(ch.id)}
                  >
                    <ch.icon className="w-4 h-4 mr-1" />
                    {ch.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Send Button */}
          <Button onClick={sendBroadcast} className="w-full" size="lg" disabled={!title || !message || selectedGroups.length === 0}>
            <Send className="w-4 h-4 mr-2" /> Send Broadcast
          </Button>
        </>
      ) : (
        /* Success State */
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Broadcast Sent!</h3>
            <p className="text-gray-500 mb-4">
              Your message is being delivered to {getTotalRecipients()} patients.
            </p>
            <Button onClick={resetForm}>Send Another</Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Broadcasts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Broadcasts</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {recentBroadcasts.map(broadcast => (
            <div key={broadcast.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{broadcast.title}</p>
                  <p className="text-xs text-gray-500">{broadcast.date}</p>
                </div>
                <Badge variant="outline">{broadcast.recipients} sent</Badge>
              </div>
              <div className="flex gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {broadcast.delivered} delivered
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  {broadcast.read} read
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcastMessages;
