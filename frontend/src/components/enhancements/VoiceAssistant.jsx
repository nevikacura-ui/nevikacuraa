import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Globe, Sparkles, Loader2, Calendar, User, Clock, Check, X, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Multi-language Voice Assistant (#29)
const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState('en');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(null);
  const [conversation, setConversation] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' }
  ];

  const quickCommands = {
    en: [
      "Book an appointment with Dr. Vikas",
      "Check my appointments",
      "Order my medicines",
      "Book a lab test"
    ],
    hi: [
      "डॉ. विकास से अपॉइंटमेंट बुक करें",
      "मेरी अपॉइंटमेंट देखें",
      "दवाइयाँ ऑर्डर करें",
      "लैब टेस्ट बुक करें"
    ],
    mr: [
      "डॉ. विकास सोबत अपॉइंटमेंट बुक करा",
      "माझ्या अपॉइंटमेंट पहा",
      "औषधे ऑर्डर करा",
      "लॅब टेस्ट बुक करा"
    ]
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
      toast.info(language === 'en' ? 'Listening...' : language === 'hi' ? 'सुन रहा हूं...' : 'ऐकत आहे...');
    } catch (error) {
      toast.error('Could not access microphone');
      console.error('Microphone error:', error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('patientToken');
      
      // Step 1: Transcribe audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', language);
      
      const transcribeRes = await fetch(`${API}/api/features/voice/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const transcribeData = await transcribeRes.json();
      
      if (!transcribeData.success || !transcribeData.text) {
        throw new Error('Transcription failed');
      }
      
      setTranscript(transcribeData.text);
      
      // Add to conversation
      setConversation(prev => [...prev, { type: 'user', text: transcribeData.text, language }]);
      
      // Step 2: Process command
      const processRes = await fetch(`${API}/api/features/voice/process-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: transcribeData.text,
          language
        })
      });
      
      const processData = await processRes.json();
      
      setResponse(processData);
      setConversation(prev => [...prev, { 
        type: 'assistant', 
        text: processData.response_text,
        intent: processData.intent,
        data: processData.extracted_data
      }]);
      
      // Speak response (if browser supports)
      if ('speechSynthesis' in window && processData.response_text) {
        const utterance = new SpeechSynthesisUtterance(processData.response_text);
        utterance.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
        speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      const errorMessages = {
        en: "Sorry, I couldn't process that. Please try again.",
        hi: "क्षमा करें, मैं समझ नहीं पाया। कृपया पुनः प्रयास करें।",
        mr: "माफ करा, मला समजले नाही. कृपया पुन्हा प्रयत्न करा."
      };
      setConversation(prev => [...prev, { type: 'assistant', text: errorMessages[language], isError: true }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickCommand = async (command) => {
    setTranscript(command);
    setConversation(prev => [...prev, { type: 'user', text: command, language }]);
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/features/voice/process-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: command, language })
      });
      
      const data = await res.json();
      setResponse(data);
      setConversation(prev => [...prev, { 
        type: 'assistant', 
        text: data.response_text,
        intent: data.intent 
      }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getGreeting = () => {
    const greetings = {
      en: "Hi! I'm your health assistant. How can I help you today?",
      hi: "नमस्ते! मैं आपका स्वास्थ्य सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?",
      mr: "नमस्कार! मी तुमचा आरोग्य सहाय्यक आहे. आज मी तुम्हाला कशी मदत करू शकतो?"
    };
    return greetings[language];
  };

  return (
    <div className="space-y-4" data-testid="voice-assistant">
      {/* Header */}
      <Card className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Voice Assistant</h2>
                <p className="text-violet-100 text-sm">Book appointments by voice</p>
              </div>
            </div>
            <Badge className="bg-white/20">
              <Languages className="w-3 h-3 mr-1" />
              {languages.find(l => l.code === language)?.nativeName}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Language Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Globe className="w-5 h-5 text-violet-600" />
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Display */}
      <Card className="min-h-[200px]">
        <CardContent className="p-4">
          {conversation.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto text-violet-300 mb-4" />
              <p className="text-gray-600">{getGreeting()}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {conversation.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.type === 'user' 
                      ? 'bg-violet-600 text-white rounded-br-sm' 
                      : msg.isError 
                        ? 'bg-red-100 text-red-700 rounded-bl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                    {msg.intent && (
                      <Badge className="mt-2 text-xs" variant="outline">
                        Intent: {msg.intent}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Button */}
      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`w-24 h-24 rounded-full transition-all ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-violet-600 hover:bg-violet-700'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </Button>
        <p className="text-sm text-gray-500">
          {isProcessing 
            ? (language === 'en' ? 'Processing...' : language === 'hi' ? 'प्रोसेसिंग...' : 'प्रक्रिया करत आहे...')
            : isListening 
              ? (language === 'en' ? 'Tap to stop' : language === 'hi' ? 'रोकने के लिए टैप करें' : 'थांबवण्यासाठी टॅप करा')
              : (language === 'en' ? 'Tap to speak' : language === 'hi' ? 'बोलने के लिए टैप करें' : 'बोलण्यासाठी टॅप करा')
          }
        </p>
      </div>

      {/* Quick Commands */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">
            {language === 'en' ? 'Quick Commands' : language === 'hi' ? 'त्वरित आदेश' : 'जलद आदेश'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickCommands[language].map((cmd, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleQuickCommand(cmd)}
                disabled={isProcessing}
                className="text-xs"
              >
                {cmd}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Response Actions */}
      {response?.intent === 'book_appointment' && response?.extracted_data?.doctor && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-green-800 mb-3">
              {language === 'en' ? 'Ready to book:' : language === 'hi' ? 'बुक करने के लिए तैयार:' : 'बुक करण्यास तयार:'}
            </h3>
            <div className="space-y-2 text-sm">
              {response.extracted_data.doctor && (
                <p className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {response.extracted_data.doctor}
                </p>
              )}
              {response.extracted_data.date && (
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {response.extracted_data.date}
                </p>
              )}
              {response.extracted_data.time && (
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {response.extracted_data.time}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Confirm' : language === 'hi' ? 'पुष्टि करें' : 'पुष्टी करा'}
              </Button>
              <Button variant="outline" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Cancel' : language === 'hi' ? 'रद्द करें' : 'रद्द करा'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceAssistant;
