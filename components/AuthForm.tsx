import React, { useState } from 'react';

interface AuthFormProps {
  onLogin: (userData: { email: string; name: string }) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const displayName = isLogin ? (username || email.split('@')[0]) : `${firstName} ${lastName}`;
      onLogin({ email, name: displayName || 'Farmer' });
      setIsLoading(false);
    }, 1200);
  };

  const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-sm";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-emerald-900 p-8 text-white text-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <i className="fas fa-seedling text-9xl -rotate-12 absolute -left-4 -top-4"></i>
            <i className="fas fa-tractor text-8xl rotate-12 absolute -right-4 -bottom-4"></i>
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-900 text-3xl font-black mx-auto mb-4 shadow-lg">
              NS
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Niti-Setu</h2>
            <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mt-1">
              {isLogin ? 'Farmer Portal Login' : 'New Farmer Registration'}
            </p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isLogin ? (
              /* Login Fields: Vertical layout - Password below Email */
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClass}>Email Address</label>
                  <div className="relative">
                    <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="farmer@example.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Signup Fields: First Name, Last Name, Mobile, Email, Aadhar, Password */
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>First Name</label>
                    <div className="relative">
                      <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Rajesh"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Last Name</label>
                    <div className="relative">
                      <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Kumar"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Mobile Number</label>
                  <div className="relative">
                    <i className="fas fa-mobile-alt absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Email Address</label>
                  <div className="relative">
                    <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rajesh@example.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Aadhar Number</label>
                  <div className="relative">
                    <i className="fas fa-id-card absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="text"
                      required
                      value={aadhar}
                      onChange={(e) => setAadhar(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Create Password</label>
                  <div className="relative">
                    <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2 mt-6 active:scale-95"
            >
              {isLoading ? (
                <i className="fas fa-circle-notch fa-spin text-xl"></i>
              ) : (
                <>
                  {isLogin ? 'Enter Portal' : 'Register Now'}
                  <i className="fas fa-chevron-right ml-1"></i>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="group text-sm font-bold text-slate-500 hover:text-emerald-600 transition flex items-center justify-center mx-auto gap-2"
            >
              {isLogin ? (
                <>
                  New to Niti-Setu? <span className="text-emerald-600 group-hover:underline">Create Account</span>
                </>
              ) : (
                <>
                  Already registered? <span className="text-emerald-600 group-hover:underline">Login here</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <div className="flex items-center justify-center gap-4 text-[9px] text-slate-400 font-black uppercase tracking-tighter">
            <span className="flex items-center gap-1"><i className="fas fa-shield-alt text-emerald-500"></i> Secure Data</span>
            <span className="flex items-center gap-1"><i className="fas fa-check-circle text-emerald-500"></i> Verified Guidelines</span>
            <span className="flex items-center gap-1"><i className="fas fa-cloud text-emerald-500"></i> Cloud Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;