import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  verifyPasswordResetCode, 
  confirmPasswordReset,
  applyActionCode
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  ArrowRight
} from "lucide-react";
import { motion } from "motion/react";

export default function AuthActionHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const mode = searchParams.get('mode'); // resetPassword, verifyEmail, recoverEmail
  const oobCode = searchParams.get('oobCode');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!oobCode || !mode) {
      setError("Invalid or expired link. Please request a new one.");
      setLoading(false);
      return;
    }

    if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setEmail(email);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError("This reset link has already been used or has expired.");
          setLoading(false);
        });
    } else if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setSuccess("Email verified successfully!");
          setLoading(false);
          setTimeout(() => navigate('/'), 3000);
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to verify email. The link may be invalid or expired.");
          setLoading(false);
        });
    } else {
      setError("Unsupported action mode.");
      setLoading(false);
    }
  }, [oobCode, mode, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setSuccess("Password has been reset successfully!");
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Verifying Link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-emerald-600/5" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-emerald-900/5" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              <img src="/icons/CICS.png" className="w-full h-full object-cover scale-[1.0]" alt="CICS Logo" />
            </div>
            <h1 className="text-2xl font-black text-white leading-tight tracking-tighter uppercase italic">
              CICS <span className="not-italic text-emerald-500">DocHub</span>
            </h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center gap-3">
              <AlertCircle className="shrink-0" size={18} />
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-emerald-500 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
              <p className="text-zinc-400 text-sm mb-8">{success}</p>
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-white text-zinc-950 py-4 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
              >
                Go to Login
                <ArrowRight size={18} />
              </button>
            </div>
          ) : mode === 'resetPassword' ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight italic">Reset Your Password</h2>
                <div className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <p className="text-emerald-500 text-xs font-bold tracking-wide">{email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setConfirmPassword(e.target.value); // Sync for internal validation
                      }}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-12 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
              </button>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-400">Invalid action.</p>
              <button onClick={() => navigate('/')} className="mt-4 text-emerald-500 font-bold">Back to Home</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
