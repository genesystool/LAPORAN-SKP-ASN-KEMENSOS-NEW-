import React, { useState } from "react";
import {
  Sparkles,
  GitCommit,
  CheckCircle2,
  Tag,
  Calendar,
  Search,
  Filter,
  FileCode2,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Layers,
  FileText,
  Lock,
  Globe,
  HardDrive,
  Cpu,
} from "lucide-react";
import { Petugas } from "../types";

interface ChangelogViewProps {
  currentUser: Petugas;
  onNavigate?: (module: string) => void;
}

export interface ReleaseVersion {
  version: string;
  date: string;
  badge: "LATEST" | "STABLE" | "LEGACY";
  title: string;
  description: string;
  highlights: {
    category: "FEATURE" | "ENHANCEMENT" | "SECURITY" | "FIX";
    title: string;
    description: string;
    icon?: React.ReactNode;
  }[];
}

export const APP_VERSIONS: ReleaseVersion[] = [
  {
    version: "v2.6.0",
    date: "29 Juli 2026",
    badge: "LATEST",
    title: "Format Word Editable, Restriksi Admin Webhook & Menu Perubahan Aplikasi",
    description:
      "Pembaruan utama yang menambahkan dukungan ekspor laporan ke format Word (.DOC) yang dapat diedit, penguncian keamanan webhook Google Drive khusus Admin, serta pelacak versi aplikasi.",
    highlights: [
      {
        category: "FEATURE",
        title: "Menu Perubahan Aplikasi (Release Notes)",
        description:
          "Navigasi baru untuk memantau riwayat pembaruan, rilis modul, versi sistem, serta detail peningkatan pada setiap versi Laporan SKP.",
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      },
      {
        category: "FEATURE",
        title: "Format Unduh Word (.DOC) Dapat Diedit",
        description:
          "Menambahkan pilihan unduh laporan dalam format Microsoft Word (.DOC) presisi tinggi dengan Kop Surat, tabel kegiatan, tanda tangan, dan foto dokumentasi yang langsung dapat diedit di MS Word / Google Docs.",
        icon: <FileText className="w-4 h-4 text-blue-500" />,
      },
      {
        category: "SECURITY",
        title: "Akses Webhook Google Drive Khusus Admin",
        description:
          "Pengaturan URL Webhook Google Apps Script kini dibatasi hanya untuk level Admin. User non-admin tetap dapat menggunakan fitur unduh & sinkronisasi tanpa risiko mengubah konfigurasi.",
        icon: <Lock className="w-4 h-4 text-purple-500" />,
      },
      {
        category: "ENHANCEMENT",
        title: "Presisi Layout Cetak A4 PDF & Word",
        description:
          "Penataan ulang CSS MSO Word dan visual cetak A4 agar hasil unduhan Word maupun PDF tetap konsisten, rapi, dan presisi melintasi lembar kerja.",
        icon: <Zap className="w-4 h-4 text-emerald-500" />,
      },
    ],
  },
  {
    version: "v2.5.0",
    date: "15 Juli 2026",
    badge: "STABLE",
    title: "Cek File Google Drive, Webhook Apps Script & Kontrol Fitur User",
    description:
      "Integrasi pemantauan file Google Drive secara langsung dan modul kontrol hak akses tombol untuk Administrator.",
    highlights: [
      {
        category: "FEATURE",
        title: "Modul Cek File Google Drive",
        description:
          "Memantau status ketersediaan file PDF laporan yang telah diunggah ke Google Drive dengan opsi kirim ulang otomatis melalui Webhook Apps Script.",
        icon: <Globe className="w-4 h-4 text-purple-500" />,
      },
      {
        category: "SECURITY",
        title: "Pengaturan Kontrol Tombol Aksi User",
        description:
          "Admin dapat menonaktifkan atau mengaktifkan tombol Tambah, Edit, Hapus Kegiatan, serta Salin Template Laporan untuk seluruh user non-admin.",
        icon: <ShieldCheck className="w-4 h-4 text-rose-500" />,
      },
      {
        category: "ENHANCEMENT",
        title: "Pengaturan Kop Surat Global & Keygen Lisensi PRO",
        description:
          "Kop surat instansi kini dapat diunggah sekali oleh Admin dan langsung berlaku otomatis untuk seluruh petugas dalam cetak laporan resmi.",
        icon: <Layers className="w-4 h-4 text-amber-500" />,
      },
    ],
  },
  {
    version: "v2.4.0",
    date: "01 Juni 2026",
    badge: "STABLE",
    title: "Bantuan Narasi AI (Gemini), Master Template & Modul P2K2",
    description:
      "Pengintegrasian AI kecerdasan buatan untuk merangkai narasi laporan kegiatan dan modul kegiatan Program Keluarga Harapan (P2K2).",
    highlights: [
      {
        category: "FEATURE",
        title: "Penyusun Laporan Berbasis AI (Gemini)",
        description:
          "Generasi narasi laporan harian secara otomatis berdasarkan kata kunci dengan pilihan gaya bahasa Formal, Ringkas, atau Detail.",
        icon: <Cpu className="w-4 h-4 text-indigo-500" />,
      },
      {
        category: "FEATURE",
        title: "Master Modul P2K2 & Templat Laporan",
        description:
          "Penyediaan bank data modul P2K2 dan salin template RHK antar petugas untuk mempercepat pengisian kegiatan harian pendamping.",
        icon: <FileCode2 className="w-4 h-4 text-cyan-500" />,
      },
    ],
  },
  {
    version: "v2.0.0 - v2.3.0",
    date: "Mei 2026",
    badge: "LEGACY",
    title: "Firestore Realtime Database, Dashboard SKP & Backup Restore",
    description:
      "Pondasi utama aplikasi mencakup integrasi Firebase Firestore, statistik dashboard, dan backup data lokal.",
    highlights: [
      {
        category: "FEATURE",
        title: "Sinkronisasi Firestore Realtime Cloud",
        description:
          "Penyimpanan data cloud otomatis dengan dukungan aturan Firestore security rules dan pencegahan batas ukuran dokumen.",
        icon: <HardDrive className="w-4 h-4 text-emerald-500" />,
      },
      {
        category: "FEATURE",
        title: "Ekspor Impor Backup Data JSON",
        description:
          "Fasilitas pembuatan cadangan data seluruh koleksi aplikasi (Petugas, Kegiatan, Rencana Bulanan/Harian, Lisensi) dalam satu file JSON.",
        icon: <GitCommit className="w-4 h-4 text-slate-500" />,
      },
    ],
  },
];

