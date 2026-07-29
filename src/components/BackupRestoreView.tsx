import React, { useState, useRef } from "react";
import {
  Petugas,
  RencanaBulanan,
  RencanaHarian,
  KegiatanHarian,
  LaporanTemplate,
  Lisensi,
  AppSettings,
} from "../types";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Download,
  Upload,
  Database,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  HardDrive,
  ShieldCheck,
  Loader2,
  Info,
  Calendar,
  Users,
  FileText,
  ClipboardList,
  Key,
  Sliders,
  Sparkles,
} from "lucide-react";

interface BackupRestoreViewProps {
  currentUser: Petugas;
  petugasList: Petugas[];
  rencanaBulananList: RencanaBulanan[];
  rencanaHarianList: RencanaHarian[];
  kegiatanList: KegiatanHarian[];
  laporanList: LaporanTemplate[];
  lisensiList: Lisensi[];
  appSettings: AppSettings;
  addToast: (type: "success" | "error" | "warning" | "info", title: string) => void;
}

export interface BackupData {
  version: string;
  appName: string;
  exportDate: string;
  exportedBy: {
    nama: string;
    nip: string;
  };
  data: {
    petugas: Petugas[];
    rencana_bulanan: RencanaBulanan[];
    rencana_harian: RencanaHarian[];
    kegiatan_harian: KegiatanHarian[];
    laporan: LaporanTemplate[];
    lisensi: Lisensi[];
    app_settings: Partial<AppSettings>;
  };
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  currentUser,
  petugasList,
  rencanaBulananList,
  rencanaHarianList,
  kegiatanList,
  laporanList,
  lisensiList,
  appSettings,
  addToast,
}) => {
  const [activeTab, setActiveTab] = useState<"backup" | "restore">("backup");

  // Backup state
  const [includePetugas, setIncludePetugas] = useState(true);
  const [includeRB, setIncludeRB] = useState(true);
  const [includeRH, setIncludeRH] = useState(true);
  const [includeKH, setIncludeKH] = useState(true);
  const [includeLaporan, setIncludeLaporan] = useState(true);
  const [includeLisensi, setIncludeLisensi] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoringFile, setRestoringFile] = useState<BackupData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [restoreMode, setRestoreMode] = useState<"merge" | "overwrite">("merge");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Download Backup JSON
  const handleDownloadBackup = () => {
    try {
      setIsExporting(true);

      const backupData: BackupData = {
        version: "2.5",
        appName: "Laporan SKP Online",
        exportDate: new Date().toISOString(),
        exportedBy: {
          nama: currentUser.nama,
          nip: currentUser.nip,
        },
        data: {
          petugas: includePetugas ? petugasList : [],
          rencana_bulanan: includeRB ? rencanaBulananList : [],
          rencana_harian: includeRH ? rencanaHarianList : [],
          kegiatan_harian: includeKH ? kegiatanList : [],
          laporan: includeLaporan ? laporanList : [],
          lisensi: includeLisensi ? lisensiList : [],
          app_settings: includeSettings ? appSettings : {},
        },
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;

      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `Backup_SKP_${dateStr}_${timeStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addToast("success", "File backup data berhasil diunduh!");
    } catch (err: any) {
      console.error("Backup error:", err);
      addToast("error", `Gagal membuat backup: ${err?.message || "Kesalahan sistem"}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Upload JSON File
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      addToast("error", "Format file tidak valid. Harus bertipe .json");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.data || typeof parsed.data !== "object") {
          throw new Error("Struktur file backup tidak sesuai (field 'data' tidak ditemukan).");
        }
        setRestoringFile(parsed as BackupData);
        addToast("info", "File backup berhasil dimuat. Silakan periksa ringkasan sebelum restore.");
      } catch (err: any) {
        console.error("Parse JSON error:", err);
        addToast("error", `File JSON korup atau tidak valid: ${err?.message}`);
        setRestoringFile(null);
      }
    };

    reader.readAsText(file);
  };

  // Execute Restore Process
  const handleExecuteRestore = async () => {
    if (!restoringFile) return;

    setIsRestoring(true);
    setShowConfirmModal(false);

    try {
      const data = restoringFile.data;

      // Helper function for safe setDoc
      const safeSet = async (col: string, id: string, itemData: any) => {
        const clean = JSON.parse(JSON.stringify(itemData));
        await setDoc(doc(db, col, id), clean, { merge: true });
      };

      // 1. OVERWRITE MODE: Option to clear existing collections if requested
      if (restoreMode === "overwrite") {
        setRestoreProgress("Mereset data lama di database...");
        // Clear collections that exist in file backup
        if (data.petugas && data.petugas.length > 0) {
          for (const item of petugasList) {
            try {
              await deleteDoc(doc(db, "petugas", item.id));
            } catch {}
          }
        }
        if (data.rencana_bulanan && data.rencana_bulanan.length > 0) {
          for (const item of rencanaBulananList) {
            try {
              await deleteDoc(doc(db, "rencana_bulanan", item.id));
            } catch {}
          }
        }
        if (data.rencana_harian && data.rencana_harian.length > 0) {
          for (const item of rencanaHarianList) {
            try {
              await deleteDoc(doc(db, "rencana_harian", item.id));
            } catch {}
          }
        }
        if (data.kegiatan_harian && data.kegiatan_harian.length > 0) {
          for (const item of kegiatanList) {
            try {
              await deleteDoc(doc(db, "kegiatan_harian", item.id));
            } catch {}
          }
        }
        if (data.laporan && data.laporan.length > 0) {
          for (const item of laporanList) {
            try {
              await deleteDoc(doc(db, "laporan", item.id));
            } catch {}
          }
        }
        if (data.lisensi && data.lisensi.length > 0) {
          for (const item of lisensiList) {
            try {
              await deleteDoc(doc(db, "lisensi", item.id));
            } catch {}
          }
        }
      }

      // 2. RESTORE DATA COLLECTIONS
      if (data.petugas && Array.isArray(data.petugas)) {
        setRestoreProgress(`Memulihkan ${data.petugas.length} data Petugas...`);
        for (const item of data.petugas) {
          if (item.id) {
            await safeSet("petugas", item.id, item);
          }
        }
      }

      if (data.rencana_bulanan && Array.isArray(data.rencana_bulanan)) {
        setRestoreProgress(`Memulihkan ${data.rencana_bulanan.length} Rencana Bulanan...`);
        for (const item of data.rencana_bulanan) {
          if (item.id) {
            await safeSet("rencana_bulanan", item.id, item);
          }
        }
      }

      if (data.rencana_harian && Array.isArray(data.rencana_harian)) {
        setRestoreProgress(`Memulihkan ${data.rencana_harian.length} Rencana Harian...`);
        for (const item of data.rencana_harian) {
          if (item.id) {
            await safeSet("rencana_harian", item.id, item);
          }
        }
      }

      if (data.kegiatan_harian && Array.isArray(data.kegiatan_harian)) {
        setRestoreProgress(`Memulihkan ${data.kegiatan_harian.length} Kegiatan Harian...`);
        for (const item of data.kegiatan_harian) {
          if (item.id) {
            await safeSet("kegiatan_harian", item.id, item);
          }
        }
      }

      if (data.laporan && Array.isArray(data.laporan)) {
        setRestoreProgress(`Memulihkan ${data.laporan.length} Template Laporan...`);
        for (const item of data.laporan) {
          if (item.id) {
            await safeSet("laporan", item.id, item);
          }
        }
      }

      if (data.lisensi && Array.isArray(data.lisensi)) {
        setRestoreProgress(`Memulihkan ${data.lisensi.length} Data Lisensi...`);
        for (const item of data.lisensi) {
          if (item.id) {
            await safeSet("lisensi", item.id, item);
          }
        }
      }

      if (data.app_settings && Object.keys(data.app_settings).length > 0) {
        setRestoreProgress("Memulihkan Pengaturan Aplikasi...");
        await safeSet("app_settings", "global", data.app_settings);
      }

      addToast("success", "Restore data berhasil diselesaikan sepenuhnya!");
      setRestoringFile(null);
      setFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("Restore error:", err);
      addToast("error", `Gagal restore data: ${err?.message || "Kesalahan koneksi Firestore"}`);
    } finally {
      setIsRestoring(false);
      setRestoreProgress("");
    }
  };

  const getBackupSummaryCounts = () => {
    return {
      petugas: petugasList.length,
      rb: rencanaBulananList.length,
      rh: rencanaHarianList.length,
      kh: kegiatanList.length,
      laporan: laporanList.length,
      lisensi: lisensiList.length,
      settings: Object.keys(appSettings || {}).length > 0 ? 1 : 0,
    };
  };

  const isAdmin = currentUser.level === "ADMIN";

  const summary = getBackupSummaryCounts();

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 space-y-4 animate-in fade-in duration-200">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Akses Dibatasi (Hanya Admin)</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Fitur Backup & Restore Data hanya dapat diakses oleh Pengguna dengan Hak Akses Admin. Silakan hubungi Administrator sistem jika Anda memerlukan bantuan pencadangan data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold tracking-tight">Backup & Restore Database</h1>
          </div>
          <p className="text-xs text-slate-300">
            Cadangkan semua data laporan, rencana SKP, petugas, dan pengaturan ke file JSON, atau pulihkan kembali kapan saja.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-700/60 shrink-0">
          <button
            onClick={() => setActiveTab("backup")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "backup"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Backup Data</span>
          </button>
          <button
            onClick={() => setActiveTab("restore")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "restore"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restore Data</span>
          </button>
        </div>
      </div>

      {/* BACKUP TAB CONTENT */}
      {activeTab === "backup" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Form Settings */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <span>Pilih Data yang Ingin Di-backup</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Secara default, seluruh data aplikasi akan dimasukkan ke dalam file cadangan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIncludePetugas(true);
                  setIncludeRB(true);
                  setIncludeRH(true);
                  setIncludeKH(true);
                  setIncludeLaporan(true);
                  setIncludeLisensi(true);
                  setIncludeSettings(true);
                }}
                className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
              >
                Pilih Semua
              </button>
            </div>

            {/* Checkbox Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeKH}
                  onChange={(e) => setIncludeKH(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Kegiatan Harian</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {summary.kh} Catatan Kegiatan
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeRB}
                  onChange={(e) => setIncludeRB(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Rencana Bulanan</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {summary.rb} Target RHK
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeRH}
                  onChange={(e) => setIncludeRH(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Rencana Harian</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {summary.rh} Rencana Harian
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includePetugas}
                  onChange={(e) => setIncludePetugas(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>Data Petugas</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {summary.petugas} Petugas Terdaftar
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeLaporan}
                  onChange={(e) => setIncludeLaporan(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5 text-purple-500" />
                    <span>Template Laporan</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {summary.laporan} Format Laporan
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeLisensi}
                  onChange={(e) => setIncludeLisensi(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-rose-500" />
                    <span>Data Lisensi</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {summary.lisensi} Lisensi Pro
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer sm:col-span-2 transition-colors">
                <input
                  type="checkbox"
                  checked={includeSettings}
                  onChange={(e) => setIncludeSettings(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-teal-500" />
                    <span>Pengaturan Kop Surat & Instansi Global</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Sistem Kop Surat, Instansi & Shared Drive Settings
                  </span>
                </div>
              </label>
            </div>

            {/* Export Action Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={
                  isExporting ||
                  (!includePetugas &&
                    !includeRB &&
                    !includeRH &&
                    !includeKH &&
                    !includeLaporan &&
                    !includeLisensi &&
                    !includeSettings)
                }
                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyiapkan File...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Backup Data (.JSON)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Side Panel */}
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Keamanan Data Cadangan</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/80">
                File backup berupa dokumen JSON terenkripsi standar yang dapat Anda simpan di Flashdisk, Google Drive, atau Komputer lokal untuk pengamanan rutin.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-500" />
                <span>Ringkasan Database Saat Ini</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Total Kegiatan Harian:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{summary.kh}</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Total Rencana Bulanan:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{summary.rb}</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Total Rencana Harian:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{summary.rh}</span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span>Total User / Petugas:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{summary.petugas}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE TAB CONTENT */}
      {activeTab === "restore" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-500" />
                <span>Unggah File Backup JSON</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih file cadangan (.json) yang sebelumnya telah Anda download dari aplikasi.
              </p>
            </div>

            {/* Dropzone / File Picker */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                fileName
                  ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                  : "border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50/50 dark:bg-slate-800/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    fileName
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {fileName ? <FileJson className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>
                {fileName ? (
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {fileName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Klik untuk mengganti file backup yang dipilih
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Klik di sini untuk memilih file Backup (.json)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Mendukung file cadangan dari aplikasi Laporan SKP
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Selected File Data */}
            {restoringFile && (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Informasi File Cadangan</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded font-bold">
                      Versi {restoringFile.version || "2.5"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Tanggal Export:</span>
                      <span className="font-semibold">
                        {restoringFile.exportDate
                          ? new Date(restoringFile.exportDate).toLocaleString("id-ID")
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Di-export Oleh:</span>
                      <span className="font-semibold">
                        {restoringFile.exportedBy?.nama || "Admin"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Isi Dokumen yang Akan Dipulihkan:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                        <span className="text-slate-500 block">Kegiatan Harian:</span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                          {restoringFile.data.kegiatan_harian?.length || 0} items
                        </strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                        <span className="text-slate-500 block">Rencana Bulanan:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {restoringFile.data.rencana_bulanan?.length || 0} items
                        </strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                        <span className="text-slate-500 block">Rencana Harian:</span>
                        <strong className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                          {restoringFile.data.rencana_harian?.length || 0} items
                        </strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                        <span className="text-slate-500 block">Data Petugas:</span>
                        <strong className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                          {restoringFile.data.petugas?.length || 0} items
                        </strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                        <span className="text-slate-500 block">Template Laporan:</span>
                        <strong className="text-purple-600 dark:text-purple-400 font-mono text-xs">
                          {restoringFile.data.laporan?.length || 0} items
                        </strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                        <span className="text-slate-500 block">Lisensi & Config:</span>
                        <strong className="text-rose-600 dark:text-rose-400 font-mono text-xs">
                          {(restoringFile.data.lisensi?.length || 0) +
                            (restoringFile.data.app_settings ? 1 : 0)}{" "}
                          items
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mode Option Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Metode Pemulihan (Restore Mode):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setRestoreMode("merge")}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                        restoreMode === "merge"
                          ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === "merge"}
                        onChange={() => setRestoreMode("merge")}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Gabungkan Data (Merge)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Menambahkan data baru dan memperbarui data dengan ID sama tanpa menghapus data existing.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setRestoreMode("overwrite")}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                        restoreMode === "overwrite"
                          ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-rose-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === "overwrite"}
                        onChange={() => setRestoreMode("overwrite")}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                          Reset & Timpa (Overwrite)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Menghapus data lama di database dan menggantinya penuh dengan data file cadangan.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Restore Progress Status */}
                {isRestoring && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                        Proses Restore Sedang Berjalan...
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        {restoreProgress}
                      </p>
                    </div>
                  </div>
                )}

                {/* Restore Start Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isRestoring}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Mulai Proses Restore Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Warning Side Panel */}
          <div className="space-y-4">
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Perhatian Saat Restore</span>
              </div>
              <ul className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300/80 space-y-1.5 list-disc pl-4">
                <li>
                  Pastikan file backup berasal dari aplikasi Laporan SKP resmi.
                </li>
                <li>
                  Gunakan mode <strong>Gabungkan Data</strong> jika hanya ingin menambah data yang hilang.
                </li>
                <li>
                  Mode <strong>Reset & Timpa</strong> akan mengganti isi database. Lakukan backup terlebih dahulu jika ragu!
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Konfirmasi Restore Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mode:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {restoreMode === "merge" ? "Gabungkan Data (Merge)" : "Reset & Timpa (Overwrite)"}
                  </strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin memulihkan data dari file{" "}
              <strong className="text-slate-900 dark:text-white font-mono">{fileName}</strong>?
              {restoreMode === "overwrite" && (
                <span className="block mt-2 font-bold text-rose-600 dark:text-rose-400">
                  Peringatan: Seluruh data lama di database akan dihapus dan digantikan oleh file cadangan ini.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ya, Proses Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
