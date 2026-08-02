import React, { useState, useEffect } from "react";
import { Petugas } from "../types";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  HelpCircle,
  LayoutDashboard,
  ClipboardList,
  FileSearch,
  HardDrive,
  UserCheck,
  FileText,
  BookOpen,
} from "lucide-react";

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Petugas;
  onNavigate?: (module: string) => void;
}

interface StepItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge: string;
  module?: string;
  content: string;
  tips: string[];
  actionLabel?: string;
  actionModule?: string;
  gradient: string;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigate,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps: StepItem[] = [
    {
      title: "Selamat Datang di Laporan SKP Online v2.6",
      subtitle: "Aplikasi Pelaporan Kinerja Harian & Dokumen SKP Terintegrasi",
      icon: <Sparkles className="w-8 h-8 text-amber-400" />,
      badge: "Pengenalan",
      gradient: "from-slate-900 via-indigo-950 to-slate-900",
      content:
        "Halo " +
        (currentUser.nama || "Petugas") +
        "! Tur interaktif ini akan membimbing Anda memahami alur utama penggunaan aplikasi. PENTING: Ikuti urutan langkah wajib untuk pengisian laporan yang lancar.",
      tips: [
        "Urutan wajib: Fill Template Laporan -> Fill Kegiatan Harian -> Set TTD di Profil.",
        "Setiap petugas memiliki ruang penyimpanan Google Drive pribadi yang terpisah.",
      ],
    },
    {
      title: "1. WAJIB PERTAMA: Mengisi Template Laporan",
      subtitle: "Buat Template RHK & Format Laporan Sebelum Mengisi Kegiatan",
      icon: <FileText className="w-8 h-8 text-amber-400" />,
      badge: "Langkah 1 dari 6 (Syarat Utama)",
      module: "laporan",
      gradient: "from-amber-950 via-slate-900 to-slate-900",
      content:
        "SYARAT UTAMA: Anda HARUS menginput / mengisi 'Template Laporan' terlebih dahulu! Template Laporan ini menyimpan daftar Rencana Hasil Kerja (RHK) & struktur laporan SKP yang akan dipilih ketika Anda mengisi Kegiatan Harian.",
      tips: [
        "Buka menu 'Template Laporan' di sidebar di bawah grup Master Data.",
        "Tanpa Template Laporan, pilihan RHK pada Kegiatan Harian akan kosong.",
      ],
      actionLabel: "Buka Template Laporan",
      actionModule: "laporan",
    },
    {
      title: "2. Mengisi Kegiatan Harian",
      subtitle: "Diisi Setelah Template Laporan Tersedia",
      icon: <ClipboardList className="w-8 h-8 text-emerald-400" />,
      badge: "Langkah 2 dari 6",
      module: "kegiatan_harian",
      gradient: "from-emerald-950 via-slate-900 to-slate-900",
      content:
        "Setelah Template Laporan terisi, baru Anda bisa mengisi Kegiatan Harian. Pilih RHK dari template yang telah dibuat, masukkan deskripsi pekerjaan, lokasi, jam kerja, serta unggah foto dokumentasi kegiatan.",
      tips: [
        "Unggah foto dokumentasi untuk memperkuat bukti fisik laporan.",
        "Data kegiatan harian akan dikelompokkan otomatis saat dicetak.",
      ],
      actionLabel: "Buka Kegiatan Harian",
      actionModule: "kegiatan_harian",
    },
    {
      title: "3. Edit Tanda Tangan & Profil Akun",
      subtitle: "Upload Scan TTD Digital & Link Drive Pribadi Anda",
      icon: <UserCheck className="w-8 h-8 text-blue-400" />,
      badge: "Langkah 3 dari 6",
      module: "profil",
      gradient: "from-blue-950 via-slate-900 to-slate-900",
      content:
        "Tanda tangan (Scan TTD Digital) Anda dapat diunggah dan diedit kapan saja melalui menu Profil. Di menu ini Anda juga wajib memasukkan Link Folder Google Drive pribadi agar file laporan tersimpan privat di akun Anda.",
      tips: [
        "Upload foto Scan TTD dengan background bersih/transparan.",
        "Masukkan Link Folder Google Drive milik Anda untuk isolasi file privat.",
      ],
      actionLabel: "Edit TTD & Profil",
      actionModule: "profil",
    },
    {
      title: "4. Cek File Google Drive & Webhook",
      subtitle: "Jelajahi & Kelola File Laporan di Google Drive",
      icon: <FileSearch className="w-8 h-8 text-purple-400" />,
      badge: "Langkah 4 dari 6",
      module: "cek_drive_files",
      gradient: "from-purple-950 via-slate-900 to-slate-900",
      content:
        "Menu ini memungkinkan Anda melihat seluruh struktur folder dan file PDF hasil cetak laporan SKP yang telah diunggah ke Google Drive secara otomatis.",
      tips: [
        "Akses cepat ke folder penyimpanan pribadi petugas.",
        "Gunakan Webhook Google Apps Script agar upload 100% lancar.",
      ],
      actionLabel: "Cek File Drive",
      actionModule: "cek_drive_files",
    },
    {
      title: "5. Cetak Laporan SKP Resmi",
      subtitle: "Generasi Dokumen Resmi PDF & Upload Otomatis",
      icon: <HardDrive className="w-8 h-8 text-indigo-400" />,
      badge: "Langkah 5 dari 6",
      module: "kegiatan_harian",
      gradient: "from-indigo-950 via-slate-900 to-slate-900",
      content:
        "Cetak kegiatan harian atau gabungan bulanan menjadi format laporan SKP resmi lengkap dengan Kop Surat, Tanda Tangan Digital dari Profil, serta Foto Kegiatan. Klik 'Unggah ke Drive' untuk simpan di Cloud.",
      tips: [
        "Tanda tangan dari profil Anda akan dipasang secara otomatis pada cetakan.",
        "File PDF langsung dikirim ke folder Drive pribadi Anda.",
      ],
      actionLabel: "Coba Fitur Cetak",
      actionModule: "kegiatan_harian",
    },
    {
      title: "6. Siap Digunakan! Pusat Tutorial Interaktif",
      subtitle: "Akses Panduan Lengkap dan FAQ Kapan Saja",
      icon: <BookOpen className="w-8 h-8 text-emerald-400" />,
      badge: "Langkah 6 dari 6",
      module: "tutorial",
      gradient: "from-slate-900 via-emerald-950 to-slate-900",
      content:
        "Selamat! Anda telah memahami alur wajib penggunaan aplikasi. Jika butuh panduan mendalam atau bantuan koneksi Webhook Apps Script, buka menu 'Tutorial Interaktif' di sidebar.",
      tips: [
        "Buka menu 'Tutorial Interaktif' untuk membaca FAQ dan panduan langkah demi langkah.",
        "Tekan tombol 'Mulai Tur Interaktif' di menu Tutorial kapan pun Anda ingin mengulang tur.",
      ],
      actionLabel: "Buka Tutorial Interaktif",
      actionModule: "tutorial",
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain || currentStep === steps.length - 1) {
      try {
        localStorage.setItem(`skp_tutorial_completed_${currentUser.id}`, "true");
      } catch {
        // Ignore
      }
    }
    onClose();
  };

  const handleAction = () => {
    if (step.actionModule && onNavigate) {
      onNavigate(step.actionModule);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className={`p-6 bg-gradient-to-r ${step.gradient} border-b border-slate-800 flex items-start justify-between relative`}>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 shadow-inner shrink-0">
              {step.icon}
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30 uppercase tracking-wider mb-1">
                {step.badge}
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
                {step.title}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">{step.subtitle}</p>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="Tutup Tur"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 flex-1">
          <p className="text-sm text-slate-200 leading-relaxed font-normal">
            {step.content}
          </p>

          {/* Tips Box */}
          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <HelpCircle className="w-4 h-4" />
              <span>Tips &amp; Catatan Penting:</span>
            </div>
            <ul className="space-y-1.5 pl-1">
              {step.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Navigation Action inside step */}
          {step.actionModule && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleAction}
                className="px-3.5 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-indigo-100 text-xs font-semibold rounded-lg border border-indigo-500/40 transition-colors flex items-center gap-1.5"
              >
                <span>{step.actionLabel || "Buka Halaman"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls & Progress */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Progress dots & Don't show again checkbox */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStep
                      ? "w-6 bg-amber-500"
                      : "w-2 bg-slate-700 hover:bg-slate-600"
                  }`}
                  title={`Langkah ${idx + 1}`}
                />
              ))}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <span>Jangan tampilkan lagi saat login</span>
            </label>
          </div>

          {/* Previous / Next Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>{currentStep === steps.length - 1 ? "Selesai Tur" : "Lanjut"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
