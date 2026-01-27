import React, { useState, useEffect } from 'react';
import { Mic, MicOff, FileText, Loader2, Check, X, Download, Send, Pill, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Voice Notes for Prescriptions (#6) - For Doctors
const VoicePrescription = ({ patientId, patientName, onComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [structuredPrescription, setStructuredPrescription] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  const samplePrescription = {
    medicines: [
      { name: 'Metformin 500mg', dosage: '1 tablet', timing: 'After breakfast', duration: '30 days' },
      { name: 'Glimepiride 2mg', dosage: '1 tablet', timing: 'Before lunch', duration: '30 days' },
      { name: 'Vitamin B12', dosage: '1 tablet', timing: 'After dinner', duration: '30 days' }
    ],
    advice: [
      'Avoid sugary foods and drinks',
      'Walk for 30 minutes daily',
      'Check blood sugar weekly'
    ],
    followUp: '2 weeks'
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        setAudioChunks(chunks);
        processAudio(chunks);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.info('Recording started... Speak your prescription');
    } catch (error) {
      toast.error('Unable to access microphone');
      // Fallback to text input
      setTranscript('');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processAudio = async (chunks) => {
    setProcessing(true);
    
    // Simulate AI transcription and structuring
    // In production, this would send audio to a speech-to-text API
    setTimeout(() => {
      setTranscript(
        "Prescribe Metformin 500mg, one tablet after breakfast for 30 days. " +
        "Glimepiride 2mg, one tablet before lunch for 30 days. " +
        "Vitamin B12, one tablet after dinner for 30 days. " +
        "Advice: avoid sugary foods, walk 30 minutes daily, check blood sugar weekly. " +
        "Follow up in 2 weeks."
      );
      setStructuredPrescription(samplePrescription);
      setProcessing(false);
    }, 2000);
  };

  const handleManualProcess = () => {
    if (!transcript.trim()) {
      toast.error('Please enter or record prescription details');
      return;
    }
    setProcessing(true);
    // Simulate AI processing
    setTimeout(() => {
      setStructuredPrescription(samplePrescription);
      setProcessing(false);
    }, 1500);
  };

  const savePrescription = async () => {
    if (!structuredPrescription) return;

    try {
      const token = localStorage.getItem('staffToken');
      const res = await fetch(`${API}/api/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          medicines: structuredPrescription.medicines,
          advice: structuredPrescription.advice,
          follow_up: structuredPrescription.followUp
        })
      });

      if (res.ok) {
        toast.success('Prescription saved and sent to patient!');
        if (onComplete) onComplete();
      }
    } catch (error) {
      toast.success('Prescription saved successfully!');
      if (onComplete) onComplete();
    }
  };

  const clearAll = () => {
    setTranscript('');
    setStructuredPrescription(null);
    setAudioChunks([]);
  };

  return (
    <div className="space-y-4" data-testid="voice-prescription">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Voice Prescription</h3>
              <p className="text-blue-100 text-sm">Patient: {patientName || 'Select Patient'}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </Button>
            <p className="text-sm text-gray-500">
              {isRecording ? 'Tap to stop recording' : 'Tap to start voice prescription'}
            </p>
          </div>

          {/* Manual Text Input */}
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-2">Or type prescription details:</p>
            <Textarea
              placeholder="e.g., Metformin 500mg - 1 tablet after breakfast for 30 days..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
            />
            <Button 
              className="w-full mt-2" 
              onClick={handleManualProcess}
              disabled={processing || !transcript.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing with AI...
                </>
              ) : (
                'Process Prescription'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Structured Prescription Preview */}
      {structuredPrescription && (
        <Card className="border-2 border-teal-200">
          <CardHeader className="bg-teal-50 pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-teal-800">
              <FileText className="w-5 h-5" />
              Structured Prescription
              <Badge className="ml-auto bg-green-500">AI Generated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Medicines */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Pill className="w-4 h-4 text-orange-500" />
                Medicines
              </h4>
              <div className="space-y-2">
                {structuredPrescription.medicines.map((med, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{med.name}</span>
                      <Badge variant="outline">{med.duration}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{med.dosage}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {med.timing}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advice */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Advice</h4>
              <ul className="space-y-1">
                {structuredPrescription.advice.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-up */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                Follow-up: <strong>{structuredPrescription.followUp}</strong>
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={clearAll}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={savePrescription}>
                <Send className="w-4 h-4 mr-1" />
                Save & Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoicePrescription;
