import React, { useState, useEffect } from "react";
import { Petugas, ToastMessage } from "../types";
import { User, Lock, IdCard, UserPlus, LogIn, CheckCircle2, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (petugas: Petugas) => void;
  petugasList: Petugas[];
  onRegister: (newPetugas: Omit<Petugas, "id">) => Promise<boolean>;
  addToast: (type: ToastMessage["type"], title: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  petugasList,
  onRegister,
  addToast,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);

  // Login form state
  const [loginNip, setLoginNip] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginCaptchaAns, setLoginCaptchaAns] = useState("");

  // Register form state
  const [regNip, setRegNip] = useState("");
  const [regNama, setRegNama] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regCaptchaAns, setRegCaptchaAns] = useState("");

  // Captcha state
  const [num1, setNum1] = useState(3);
  const [num2, setNum2] = useState(4);

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 9) + 1;
    setNum1(n1);
    setNum2(n2);
    setLoginCaptchaAns("");
    setRegCaptchaAns("");
  };

  useEffect(() => {
    generateCaptcha();
  }, [isRegistering]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = num1 + num2;
    if (parseInt(loginCaptchaAns, 10) !== expected) {
      addToast("error", "Jawaban Captcha salah! Silakan coba lagi.");
      generateCaptcha();
      return;
    }

    const inputNip = loginNip.trim().toLowerCase();
    const inputPass = loginPassword.trim();

    // Direct check for default administrator credentials
    if ((inputNip === "admin" || inputNip === "1990010112345678") && inputPass === "@Mautauaja1") {
      const adminUser: Petugas = petugasList.find(
        (p) => p.level === "ADMIN" || p.nip.toLowerCase() === "admin"
      ) || {
        id: "petugas_admin",
        nip: "admin",
        nama: "Administrator",
        password: "@Mautauaja1",
        level: "ADMIN",
        status: "AKTIF",
        foto: "",
        scan_ttd: "",
        createdAt: new Date().toISOString(),
      };

      addToast("success", `Selamat datang, ${adminUser.nama}`);
      onLoginSuccess(adminUser);
      return;
    }

    const found = petugasList.find(
      (p) =>
        (p.nip.trim().toLowerCase() === inputNip || (inputNip === "admin" && p.level === "ADMIN")) &&
        (p.password === loginPassword || !p.password)
    );

    if (found) {
      if (found.status === "TIDAK") {
        addToast("error", "Akun Anda belum diaktifkan oleh Admin!");
        generateCaptcha();
        return;
      }
      addToast("success", `Selamat datang, ${found.nama}`);
      onLoginSuccess(found);
    } else {
      addToast("error", "NIP (Username) atau Password salah!");
      generateCaptcha();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = num1 + num2;
    if (parseInt(regCaptchaAns, 10) !== expected) {
      addToast("error", "Jawaban Captcha salah!");
      generateCaptcha();
      return;
    }

    if (!regNip.trim() || !regNama.trim() || !regPassword.trim()) {
      addToast("warning", "Semua kolom registrasi wajib diisi!");
      return;
    }

    const exists = petugasList.some((p) => p.nip.trim() === regNip.trim());
    if (exists) {
      addToast("error", "NIP sudah terdaftar dalam sistem!");
      generateCaptcha();
      return;
    }

    const ok = await onRegister({
      nip: regNip.trim(),
      nama: regNama.trim(),
      password: regPassword.trim(),
      level: "USER",
      status: "AKTIF", // Auto active for online demo convenience
      foto: "",
      scan_ttd: "",
      createdAt: new Date().toISOString(),
    });

    if (ok) {
      addToast("success", "Registrasi berhasil! Silakan login sekarang.");
      setIsRegistering(false);
      setLoginNip(regNip);
      setLoginPassword(regPassword);
    }
  };

  // Demo Login Helper
  const handleQuickLogin = (role: "ADMIN" | "USER") => {
    const target = petugasList.find((p) => p.level === role) || petugasList[0];
    if (target) {
      addToast("success", `Login cepat sebagai ${target.nama} (${target.level})`);
      onLoginSuccess(target);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-4">
      {/* Background Animated Floating Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* App Title Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-300 mb-3 shadow-xl backdrop-blur-md">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Laporan <span className="text-blue-400">SKP</span>
          </h1>
          <p className="text-slate-300 text-sm mt-1 font-medium">
            Sistem Laporan Kinerja ASN & SKP Online v2.6 (Develop By Genesystool)
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 md:p-8">
          {isRegistering ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Daftar Akun Petugas Baru</h2>
                <p className="text-xs text-slate-500">Lengkapi NIP dan Nama Anda untuk mendaftar</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  NIP (Sebagai Username)
                </label>
                <div className="relative">
                  <IdCard className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regNip}
                    onChange={(e) => setRegNip(e.target.value)}
                    placeholder="Contoh: 1995050512345678"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nama Lengkap & Gelar
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regNama}
                    onChange={(e) => setRegNama(e.target.value)}
                    placeholder="Contoh: Siti Nurhaliza, S.STP"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none transition-colors"
                    title={showRegPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div className="pt-1 text-center">
                <div className="bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 mb-2 font-bold text-slate-700 text-lg">
                  {num1} + {num2} = ?
                </div>
                <input
                  type="number"
                  required
                  value={regCaptchaAns}
                  onChange={(e) => setRegCaptchaAns(e.target.value)}
                  placeholder="Masukkan Jawaban Penjumlahan"
                  className="w-full text-center py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <UserPlus className="w-4 h-4" /> Daftar Sekarang
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Sudah punya akun? Login di sini
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Silakan Login</h2>
                <p className="text-xs text-slate-500">Masukkan NIP dan Password untuk masuk</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  NIP (Username)
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginNip}
                    onChange={(e) => setLoginNip(e.target.value)}
                    placeholder="Masukkan NIP Anda"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none transition-colors"
                    title={showLoginPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div className="pt-1 text-center">
                <div className="bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 mb-2 font-bold text-slate-700 text-lg tracking-wider">
                  {num1} + {num2} = ?
                </div>
                <input
                  type="number"
                  required
                  value={loginCaptchaAns}
                  onChange={(e) => setLoginCaptchaAns(e.target.value)}
                  placeholder="Jawaban Penjumlahan"
                  className="w-full text-center py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <LogIn className="w-4 h-4" /> Log In
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-xs text-emerald-600 hover:underline font-medium"
                >
                  Belum punya akun? Daftar Akun Baru
                </button>
              </div>

              {/* Quick Demo Switcher removed as requested */}
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; 2026 Laporan SKP - Develop By Genesystool
        </p>
      </div>
    </div>
  );
};
