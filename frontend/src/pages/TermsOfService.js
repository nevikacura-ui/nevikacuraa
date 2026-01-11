import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle, Scale, Clock, Mail, Phone } from 'lucide-react';

const TermsOfService = () => {
  const navigate = useNavigate();
  const lastUpdated = "January 11, 2026";
  const effectiveDate = "January 11, 2026";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Terms of Service</h1>
              <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Introduction Card */}
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-800 mb-2">Terms & Conditions</h2>
                <p className="text-gray-600">
                  Welcome to Nevika Cura. By downloading, accessing, or using our mobile application and services, 
                  you agree to be bound by these Terms of Service. Please read them carefully before using our services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Section 1 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Acceptance of Terms</h2>
            <div className="space-y-3 text-gray-600">
              <p>
                By accessing or using Nevika Cura ("the App"), you agree to these Terms of Service and our Privacy Policy. 
                If you do not agree to these terms, please do not use our services.
              </p>
              <p>
                These terms apply to all users of the App, including patients, visitors, and anyone who accesses or uses our services.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">2. Description of Services</h2>
            <div className="space-y-3 text-gray-600">
              <p>Nevika Cura provides a healthcare platform that includes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>DiaGyn Healthcare:</strong> Doctor appointment booking and teleconsultation services</li>
                <li><strong>Proton Diagnostics:</strong> Diagnostic test booking with home sample collection</li>
                <li><strong>Orange Pharmacy:</strong> Online medicine ordering and delivery</li>
                <li><strong>Evara:</strong> Women's wellness and pregnancy care program</li>
                <li><strong>Glydex:</strong> Diabetes management and tracking tools</li>
              </ul>
              <p className="mt-4 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <strong>Note:</strong> Our services are informational and supportive in nature. 
                They do not replace professional medical advice, diagnosis, or treatment from qualified healthcare providers.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">3. User Account</h2>
            <div className="space-y-3 text-gray-600">
              <p>To use our services, you must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Be at least 18 years old, or have parental/guardian consent</li>
                <li>Register with a valid phone number verified via OTP</li>
                <li>Provide accurate and complete information</li>
                <li>Keep your account credentials secure</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
              <p className="mt-3">
                You are responsible for all activities under your account. We reserve the right to suspend or terminate 
                accounts that violate these terms.
              </p>
            </div>
          </section>

          {/* Section 4 - Medical Disclaimer */}
          <section className="bg-white rounded-xl p-6 shadow-sm border-2 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold text-red-700">4. Medical Disclaimer</h2>
            </div>
            <div className="space-y-3 text-gray-600">
              <p className="font-semibold text-red-600">IMPORTANT - PLEASE READ CAREFULLY:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The App does NOT provide medical advice, diagnosis, or treatment</li>
                <li>Content is for informational purposes only and is not a substitute for professional medical advice</li>
                <li>Always consult qualified healthcare providers for medical concerns</li>
                <li>Never disregard professional medical advice or delay seeking it because of information in this App</li>
                <li>In case of medical emergency, call emergency services (112) immediately</li>
              </ul>
              <p className="mt-4 p-3 bg-red-50 rounded-lg">
                <strong>AI Features:</strong> Our AI-powered chat assistants (in Evara and Glydex) provide general health 
                information only. They are not licensed medical professionals and cannot diagnose conditions or prescribe treatments.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-bold text-gray-800">5. User Responsibilities</h2>
            </div>
            <div className="space-y-3 text-gray-600">
              <p>As a user, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate health information for proper care</li>
                <li>Use the App only for lawful purposes</li>
                <li>Not share your account with others</li>
                <li>Follow medication and treatment instructions from doctors</li>
                <li>Make payments for services availed in a timely manner</li>
                <li>Treat healthcare providers and staff with respect</li>
                <li>Attend scheduled appointments or cancel with reasonable notice</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold text-gray-800">6. Prohibited Activities</h2>
            </div>
            <div className="space-y-3 text-gray-600">
              <p>You must NOT:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide false or misleading information</li>
                <li>Use the App to obtain controlled substances illegally</li>
                <li>Impersonate another person or entity</li>
                <li>Attempt to hack, disrupt, or compromise App security</li>
                <li>Use automated systems to access the App without permission</li>
                <li>Share prescriptions or medical advice with others</li>
                <li>Post or transmit harmful, offensive, or illegal content</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">7. Appointments & Cancellations</h2>
            <div className="space-y-3 text-gray-600">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Appointments are subject to doctor availability</li>
                <li>Cancellations should be made at least 2 hours before the scheduled time</li>
                <li>Repeated no-shows may result in booking restrictions</li>
                <li>We reserve the right to reschedule appointments due to emergencies</li>
                <li>Refunds for cancelled appointments are processed as per our refund policy</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">8. Pharmacy & Medicine Orders</h2>
            <div className="space-y-3 text-gray-600">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Prescription medicines require a valid prescription from a registered medical practitioner</li>
                <li>We verify prescriptions before dispensing medicines</li>
                <li>Medicine availability is subject to stock</li>
                <li>Delivery times are estimates and may vary based on location</li>
                <li>Returns are accepted only for damaged or incorrect items</li>
                <li>We are not responsible for misuse of medicines</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">9. Diagnostic Tests</h2>
            <div className="space-y-3 text-gray-600">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Test results are for informational purposes and should be reviewed by a doctor</li>
                <li>Home sample collection is available in select areas</li>
                <li>Some tests require specific preparation (fasting, etc.) - please follow instructions</li>
                <li>Report delivery times are estimates based on test type</li>
                <li>We partner with NABL-accredited laboratories for quality assurance</li>
              </ul>
            </div>
          </section>

          {/* Section 10 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">10. Payment Terms</h2>
            <div className="space-y-3 text-gray-600">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Prices displayed are in Indian Rupees (INR)</li>
                <li>Payment options include UPI, cards, net banking, and Cash on Delivery (where available)</li>
                <li>All transactions are secured with industry-standard encryption</li>
                <li>GST and other applicable taxes are included/displayed separately as applicable</li>
                <li>Promotional offers are subject to terms and conditions</li>
              </ul>
            </div>
          </section>

          {/* Section 11 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-800">11. Refund Policy</h2>
            </div>
            <div className="space-y-3 text-gray-600">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Consultations:</strong> Refunds for cancelled appointments as per cancellation policy</li>
                <li><strong>Medicines:</strong> No refunds except for damaged/wrong items (report within 24 hours)</li>
                <li><strong>Diagnostic Tests:</strong> Full refund if cancelled before sample collection</li>
                <li>Refunds are processed within 5-7 business days to the original payment method</li>
              </ul>
            </div>
          </section>

          {/* Section 12 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-bold text-gray-800">12. Limitation of Liability</h2>
            </div>
            <div className="space-y-3 text-gray-600">
              <p>To the fullest extent permitted by law:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We are not liable for any indirect, incidental, or consequential damages</li>
                <li>Our liability is limited to the amount paid for the specific service</li>
                <li>We are not responsible for actions of independent healthcare providers</li>
                <li>We do not guarantee uninterrupted or error-free service</li>
                <li>Healthcare decisions remain the responsibility of you and your healthcare provider</li>
              </ul>
            </div>
          </section>

          {/* Section 13 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">13. Intellectual Property</h2>
            <div className="text-gray-600">
              <p>
                All content, trademarks, logos, and intellectual property in the App are owned by Nevika Cura Healthcare Group 
                or its licensors. You may not copy, modify, distribute, or use any content without our written permission.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">14. Termination</h2>
            <div className="space-y-3 text-gray-600">
              <p>We may terminate or suspend your account if you:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violate these Terms of Service</li>
                <li>Engage in fraudulent or illegal activities</li>
                <li>Abuse our services or staff</li>
                <li>Fail to make payments for services</li>
              </ul>
              <p className="mt-3">
                You may delete your account at any time through the App settings or by contacting support.
              </p>
            </div>
          </section>

          {/* Section 15 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">15. Governing Law & Disputes</h2>
            <div className="text-gray-600">
              <p>
                These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction 
                of the courts in [City], India. We encourage users to contact us first to resolve any issues amicably.
              </p>
            </div>
          </section>

          {/* Section 16 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">16. Changes to Terms</h2>
            <div className="text-gray-600">
              <p>
                We reserve the right to modify these Terms at any time. Changes will be effective upon posting in the App. 
                Continued use of the App after changes constitutes acceptance of the modified Terms.
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <h2 className="text-xl font-bold mb-4">17. Contact Us</h2>
            <p className="mb-4">For questions about these Terms of Service:</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <span>help@nevikacura.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <span>+91 98765 43210</span>
              </div>
              <div className="mt-4 p-4 bg-white/10 rounded-lg">
                <p className="font-semibold">Nevika Cura Healthcare Group</p>
                <p className="text-sm text-blue-100">
                  [Address Line 1]<br />
                  [City, State, PIN Code]<br />
                  India
                </p>
              </div>
            </div>
          </section>

          {/* Effective Date */}
          <div className="text-center text-gray-500 text-sm py-4">
            <p>These Terms of Service are effective as of {effectiveDate}</p>
            <p className="mt-2">© 2026 Nevika Cura Healthcare Group. All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
