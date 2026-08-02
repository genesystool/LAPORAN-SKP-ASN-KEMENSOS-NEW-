import React, { useState, useEffect } from "react";
import { Petugas, AppSettings } from "../types";
import {
  BookOpen,
  Sparkles,
  Play,
  CheckCircle2,
  HelpCircle,
  FileSearch,
  ClipboardList,
  UserCheck,
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink,
  Copy,
  Check,
  HardDrive,
  ShieldAlert,
  ListTodo,
  Layers,
  ArrowRight,
  Database,
  AlertCircle,
} from "lucide-react";
import { AppsScriptGuideModal, APPS_SCRIPT_CODE } from "./AppsScriptGuideModal";

interface InteractiveTutorialViewProps {
  currentUser: Petugas;
  appSettings: AppSettings;
  onNavigate: (module: string) => void;
  onStartTour: () => void;
  addToast: (type: "success" | "error" | "info" | "warning", msg: string) => void;
}

export const InteractiveTutorialView: React.FC<InteractiveTutorialViewProps> = ({
  currentUser,
  appSettings,
  onNavigate,
  onStartTour,
  addToast,
}) => {
  const [activeTab, setActiveTab] = useState<"semua" | "template" | "kegiatan" | "drive" | "cetak" | "profil">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Interactive Checklist State (persisted per user)
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem(`skp_tutorial_checklist_${currentUser.id}`);
      return saved
        ? JSON.parse(saved)
        : {
            check_template_laporan: false,
            check_kegiatan_first: false,
            check_ttd: !!currentUser.scan_ttd,
            check_profile_drive: !!currentUser.drive_link,
            check_apps_script: !!appSettings.apps_script_url,
          };
    } catch {
      return {
        check_template_laporan: false,
        check_kegiatan_first: false,
        check_ttd: !!currentUser.scan_ttd,
        check_profile_drive: !!currentUser.drive_link,
        check_apps_script: !!appSettings.apps_script_url,
      };
    }
  });

  const toggleChecklist = (key: string) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    try {
      localStorage.setItem(`skp_tutorial_checklist_${currentUser.id}`, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalChecklist = Object.keys(checklist).length;
  const progressPercent = Math.round((completedCount / totalChecklist) * 100);

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    addToast("success", "Kode Google Apps Script disalin ke clipboard!");
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const faqItems = [
    {
      q: "Kenapa saya HARUS mengisi Template Laporan terlebih dahulu sebelum Kegiatan Harian?",
      a: "Template Laporan berisi daftar Rencana Hasil Kerja (RHK) dan indikator kinerja. Saat Anda menambah data Kegiatan Harian, sistem mewajibkan Anda memilih RHK dari Template Laporan yang ada. Tanpa Template Laporan, Anda tidak bisa memilih RHK untuk kegiatan harian Anda.",
    },
    {
      q: "Bagaimana cara mengubah / mengedit Tanda Tangan (TTD) digital saya?",
      a: "Buka menu 'Profil' di sidebar. Klik area 'Upload Scan TTD' untuk memilih file gambar tanda tangan Anda (rekomendasi: background transparan atau putih). Setelah berhasil diupload, klik 'Simpan Profil'. Tanda tangan ini akan otomatis terpasang saat mencetak Laporan SKP.",
    },
    {
      q: "Mengapa Link Google Drive tersimpan terpisah di setiap akun petugas?",
      a: "Sistem Laporan SKP Online v2.6 dirancang dengan keamanan privat penuh. Setiap petugas memiliki bidang 'drive_link' sendiri di database. Hal ini memastikan seluruh PDF dan dokumentasi kegiatan Anda terisolasi secara aman di Drive pribadi milik Anda dan tidak akan dapat dibuka atau tertukar oleh user lain.",
    },
    {
      q: "Bagaimana cara membuat Webhook Google Apps Script agar upload PDF 100% otomatis?",
      a: "Buka script.google.com -> Buat Proyek Baru -> Tempel Kode Webhook yang telah disediakan -> Klik 'Terapkan' / 'Deploy' -> Pilih 'Akses: Siapa saja (Anyone)' -> Salin URL Webhook dan tempel di menu Cetak Laporan atau Cek Drive Files.",
    },
    {
      q: "Apa yang harus dilakukan jika muncul peringatan 'Token Akses Kadaluarsa'?",
      a: "Jika Anda menggunakan login Google OAuth langsung di browser, klik tombol 'Sambungkan Google Drive' untuk menyegarkan token. Jika Anda telah memasukkan Webhook Google Apps Script, sistem akan otomatis mengunggah via Webhook tanpa perlu login OAuth berulang kali.",
    },
    {
      q: "Apakah laporan yang telah diinput bisa dicetak secara bulanan sekaligus?",
      a: "Ya. Di menu 'Kegiatan Harian' atau 'Cetak Laporan', Anda dapat memfilter kegiatan berdasarkan Bulan dan Tahun, lalu menekan tombol 'Cetak Laporan SKP'. Seluruh kegiatan harian dalam bulan tersebut akan digabung secara otomatis.",
    },
  ];

  const filteredFaqs = faqItems.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Pusat Edukasi &amp; Panduan Interaktif
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Panduan &amp; Tutorial Penggunaan Aplikasi
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Pelajari urutan wajib penggunaan Laporan SKP Online v2.6, mulai dari pembuatan Template Laporan, pengisian Kegiatan Harian, pengeditan Tanda Tangan di Profil, hingga integrasi Google Drive.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={onStartTour}
                className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950 group-hover:scale-110 transition-transform" />
                <span>Mulai Tur Interaktif (Onboarding)</span>
              </button>

              <button
                onClick={() => setShowAppsScriptModal(true)}
                className="px-4 py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Kode Apps Script</span>
              </button>
            </div>
          </div>

          {/* Workflow Alert Box Highlight */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200 text-xs sm:text-sm leading-relaxed">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 uppercase tracking-wide block mb-0.5">
                URUTAN SANGAT PENTING (ALUR WAJIB PENGGUNAAN):
              </span>
              <ol className="list-decimal pl-4 space-y-1 font-medium">
                <li>
                  <strong>Langkah 1:</strong> User <strong>HARUS mengisi Template Laporan</strong> terlebih dahulu (menu Master Data -&gt; Template Laporan).
                </li>
                <li>
                  <strong>Langkah 2:</strong> Setelah Template Laporan ada, baru user dapat mengisi <strong>Kegiatan Harian</strong>.
                </li>
                <li>
                  <strong>Langkah 3:</strong> Tanda tangan (Scan TTD) dapat diunggah &amp; diedit kapan saja melalui menu <strong>Profil</strong>.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness Interactive Checklist Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Checklist Kesiapan Penggunaan Aplikasi ({completedCount}/{totalChecklist})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Selesaikan checklist ini untuk memastikan akun Anda siap mengunggah dan mencetak laporan SKP.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
              {progressPercent}% Selesai
            </span>
            <div className="w-32 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className="bg-amber-500 h-2.5 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <label
            onClick={() => toggleChecklist("check_template_laporan")}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              checklist.check_template_laporan
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 hover:border-amber-400"
            }`}
          >
            <input
              type="checkbox"
              checked={!!checklist.check_template_laporan}
              onChange={() => {}}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                1. Isi Template Laporan (WAJIB PERTAMA)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Buat RHK di menu Template Laporan agar bisa dipilih saat input kegiatan.
              </p>
            </div>
          </label>

          <label
            onClick={() => toggleChecklist("check_kegiatan_first")}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              checklist.check_kegiatan_first
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={!!checklist.check_kegiatan_first}
              onChange={() => {}}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                2. Mengisi Kegiatan Harian
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Input data pekerjaan harian setelah Template Laporan dibuat.
              </p>
            </div>
          </label>

          <label
            onClick={() => toggleChecklist("check_ttd")}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              checklist.check_ttd
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={!!checklist.check_ttd}
              onChange={() => {}}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                3. Edit Tanda Tangan (TTD) di Profil
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Unggah/edit Scan TTD digital Anda di menu Profil.
              </p>
            </div>
          </label>

          <label
            onClick={() => toggleChecklist("check_profile_drive")}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              checklist.check_profile_drive
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={!!checklist.check_profile_drive}
              onChange={() => {}}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                4. Simpan Link Drive Pribadi
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Atur link folder Google Drive milik sendiri di menu Profil.
              </p>
            </div>
          </label>

          <label
            onClick={() => toggleChecklist("check_apps_script")}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              checklist.check_apps_script
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={!!checklist.check_apps_script}
              onChange={() => {}}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                5. Webhook Apps Script Aktif
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pasang URL Webhook Google Apps Script untuk bypass upload.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Guide Modules Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Panduan Langkah Demi Langkah
          </h3>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto text-xs font-medium shrink-0">
            <button
              onClick={() => setActiveTab("semua")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "semua"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Semua Panduan
            </button>
            <button
              onClick={() => setActiveTab("template")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "template"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              1. Template Laporan (Wajib)
            </button>
            <button
              onClick={() => setActiveTab("kegiatan")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "kegiatan"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              2. Input Kegiatan
            </button>
            <button
              onClick={() => setActiveTab("profil")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "profil"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              3. TTD &amp; Profil
            </button>
            <button
              onClick={() => setActiveTab("drive")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "drive"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Google Drive &amp; Webhook
            </button>
            <button
              onClick={() => setActiveTab("cetak")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "cetak"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Guide Card 1: Template Laporan (SYARAT WAJIB PERTAMA) */}
          {(activeTab === "semua" || activeTab === "template") && (
            <div className="bg-white dark:bg-slate-900 border-2 border-amber-400/80 dark:border-amber-500/80 rounded-2xl p-6 shadow-md space-y-4 hover:border-amber-500 transition-all flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-slate-950 font-black text-[10px] uppercase rounded-bl-xl tracking-wider">
                Syarat Utama (Wajib Pertama)
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700">
                    Langkah 1 (Wajib)
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Mengisi Template Laporan / Master RHK
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Anda HARUS menginput Template Laporan terlebih dahulu agar daftar Rencana Hasil Kerja (RHK) dapat dipilih saat mencatat kegiatan harian.
                  </p>
                </div>

                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4">
                  <li>Buka menu <strong>Template Laporan</strong> di sidebar (di bawah Master Data).</li>
                  <li>Klik tombol <strong>+ Tambah Template Laporan</strong>.</li>
                  <li>Isi Nomor RHK, Uraian RHK/Umum, Maksud &amp; Tujuan, serta Ruang Lingkup.</li>
                  <li>Klik <strong>Simpan Template</strong>.</li>
                  <li>Setelah tersimpan, RHK ini otomatis tersedia di formulir Kegiatan Harian.</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onNavigate("laporan")}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Buka Template Laporan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Guide Card 2: Input Kegiatan Harian */}
          {(activeTab === "semua" || activeTab === "kegiatan") && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Langkah 2
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Mengisi Kegiatan Harian &amp; Foto Dokumentasi
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Diisi setelah Template Laporan tersedia. Pilih RHK, tuliskan deskripsi kegiatan, lokasi, jam kerja, dan upload foto dokumentasi.
                  </p>
                </div>

                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4">
                  <li>Pilih menu <strong>Kegiatan Harian</strong> di sidebar.</li>
                  <li>Klik tombol <strong>+ Tambah Kegiatan</strong>.</li>
                  <li>Pilih Rencana Hasil Kerja (RHK) dari template yang telah dibuat.</li>
                  <li>Isi deskripsi kegiatan, jam mulai/selesai, serta lokasi.</li>
                  <li>Unggah foto dokumentasi kegiatan fisik (maksimal 2MB per foto).</li>
                  <li>Klik <strong>Simpan Kegiatan</strong>.</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onNavigate("kegiatan_harian")}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>Mulai Input Kegiatan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Guide Card 3: Edit Tanda Tangan & Profil */}
          {(activeTab === "semua" || activeTab === "profil") && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
                    Langkah 3
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Edit Tanda Tangan (TTD) Digital &amp; Profil
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Tanda tangan digital dapat diunggah &amp; diedit kapan saja melalui menu Profil untuk dipasang otomatis saat cetak PDF.
                  </p>
                </div>

                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4">
                  <li>Buka menu <strong>Profil</strong> dari sidebar atau foto kanan atas.</li>
                  <li>Di bagian <strong>Scan Tanda Tangan (TTD)</strong>, klik tombol upload.</li>
                  <li>Unggah foto TTD Anda (rekomendasi: background transparan / bersih).</li>
                  <li>Masukkan <strong>Link Folder Google Drive</strong> pribadi milik Anda.</li>
                  <li>Klik <strong>Simpan Perubahan Profil</strong>.</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onNavigate("profil")}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>Edit TTD &amp; Profil</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Guide Card 4: Google Drive & Webhook */}
          {(activeTab === "semua" || activeTab === "drive") && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <FileSearch className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-full border border-purple-200 dark:border-purple-800">
                    Langkah 4
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Konfigurasi Google Drive &amp; Webhook
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Panduan lengkap agar file PDF laporan SKP terunggah otomatis ke Google Drive pribadi tanpa kendala token.
                  </p>
                </div>

                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4">
                  <li>Buat folder baru di Google Drive Anda (contoh: "Laporan SKP 2026").</li>
                  <li>Salin link folder Google Drive dan simpan di menu <strong>Profil</strong>.</li>
                  <li>Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-purple-600 dark:text-purple-400 underline font-semibold">script.google.com</a> dan tempelkan kode webhook.</li>
                  <li>Publikasikan Web App sebagai <strong>"Anyone"</strong> (Siapa saja).</li>
                  <li>Tempelkan URL Webhook di menu Cetak / Cek Drive Files.</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => setShowAppsScriptModal(true)}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Petunjuk Kode Script</span>
                </button>
                <button
                  onClick={() => onNavigate("cek_drive_files")}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  Cek Files
                </button>
              </div>
            </div>
          )}

          {/* Guide Card 5: Cetak Laporan SKP */}
          {(activeTab === "semua" || activeTab === "cetak") && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800">
                    Langkah 5
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Mencetak &amp; Mengunggah Laporan PDF
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Generasi cetak laporan bulanan/harian lengkap dengan Kop Surat resmi dan TTD digital dari profil Anda.
                  </p>
                </div>

                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4">
                  <li>Pilih kegiatan yang ingin dicetak dari tabel Kegiatan Harian.</li>
                  <li>Klik tombol <strong>Cetak / PDF</strong>.</li>
                  <li>Pemeriksaan otomatis Kop Surat, Tanggal, dan TTD dari Profil akan dilakukan.</li>
                  <li>Tekan <strong>"Unggah File ke Google Drive"</strong> untuk menyimpan file langsung di Cloud.</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onNavigate("kegiatan_harian")}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>Buka Kegiatan &amp; Cetak</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Searchable FAQ Accordion */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-500" />
              Tanya Jawab &amp; Troubleshooting (FAQ)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Jawaban atas kendala yang sering dialami pengguna.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari FAQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-6">
              Tidak ada FAQ yang cocok dengan kata kunci "{searchQuery}".
            </p>
          ) : (
            filteredFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full text-left p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronDown className="w-4 h-4 text-indigo-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {openFaqIndex === idx && (
                  <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Apps Script Guide Modal */}
      <AppsScriptGuideModal
        isOpen={showAppsScriptModal}
        onClose={() => setShowAppsScriptModal(false)}
      />
    </div>
  );
};
