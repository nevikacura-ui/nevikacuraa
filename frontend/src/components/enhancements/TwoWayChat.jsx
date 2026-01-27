import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Paperclip, Image, Phone, Video, MoreVertical, Check, CheckCheck, Clock, User, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const TwoWayChat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = () => {
    setConversations([
      {
        id: '1',
        doctor_name: 'Dr. Vikas Jha',
        specialty: 'Diabetologist',
        last_message: 'Your test results look good. Keep monitoring your sugar levels.',
        timestamp: '2 hours ago',
        unread: 2,
        online: true,
        avatar: null
      },
      {
        id: '2',
        doctor_name: 'Dr. Neha Patel',
        specialty: 'OBGYN',
        last_message: 'See you at your next appointment!',
        timestamp: 'Yesterday',
        unread: 0,
        online: false,
        avatar: null
      }
    ]);
  };

  const fetchMessages = (chatId) => {
    // Mock messages
    setMessages([
      {
        id: '1',
        sender: 'doctor',
        text: 'Hello! How are you feeling today?',
        timestamp: '10:00 AM',
        status: 'read'
      },
      {
        id: '2',
        sender: 'patient',
        text: 'Hi Doctor, I am feeling much better. The new medication seems to be working well.',
        timestamp: '10:05 AM',
        status: 'read'
      },
      {
        id: '3',
        sender: 'doctor',
        text: 'That\'s great to hear! Have you noticed any side effects?',
        timestamp: '10:08 AM',
        status: 'read'
      },
      {
        id: '4',
        sender: 'patient',
        text: 'No side effects so far. My blood sugar readings have been stable around 120-140.',
        timestamp: '10:15 AM',
        status: 'read'
      },
      {
        id: '5',
        sender: 'doctor',
        text: 'Your test results look good. Keep monitoring your sugar levels. Let me know if you have any concerns.',
        timestamp: '10:20 AM',
        status: 'delivered'
      }
    ]);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      sender: 'patient',
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Simulate doctor typing
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'doctor',
          text: 'Thank you for the update. I will review and get back to you shortly.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered'
        }]);
      }, 2000);
    }, 1000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default: return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4" data-testid="two-way-chat">
      {!activeChat ? (
        /* Conversation List */
        <>
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Messages</h2>
                  <p className="text-blue-100 text-sm">Chat with your doctors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {conversations.map(conv => (
              <Card
                key={conv.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveChat(conv)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      {conv.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{conv.doctor_name}</p>
                        <span className="text-xs text-gray-500">{conv.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-500">{conv.specialty}</p>
                      <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                    </div>
                    {conv.unread > 0 && (
                      <Badge className="bg-blue-500">{conv.unread}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        /* Active Chat */
        <div className="flex flex-col h-[600px]">
          {/* Chat Header */}
          <Card className="rounded-b-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  {activeChat.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{activeChat.doctor_name}</p>
                  <p className="text-xs text-gray-500">
                    {activeChat.online ? 'Online' : 'Last seen ' + activeChat.timestamp}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.sender === 'patient'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white shadow-sm rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${
                    msg.sender === 'patient' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    <span className="text-xs">{msg.timestamp}</span>
                    {msg.sender === 'patient' && getStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <Card className="rounded-t-none border-t">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Image className="w-5 h-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TwoWayChat;
