import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, Eye, Database, Bell, UserCheck, Mail, Phone } from 'lucide-react';

const PrivacyPolicy = () => {
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
              <h1 className="text-xl font-bold text-gray-800">Privacy Policy</h1>
              <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Introduction Card */}
        <Card className="mb-6 border-teal-200 bg-gradient-to-r from-teal-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-teal-800 mb-2">Your Privacy Matters to Us</h2>
                <p className="text-gray-600">
                  At Nevika Cura Healthcare Group, we are committed to protecting your personal information 
                  and your right to privacy. This Privacy Policy explains how we collect, use, disclose, 
                  and safeguard your information when you use our mobile application and services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Section 1 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800">1. Information We Collect</h2>
            </div>
            
            <div className="space-y-4 text-gray-600">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Personal Information</h3>
                <p className="mb-2">When you use Nevika Cura, we may collect:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Name, email address, and phone number</li>
                  <li>Date of birth and gender</li>
                  <li>Residential address for medicine delivery and home sample collection</li>
                  <li>Government ID (for certain medical services, as required by law)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Health Information</h3>
                <p className="mb-2">To provide our healthcare services, we collect:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Medical history and health conditions</li>
                  <li>Prescriptions and medication details</li>
                  <li>Diagnostic test results and reports</li>
                  <li>Blood sugar readings and health tracking data</li>
                  <li>Appointment history and consultation notes</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Technical Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Device information (model, operating system)</li>
                  <li>IP address and location data (with your permission)</li>
                  <li>App usage statistics and interaction data</li>
                  <li>Push notification tokens</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800">2. How We Use Your Information</h2>
            </div>
            
            <div className="space-y-3 text-gray-600">
              <p>We use the collected information for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Healthcare Services:</strong> Booking appointments, ordering medicines, scheduling diagnostic tests</li>
                <li><strong>Health Tracking:</strong> Providing personalized health insights through Evara and Omnia modules</li>
                <li><strong>Communication:</strong> Sending appointment reminders, order updates, and health tips via SMS/Email</li>
                <li><strong>Service Improvement:</strong> Analyzing usage patterns to enhance user experience</li>
                <li><strong>Legal Compliance:</strong> Meeting regulatory requirements for healthcare services</li>
                <li><strong>Emergency Services:</strong> Contacting you or emergency services if we detect critical health indicators</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800">3. Data Security</h2>
            </div>
            
            <div className="space-y-3 text-gray-600">
              <p>We implement robust security measures to protect your data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Encryption:</strong> All data is encrypted in transit (HTTPS/TLS) and at rest</li>
                <li><strong>Access Control:</strong> Strict role-based access for staff members</li>
                <li><strong>OTP Verification:</strong> Phone number verification for account security</li>
                <li><strong>Secure Servers:</strong> Data stored on secure, certified cloud infrastructure</li>
                <li><strong>Regular Audits:</strong> Periodic security assessments and vulnerability testing</li>
                <li><strong>Staff Training:</strong> All healthcare staff trained in data protection practices</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800">4. Information Sharing</h2>
            </div>
            
            <div className="space-y-3 text-gray-600">
              <p>We may share your information with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Healthcare Providers:</strong> Doctors, diagnostic labs, and pharmacies within our network to provide services</li>
                <li><strong>Service Partners:</strong> Delivery partners for medicine delivery (limited to delivery information only)</li>
                <li><strong>Payment Processors:</strong> For secure payment processing</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect rights and safety</li>
              </ul>
              <p className="mt-4 font-semibold text-gray-800">We DO NOT:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-red-600">
                <li>Sell your personal or health information to third parties</li>
                <li>Share your data for advertising purposes without consent</li>
                <li>Allow unauthorized access to your medical records</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800">5. Your Rights & Choices</h2>
            </div>
            
            <div className="space-y-3 text-gray-600">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data (subject to legal retention requirements)</li>
                <li><strong>Opt-out:</strong> Unsubscribe from promotional communications</li>
                <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Withdraw Consent:</strong> Withdraw previously given consent at any time</li>
              </ul>
              <p className="mt-4">To exercise these rights, contact us at <strong>help@nevikacura.com</strong></p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">6. Data Retention</h2>
            <div className="space-y-3 text-gray-600">
              <p>We retain your information for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Active Accounts:</strong> As long as your account is active</li>
                <li><strong>Medical Records:</strong> Minimum 7 years as per Indian healthcare regulations</li>
                <li><strong>Transaction Records:</strong> 7 years for financial compliance</li>
                <li><strong>After Deletion:</strong> Data may be retained in backups for up to 90 days</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">7. Children's Privacy</h2>
            <div className="text-gray-600">
              <p>
                Our services are not intended for children under 18 years of age without parental consent. 
                For minor patients, a parent or legal guardian must create and manage the account. 
                We do not knowingly collect information from children under 13 without verified parental consent.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">8. Third-Party Services</h2>
            <div className="space-y-3 text-gray-600">
              <p>Our app integrates with third-party services:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>SMS Services (Twilio):</strong> For OTP verification and notifications</li>
                <li><strong>Payment Gateways:</strong> For secure payment processing</li>
                <li><strong>Analytics:</strong> To improve app performance</li>
              </ul>
              <p className="mt-2">These services have their own privacy policies, and we encourage you to review them.</p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">9. Updates to This Policy</h2>
            <div className="text-gray-600">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                <li>Posting the new Privacy Policy in the app</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending a notification for significant changes</li>
              </ul>
              <p className="mt-3">
                Your continued use of the app after changes constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
            <h2 className="text-xl font-bold mb-4">10. Contact Us</h2>
            <p className="mb-4">If you have questions about this Privacy Policy or our data practices, contact us:</p>
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
                <p className="text-sm text-teal-100">
                  Data Protection Officer<br />
                  [Address Line 1]<br />
                  [City, State, PIN Code]<br />
                  India
                </p>
              </div>
            </div>
          </section>

          {/* Effective Date */}
          <div className="text-center text-gray-500 text-sm py-4">
            <p>This Privacy Policy is effective as of {effectiveDate}</p>
            <p className="mt-2">© 2026 Nevika Cura Healthcare Group. All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
