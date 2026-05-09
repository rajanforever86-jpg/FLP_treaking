import React from 'react';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import './../App.css';

const About: React.FC = () => {
  return (
    <div className="min-h-screen pb-32 lg:pb-12 px-6 pt-8 max-w-7xl mx-auto animate-fade-up">
      <div className="relative overflow-hidden bg-[#141414] border border-white/[0.05] rounded-[32px] p-12 text-center mb-8 group">
         {/* Background accent */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] group-hover:bg-blue-600/20 transition-all duration-700"></div>
        
        <div className="w-24 h-24 bg-gradient-to-br from-blue-700 to-blue-500 rounded-[28px] flex items-center justify-center font-syne font-black text-[48px] text-white shadow-[0_0_50px_rgba(37,99,235,0.3)] mx-auto mb-8 transition-transform hover:scale-110">
          T
        </div>
        
        <h1 className="font-syne font-black text-[42px] text-white mb-2">TRAKZY AI</h1>
        <p className="font-mono text-[12px] text-blue-500 font-bold uppercase tracking-[4px] mb-8">Tracking to Target</p>
        
        <div className="max-w-2xl mx-auto font-dm text-[17px] text-gray-400 leading-relaxed">
          TRAKZY AI is a hyper-performance sales ecosystem built for high-growth teams. 
          We eliminate tracking debt and "Follow-up Gaps" by providing a 3-generation 
          team hierarchy and real-time conversion intelligence.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#141414] border border-white/[0.05] rounded-[24px] p-10 hover:border-blue-600/20 transition-all group">
          <h3 className="font-syne font-bold text-[22px] text-white mb-4 flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            Our Core Vision
          </h3>
          <p className="font-dm text-[15px] text-gray-500 leading-relaxed group-hover:text-gray-300 transition-colors">
            To redefine the standard of sales execution. We believe every lead is a target 
            waiting for the right sequence. TRAKZY AI provides the architectural rigor 
            to ensure no opportunity is left stranded.
          </p>
        </div>

        <div className="bg-[#141414] border border-white/[0.05] rounded-[24px] p-10">
          <h3 className="font-syne font-bold text-[22px] text-white mb-6">Founding Fleet</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center font-syne font-bold text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                TK
              </div>
              <div>
                <p className="font-syne font-bold text-white text-[17px]">Trushal Kapuriya</p>
                <p className="font-dm text-[11px] text-gray-600 uppercase tracking-widest font-bold">Co-Founder & Product Lead</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center font-syne font-bold text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                RC
              </div>
              <div>
                <p className="font-syne font-bold text-white text-[17px]">Rajan Chovatiya</p>
                <p className="font-dm text-[11px] text-gray-600 uppercase tracking-widest font-bold">Co-Founder & CTO</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-12 border-t border-white/[0.03] text-center">
        <p className="font-mono text-[10px] text-gray-700 uppercase tracking-[5px]">
          © 2024 TRAKZY AI Ecosystem • Verified Production Build
        </p>
      </div>
    </div>
  );
};

export default About;