export const ChangelogView: React.FC<ChangelogViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredVersions = APP_VERSIONS.map((ver) => {
    const matchingHighlights = ver.highlights.filter((hl) => {
      const matchCat =
        selectedCategory === "ALL" || hl.category === selectedCategory;
      const matchText =
        searchQuery.trim() === "" ||
        hl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ver.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ver.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchText;
    });

    return {
      ...ver,
      highlights: matchingHighlights,
    };
  }).filter(
    (ver) =>
      ver.highlights.length > 0 ||
      (selectedCategory === "ALL" &&
        searchQuery.trim() !== "" &&
        (ver.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ver.title.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const categoryBadges = [
    { id: "ALL", label: "Semua Perubahan" },
    { id: "FEATURE", label: "Fitur Baru" },
    { id: "ENHANCEMENT", label: "Peningkatan" },
    { id: "SECURITY", label: "Keamanan" },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Catatan Rilis &amp; Histori Versi</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Menu Perubahan Aplikasi
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Pantau seluruh rekam jejak pengembangan, penambahan modul baru,
              peningkatan performa, dan pembaruan versi resmi Laporan SKP secara
              transparan.
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 flex flex-col items-start gap-2 shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Versi Sistem Saat Ini
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-black font-mono text-amber-400">
                v2.6.0
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> LATEST
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Diperbarui: 29 Juli 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Search & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categoryBadges.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari fitur / versi..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 md:before:left-8 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:z-0">
        {filteredVersions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Filter className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tidak ada catatan perubahan yang sesuai dengan pencarian.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
              }}
              className="text-xs text-amber-600 font-bold underline cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          filteredVersions.map((ver, idx) => (
            <div key={ver.version} className="relative z-10 pl-10 md:pl-16 space-y-4">
              {/* Timeline Bullet */}
              <div
                className={`absolute left-2 md:left-6 top-1.5 -translate-x-1/2 w-5 h-5 rounded-full border-4 flex items-center justify-center ${
                  ver.badge === "LATEST"
                    ? "bg-amber-500 border-amber-200 dark:border-amber-950 ring-4 ring-amber-500/20"
                    : "bg-slate-400 border-slate-200 dark:border-slate-800"
                }`}
              />

              {/* Version Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xs space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg md:text-xl font-black font-mono text-slate-900 dark:text-white">
                      {ver.version}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                        ver.badge === "LATEST"
                          ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          : ver.badge === "STABLE"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {ver.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{ver.date}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
                    {ver.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {ver.description}
                  </p>
                </div>

                {/* Highlights List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {ver.highlights.map((hl, hlIdx) => (
                    <div
                      key={hlIdx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        {hl.icon || (
                          <Tag className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {hl.title}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
                        {hl.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info Box */}
      <div className="p-4 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 text-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Setiap ada penambahan modul atau pembaruan sistem, nomor versi akan
            diperbarui secara otomatis pada menu rilis ini.
          </span>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate("home")}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Kembali ke Dashboard</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
