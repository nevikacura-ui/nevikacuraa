import React from 'react';
import { useMango } from './MangoContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getTestIcon } from '@/components/mango';
import { MangoHealthSections } from '@/components/mango';
import { testCategories } from '@/data/mangoData';
import {
  ArrowLeft, ArrowRight, Plus, X, FlaskConical, Upload, CheckCircle2,
  ShoppingCart, Search, Home, MapPin, FileText, Loader2, ChevronRight, Stethoscope
} from 'lucide-react';

const MangoTestSelection = () => {
  const m = useMango();

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-green-600 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Select Your Tests</h1>
        <p className="text-slate-500 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Choose from imaging, pathology tests, or upload prescription</p>
      </div>

      {/* Professional Features Carousel */}
      <div className="relative -mx-4 px-4 overflow-hidden">
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
          {/* Slide 1: Why Mango? */}
          <div className="min-w-[280px] md:min-w-[360px] flex-shrink-0 snap-center">
            <div className="relative h-40 md:h-44 rounded-2xl overflow-hidden shadow-xl bg-green-600">
              <div className="absolute inset-0 bg-green-600" />
              <div className="relative h-full flex">
                <div className="w-[55%] p-4 flex flex-col justify-center z-10">
                  <h3 className="text-white text-lg md:text-xl font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Why Mango?</h3>
                  <p className="text-white text-sm md:text-base font-semibold mb-2">Fast, Safe and Accurate</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></div>
                    <span className="text-white/90 text-sm">100% on time sample collection</span>
                  </div>
                  <p className="text-white/70 text-xs mt-2 leading-relaxed">Samples are sent straight to our labs at the right temperature for the most accurate results</p>
                </div>
                <div className="w-[45%] relative">
                  <img loading="lazy" src="/blood-vial-hand.png" alt="Blood Vial Test" className="absolute bottom-0 right-0 h-full w-full object-cover object-center" />
                </div>
              </div>
              <div className="absolute bottom-3 left-5 flex gap-1.5">
                <div className="w-6 h-1.5 rounded-full bg-[#F5A623]" /><div className="w-1.5 h-1.5 rounded-full bg-white/40" /><div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              </div>
            </div>
          </div>

          {/* Slide 2: NABL Certified */}
          <div className="min-w-[280px] md:min-w-[360px] flex-shrink-0 snap-center">
            <div className="relative h-40 md:h-44 rounded-2xl overflow-hidden shadow-xl bg-[#0c2340]">
              <div className="absolute inset-0 bg-[#0c2340]" />
              <div className="relative h-full flex">
                <div className="w-[55%] p-5 md:p-6 flex flex-col justify-center z-10">
                  <div className="bg-[#F5A623] text-[#0c2340] text-xs font-bold px-2 py-1 rounded w-fit mb-2">NABL CERTIFIED</div>
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>State-of-the-Art Labs</h3>
                  <p className="text-white/80 text-sm mb-3">Advanced equipment for precise & accurate diagnostics</p>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#0c2340]" /></div>
                    <span className="text-white/90 text-sm">99.9% accuracy rate</span>
                  </div>
                </div>
                <div className="w-[45%] relative">
                  <img loading="lazy" src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=500&fit=crop" alt="Modern Laboratory" className="absolute bottom-0 right-0 h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3: Easy Ordering */}
          <div className="min-w-[280px] md:min-w-[360px] flex-shrink-0 snap-center">
            <div className="relative h-40 md:h-44 rounded-2xl overflow-hidden shadow-xl bg-white border-2 border-[#0D6651]">
              <div className="relative h-full flex">
                <div className="w-1/2 p-4 md:p-5 flex flex-col justify-center">
                  <p className="text-[#6F7B77] text-xs mb-0.5">Easy ordering in</p>
                  <h3 className="text-[#0D6651] text-3xl md:text-4xl font-black leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>3</h3>
                  <h3 className="text-[#0D6651] text-2xl md:text-3xl font-black mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>STEPS</h3>
                  <div className="space-y-1.5">
                    {['Select tests', 'Add your details', 'Book your slot'].map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#0D6651] flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>
                        <span className="text-slate-700 text-xs font-medium">{s}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => m.setCurrentStep(1)} className="mt-3 bg-[#F5A623] hover:bg-[#e09515] text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors shadow-md w-fit">Order Now</button>
                </div>
                <div className="w-1/2 relative overflow-hidden">
                  <img loading="lazy" src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=500&fit=crop" alt="Booking Tests Online" className="absolute inset-0 h-full w-full object-cover object-center" />
                </div>
              </div>
            </div>
          </div>

          {/* Slide 4: Home Collection */}
          <div className="min-w-[280px] md:min-w-[360px] flex-shrink-0 snap-center">
            <div className="relative h-40 md:h-44 rounded-2xl overflow-hidden shadow-xl bg-[#F5A623]">
              <div className="absolute inset-0 bg-[#F5A623]" />
              <div className="relative h-full flex">
                <div className="w-[55%] p-5 md:p-6 flex flex-col justify-center z-10">
                  <div className="bg-white text-[#F5A623] text-xs font-bold px-2 py-1 rounded w-fit mb-2">FREE ABOVE ₹2000</div>
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-2 drop-shadow-md" style={{ fontFamily: 'Outfit, sans-serif' }}>Home Sample Collection</h3>
                  <p className="text-white/90 text-sm mb-3">Get tested from the comfort of your home</p>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center"><Home className="w-3 h-3 text-[#F5A623]" /></div>
                    <span className="text-white font-medium text-sm">Trained phlebotomists</span>
                  </div>
                </div>
                <div className="w-[45%] relative">
                  <img loading="lazy" src="/home-blood-collection.jpg" alt="Phlebotomist Collecting Blood" className="absolute bottom-0 right-0 h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Slide 5: Expert Doctors */}
          <div className="min-w-[280px] md:min-w-[360px] flex-shrink-0 snap-center">
            <div className="relative h-40 md:h-44 rounded-2xl overflow-hidden shadow-xl bg-[#4A1D6A]">
              <div className="absolute inset-0 bg-[#4A1D6A]" />
              <div className="relative h-full flex">
                <div className="w-[55%] p-5 md:p-6 flex flex-col justify-center z-10">
                  <div className="bg-[#F5A623] text-[#4A1D6A] text-xs font-bold px-2 py-1 rounded w-fit mb-2">FREE CONSULTATION</div>
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Expert Doctor Review</h3>
                  <p className="text-white/80 text-sm mb-3">Get your reports explained by specialists</p>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center"><Stethoscope className="w-3 h-3 text-[#4A1D6A]" /></div>
                    <span className="text-white/90 text-sm">24/7 doctor support</span>
                  </div>
                </div>
                <div className="w-[45%] relative">
                  <img loading="lazy" src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=500&fit=crop" alt="Doctor" className="absolute bottom-0 right-0 h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-2 mt-3">
          <div className="text-xs text-slate-400 flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Swipe for more <ArrowRight className="w-3 h-3" /></div>
        </div>
      </div>

      {/* Search Tests */}
      <Card className="p-4 rounded-2xl border-[#D2DAD7] shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input placeholder="Search tests... (e.g., CBC, Thyroid, HbA1c)" value={m.testSearchTerm}
            onChange={(e) => m.setTestSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-[#D2DAD7] focus:border-green-500 focus:ring-[#0c1e3c]/20" data-testid="test-search" />
          {m.testSearchTerm && (
            <button onClick={() => m.setTestSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-[#6F7B77]"><X className="w-4 h-4" /></button>
          )}
        </div>
        {m.testSearchTerm && m.filteredTests.length > 0 && (
          <div className="mt-3 max-h-64 overflow-y-auto border border-[#D2DAD7] rounded-xl">
            <div className="p-2 bg-[#F7F9F8] border-b border-[#D2DAD7] text-xs text-[#6F7B77] font-medium">Found {m.filteredTests.length} tests matching &quot;{m.testSearchTerm}&quot;</div>
            <div className="divide-y divide-slate-100">
              {m.filteredTests.map(test => (
                <label key={test} className="flex items-center gap-3 p-3 hover:bg-green-500/5 cursor-pointer transition-colors">
                  <Checkbox checked={m.selectedTests.includes(test)} onCheckedChange={() => m.toggleTest(test)} className="border-2 border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                  <span className="text-lg">{getTestIcon(test)}</span>
                  <span className="text-sm text-[#1E293B]">{test}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {m.testSearchTerm && m.filteredTests.length === 0 && (
          <div className="mt-3 p-5 text-center rounded-xl" style={{ background: '#F7F9F8' }}>
            <p className="text-sm font-medium text-gray-600">No tests found for "{m.testSearchTerm}"</p>
            <p className="text-xs text-gray-400 mt-1">Try a different name or add as a custom test below</p>
          </div>
        )}
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-white text-green-500 shadow-md" data-testid="tab-pathology">
          <FlaskConical className="w-4 h-4" /> Pathology
        </button>
      </div>

      <MangoHealthSections setSelectedTests={m.setSelectedTests} />

      {/* Pathology Categories */}
      {m.activeTab === 'pathology' && (
        <div className="space-y-8">
          {testCategories.map((category) => (
            <div key={category.id} className="space-y-3" data-testid={`category-section-${category.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${category.iconBg} flex items-center justify-center`}>
                    <category.icon className="w-5 h-5" style={{ color: category.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2B2B2B]">{category.title}</h3>
                    <p className="text-xs text-[#6F7B77]">{category.tests.length} tests available</p>
                  </div>
                </div>
                <button className="text-sm font-medium flex items-center gap-1" style={{ color: category.color }}>View All <ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {category.tests.map((test) => (
                  <div key={test.name} className="min-w-[300px] max-w-[300px] bg-white rounded-2xl shadow-lg border border-[#E6ECEA] overflow-hidden flex-shrink-0 hover:shadow-xl transition-all">
                    <div className="bg-gradient-to-br from-[#1F4F46] via-[#2E6B5F] to-[#3E8A7A] p-4 text-white relative">
                      <div className="absolute top-3 right-3"><span className="bg-emerald-800/60 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">Test</span></div>
                      <h4 className="font-bold text-base mb-2 pr-14 leading-tight">{test.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 line-through text-sm">₹{Math.round(test.price * 1.3)}</span>
                        <span className="text-2xl font-bold">₹{test.price}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><FileText className="w-4 h-4 text-gray-300" /></div>
                          <div><p className="text-[10px] text-gray-400">Reports within</p><p className="text-xs font-bold text-white">6-24 hours</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><FlaskConical className="w-4 h-4 text-gray-300" /></div>
                          <div><p className="text-[10px] text-gray-400">Tests included</p><p className="text-xs font-bold text-white">1 test</p></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold text-xs py-2.5"
                          onClick={() => m.fetchTestDetails(test.name, test)}>{m.loadingDetails ? 'Loading...' : 'View Details'}</Button>
                        <Button size="sm" className="flex-1 rounded-xl bg-[#1E493F] hover:bg-[#163832] text-white font-semibold text-xs py-2.5 shadow-md"
                          onClick={() => { m.toggleTest(test.name); toast.success(`${test.name} added!`); }}>
                          {m.selectedTests.includes(test.name) ? '✓ Added' : 'Add to Cart'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Test Entry */}
      <Card className="p-5 rounded-2xl border-[#D2DAD7]">
        <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-green-500" /> Add Custom Test</h3>
        <div className="flex gap-2">
          <Input placeholder="Enter test name not in the list" value={m.customTest} onChange={(e) => m.setCustomTest(e.target.value)}
            className="flex-1 rounded-xl border-[#D2DAD7] focus:border-green-500 focus:ring-green-500/20" data-testid="custom-test-input" />
          <Button onClick={m.addCustomTest} className="bg-green-500 hover:bg-[#4A90B8] rounded-xl" data-testid="add-custom-test"><Plus className="w-4 h-4" /></Button>
        </div>
      </Card>

      {/* Selected Tests */}
      {m.selectedTests.length > 0 && (
        <Card className="p-5 rounded-2xl border-green-500/30 bg-green-500/5">
          <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-green-500" /> Selected Tests ({m.selectedTests.length})</h3>
          <div className="flex flex-wrap gap-2">
            {m.selectedTests.map((test) => (
              <div key={test} className="flex items-center gap-1.5 bg-white text-[#1E293B] pl-3 pr-2 py-1.5 rounded-full text-sm border border-green-500/20">
                <span>{test}</span>
                <button onClick={() => m.removeTest(test)} className="hover:text-[#EF4444] transition-colors"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sample Collection Type */}
      <Card className="p-5 rounded-2xl border-[#D2DAD7]" data-testid="sample-collection-card">
        <h3 className="font-medium text-[#1E293B] mb-4 flex items-center gap-2"><Home className="w-4 h-4 text-green-600" /> Sample Collection</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => m.setCollectionType('home')} data-testid="home-collection-btn"
            className={`p-4 rounded-2xl border-2 text-left transition-all ${m.collectionType === 'home' ? 'border-green-500 bg-green-500/5' : 'border-[#D2DAD7] hover:border-green-500/50'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${m.collectionType === 'home' ? 'bg-green-500/20' : 'bg-slate-100'}`}>
              <Home className={`w-6 h-6 ${m.collectionType === 'home' ? 'text-green-500' : 'text-[#6F7B77]'}`} />
            </div>
            <h4 className="font-semibold text-[#1E293B]">Home Collection</h4>
            <p className="text-xs text-[#6F7B77] mt-1">Phlebotomist visits your home</p>
            <p className="text-xs text-[#10B981] font-medium mt-2">₹50/visit (FREE for orders above ₹2000)</p>
          </button>
          <button onClick={() => m.setCollectionType('center')} data-testid="center-collection-btn"
            className={`p-4 rounded-2xl border-2 text-left transition-all ${m.collectionType === 'center' ? 'border-green-500 bg-green-500/5' : 'border-[#D2DAD7] hover:border-green-500/50'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${m.collectionType === 'center' ? 'bg-green-500/20' : 'bg-slate-100'}`}>
              <MapPin className={`w-6 h-6 ${m.collectionType === 'center' ? 'text-green-500' : 'text-[#6F7B77]'}`} />
            </div>
            <h4 className="font-semibold text-[#1E293B]">Visit Center</h4>
            <p className="text-xs text-[#6F7B77] mt-1">Walk-in to our collection center</p>
            <p className="text-xs text-slate-400 mt-2">Naigaon East Collection Center</p>
          </button>
        </div>
        {m.collectionType === 'home' && (
          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-[#6F7B77] text-sm">Complete Address *</Label>
              <Textarea value={m.patientInfo.address} onChange={(e) => m.setPatientInfo({ ...m.patientInfo, address: e.target.value })}
                placeholder="Enter full address with landmark for home sample collection" rows={2}
                className="mt-1.5 rounded-xl border-[#D2DAD7] focus:border-green-500" data-testid="home-address" />
            </div>
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-xs text-green-600">
              <p className="font-medium">Home Collection Process:</p>
              <ul className="mt-1 space-y-0.5 text-green-600">
                <li>• Our phlebotomist will call 30 mins before arrival</li>
                <li>• Sample collected at your doorstep</li>
                <li>• Reports sent via email within 24 hours</li>
              </ul>
            </div>
          </div>
        )}
        {m.collectionType === 'center' && (
          <div className="mt-4 bg-[#F7F9F8] border border-[#D2DAD7] rounded-xl p-4">
            <h4 className="font-medium text-[#1E293B] mb-3">Collection Centers</h4>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-[#E6ECEA]">
                <p className="font-semibold text-sm text-[#1E293B]">Mango Health Labs - Naigaon</p>
                <p className="text-xs text-[#6F7B77] mt-1">Shop no 3, Sai Darshan, Near Don Bosco School, Naigaon East 401208</p>
                <p className="text-xs text-slate-400">Mon-Sat: 7:00 AM - 7:00 PM</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Prescription Upload */}
      <Card className="p-5 rounded-2xl border-[#D2DAD7]">
        <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-green-500" /> Upload Prescription (Optional)</h3>
        <label className="cursor-pointer block">
          <div className={`px-4 py-6 border-2 border-dashed rounded-xl transition-colors text-center ${m.prescriptionUrl ? 'border-[#10B981] bg-[#10B981]/5' : 'border-slate-300 hover:border-green-500'}`}>
            {m.uploading ? (
              <div className="flex items-center justify-center gap-2 text-[#6F7B77]"><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</div>
            ) : m.prescriptionUrl ? (
              <div className="flex items-center justify-center gap-2 text-[#10B981]"><CheckCircle2 className="w-5 h-5" /> {m.prescriptionFile?.name || 'Prescription uploaded'}</div>
            ) : (
              <div className="text-[#6F7B77]"><Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" /><p>Click to upload prescription image or PDF</p></div>
            )}
          </div>
          <input type="file" accept="image/*,.pdf" onChange={m.handleFileUpload} className="hidden" data-testid="prescription-upload" />
        </label>
      </Card>

      {/* Continue Button */}
      <Button onClick={m.goToStep2} disabled={m.selectedTests.length === 0 && !m.prescriptionUrl}
        className="w-full bg-gradient-to-r from-[#1F4F46] to-[#2E6B5F] hover:from-[#2E6B5F] hover:to-[#3E8A7A] text-white py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        data-testid="continue-to-otp">
        Continue <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};

export default MangoTestSelection;
