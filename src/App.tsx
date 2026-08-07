import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { seedInitialFirestoreData } from "./lib/seedData";
import {
  Petugas,
  RencanaBulanan,
  RencanaHarian,
  KegiatanHarian,
  LaporanTemplate,
  Lisensi,
  ModulP2K2,
  AppSettings,
  ToastMessage,
} from "./types";

import { LoginView } from "./components/LoginView";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { KegiatanHarianView } from "./components/KegiatanHarianView";
import { MasterBulananView } from "./components/MasterBulananView";
import { MasterHarianView } from "./components/MasterHarianView";
import { MasterPetugasView } from "./components/MasterPetugasView";
import { MasterLaporanView } from "./components/MasterLaporanView";
import { MasterP2K2View } from "./components/MasterP2K2View";
import { LisensiView } from "./components/LisensiView";
import { BackupRestoreView } from "./components/BackupRestoreView";
import { PrintReportView } from "./components/PrintReportView";
import { ProfilView } from "./components/ProfilView";
import { CekDriveFilesView } from "./components/CekDriveFilesView";
import { ChangelogView } from "./components/ChangelogView";
import { InteractiveTutorialView } from "./components/InteractiveTutorialView";
import { OnboardingTourModal } from "./components/OnboardingTourModal";

import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Petugas | null>(() => {
    try {
      const saved = localStorage.getItem("laporan_skp_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("laporan_skp_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("laporan_skp_user");
    }
  }, [currentUser]);

  const [currentModule, setCurrentModule] = useState<string>("home");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);

  // Trigger Onboarding Tour for new logins
  useEffect(() => {
    if (currentUser) {
      try {
        const completed = localStorage.getItem(`skp_tutorial_completed_${currentUser.id}`);
        if (!completed) {
          // Open tour automatically for newly logged in user
          const timer = setTimeout(() => {
            setShowOnboardingTour(true);
          }, 800);
          return () => clearTimeout(timer);
        }
      } catch {
        // Ignore
      }
    }
  }, [currentUser]);

  // Theme Mode: 'auto' (Otomatis: 06:00-18:00 Terang, 18:00-06:00 Gelap), 'light', or 'dark'
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">(() => {
    try {
      const savedMode = localStorage.getItem("laporan_skp_theme_mode");
      if (savedMode === "auto" || savedMode === "light" || savedMode === "dark") {
        return savedMode;
      }
      return "auto"; // Default to automatic time-based mode
    } catch {
      return "auto";
    }
  });

  // Helper to determine if current time is Nighttime (18:00 - 05:59)
  const getIsNightTime = (): boolean => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  };

  // Active dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const savedMode = localStorage.getItem("laporan_skp_theme_mode");
      if (savedMode === "dark") return true;
      if (savedMode === "light") return false;
      return getIsNightTime();
    } catch {
      return getIsNightTime();
    }
  });

  // Auto-hide menu preference state with localStorage persistence
  const [autoHideMenu, setAutoHideMenu] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("laporan_skp_autohide_menu");
      if (saved !== null) {
        return saved === "true";
      }
      return true; // Default auto-hide menu enabled for convenience
    } catch {
      return true;
    }
  });

  // Cleanup old global un-namespaced Drive links to guarantee zero cross-contamination
  useEffect(() => {
    try {
      localStorage.removeItem("laporan_skp_drive_link");
      localStorage.removeItem("shared_drive_link");
    } catch {
      // Ignore
    }
  }, []);

  // Periodically sync theme with time of day or themeMode changes
  useEffect(() => {
    const syncThemeWithTime = () => {
      if (themeMode === "auto") {
        const isNight = getIsNightTime();
        setDarkMode(isNight);
      } else if (themeMode === "dark") {
        setDarkMode(true);
      } else if (themeMode === "light") {
        setDarkMode(false);
      }
    };

    syncThemeWithTime();

    // Check time every 10 seconds to trigger automatic theme change at 06:00 & 18:00
    const interval = setInterval(syncThemeWithTime, 10000);
    return () => clearInterval(interval);
  }, [themeMode]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("laporan_skp_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("laporan_skp_theme", "light");
    }
    localStorage.setItem("laporan_skp_theme_mode", themeMode);
  }, [darkMode, themeMode]);

  const handleToggleThemeMode = () => {
    if (themeMode === "auto") {
      setThemeMode(darkMode ? "light" : "dark");
    } else if (themeMode === "dark") {
      setThemeMode("light");
    } else {
      setThemeMode("auto");
    }
  };

  useEffect(() => {
    localStorage.setItem("laporan_skp_autohide_menu", autoHideMenu ? "true" : "false");
  }, [autoHideMenu]);

  // Centralized Navigation Handler with Auto-hide support
  const handleNavigate = (mod: string) => {
    setCurrentModule(mod);
    if (autoHideMenu || window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Firestore Data Collections
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [rencanaBulananList, setRencanaBulananList] = useState<RencanaBulanan[]>([]);
  const [rencanaHarianList, setRencanaHarianList] = useState<RencanaHarian[]>([]);
  const [kegiatanList, setKegiatanList] = useState<KegiatanHarian[]>([]);
  const [laporanList, setLaporanList] = useState<LaporanTemplate[]>([]);
  const [lisensiList, setLisensiList] = useState<Lisensi[]>([]);
  const [modulP2k2List, setModulP2k2List] = useState<ModulP2K2[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    kop_surat_url: "",
    favicon_url: "",
    kop_mode: "auto",
    instansi_header: "KEMENTERIAN SOSIAL REPUBLIK INDONESIA",
    sub_header: "Direktorat Jenderal Pemberdayaan Sosial / Dinas Sosial",
    alamat_header: "Jl. Salemba Raya No. 28, Jakarta Pusat / Kantor Wilayah Daerah",
  } as AppSettings);

  // Sync favicon dynamically when appSettings.favicon_url changes
  useEffect(() => {
    if (appSettings.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = appSettings.favicon_url;
    }
  }, [appSettings.favicon_url]);

  // Print Mode State
  const [printingKegiatan, setPrintingKegiatan] = useState<KegiatanHarian | null>(null);
  const [printingKegiatanList, setPrintingKegiatanList] = useState<KegiatanHarian[] | null>(null);

  // Toast System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage["type"], title: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Seed Data and Listen to Firestore Realtime Updates
  useEffect(() => {
    document.title = "Laporan SKP v2.6.1";
    seedInitialFirestoreData();

    const unsubPetugas = onSnapshot(collection(db, "petugas"), (snap) => {
      const data: Petugas[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Petugas));
      setPetugasList(data);
    }, (err) => console.error("Firestore petugas error:", err));

    const unsubRB = onSnapshot(collection(db, "rencana_bulanan"), (snap) => {
      const data: RencanaBulanan[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as RencanaBulanan));
      data.sort((a, b) => a.no_rhk - b.no_rhk);
      setRencanaBulananList(data);
    }, (err) => console.error("Firestore rencana_bulanan error:", err));

    const unsubRH = onSnapshot(collection(db, "rencana_harian"), (snap) => {
      const data: RencanaHarian[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as RencanaHarian));
      data.sort((a, b) => a.norhkharian - b.norhkharian);
      setRencanaHarianList(data);
    }, (err) => console.error("Firestore rencana_harian error:", err));

    const unsubKH = onSnapshot(collection(db, "kegiatan_harian"), (snap) => {
      const data: KegiatanHarian[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as KegiatanHarian));
      data.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
      setKegiatanList(data);
    }, (err) => console.error("Firestore kegiatan_harian error:", err));

    const unsubLap = onSnapshot(collection(db, "laporan"), (snap) => {
      const data: LaporanTemplate[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as LaporanTemplate));
      setLaporanList(data);
    }, (err) => console.error("Firestore laporan error:", err));

    const unsubLis = onSnapshot(collection(db, "lisensi"), (snap) => {
      const data: Lisensi[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Lisensi));
      setLisensiList(data);
    }, (err) => console.error("Firestore lisensi error:", err));

    const unsubP2k2 = onSnapshot(collection(db, "modul_p2k2"), (snap) => {
      const data: ModulP2K2[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as ModulP2K2));
      data.sort((a, b) => (a.kode_modul || "").localeCompare(b.kode_modul || ""));
      setModulP2k2List(data);
    }, (err) => console.error("Firestore modul_p2k2 error:", err));

    const unsubSettings = onSnapshot(doc(db, "app_settings", "global"), (snap) => {
      if (snap.exists()) {
        setAppSettings((prev) => ({ ...prev, ...snap.data() }));
      }
    }, (err) => console.error("Firestore app_settings error:", err));

    return () => {
      unsubPetugas();
      unsubRB();
      unsubRH();
      unsubKH();
      unsubLap();
      unsubLis();
      unsubP2k2();
      unsubSettings();
    };
  }, []);

  // Sync currentUser with updated petugasList from Firestore
  useEffect(() => {
    if (currentUser && petugasList.length > 0) {
      const updated = petugasList.find(
        (p) => p.id === currentUser.id || p.nip.toLowerCase() === currentUser.nip.toLowerCase()
      );
      if (
        updated &&
        (updated.id !== currentUser.id ||
          updated.nama !== currentUser.nama ||
          updated.status !== currentUser.status ||
          updated.foto !== currentUser.foto ||
          updated.scan_ttd !== currentUser.scan_ttd ||
          updated.drive_link !== currentUser.drive_link ||
          updated.password !== currentUser.password ||
          updated.level !== currentUser.level)
      ) {
        setCurrentUser(updated);
      }
    }
  }, [petugasList]);

  // License Logic - Validates strict Keygen code format: RHKPRO-{NIP} or RHKPRO-{NIP}-{HASH}
  const cleanUserNip = currentUser ? currentUser.nip.replace(/\s+/g, "") : "";
  const userLicense = lisensiList.find(
    (l) =>
      currentUser &&
      (l.petugas_id === currentUser.id || l.nip === currentUser.nip) &&
      l.kode &&
      cleanUserNip !== "" &&
      (l.kode === `RHKPRO-${cleanUserNip}` ||
        l.kode.startsWith(`RHKPRO-${cleanUserNip}-`))
  );

  const isLicensed = !!userLicense;

  const myKegiatanCount = currentUser
    ? kegiatanList.filter((k) => k.petugas_id === currentUser.id).length
    : 0;

  const limitReached = !isLicensed && myKegiatanCount >= 5;

  // --- CRUD Handlers ---

  // Helper for safe setDoc with sanitized data to guarantee persistence in Firestore
  const safeSetDoc = async (docRef: any, data: any, options?: any) => {
    try {
      // Remove any 'undefined' properties which cause Firestore setDoc to fail
      const cleanData = JSON.parse(JSON.stringify(data));
      if (options) {
        await setDoc(docRef, cleanData, options);
      } else {
        await setDoc(docRef, cleanData);
      }
      return true;
    } catch (err) {
      console.error("Firestore safeSetDoc error:", err);
      return false;
    }
  };

  // Helper for safe deleteDoc
  const safeDeleteDoc = async (docRef: any) => {
    try {
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error("Firestore safeDeleteDoc error:", err);
      return false;
    }
  };

  // Petugas Register / Admin Save
  const handleRegisterPetugas = async (newPetugas: Omit<Petugas, "id">) => {
    try {
      const docId = `petugas_${Date.now()}`;
      return await safeSetDoc(doc(db, "petugas", docId), newPetugas);
    } catch (err) {
      console.error("Failed to register:", err);
      return false;
    }
  };

  const handleSavePetugas = async (data: Omit<Petugas, "id">, id?: string) => {
    try {
      const targetId = id || `petugas_${Date.now()}`;
      return await safeSetDoc(doc(db, "petugas", targetId), data, { merge: true });
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeletePetugas = async (id: string) => {
    try {
      return await safeDeleteDoc(doc(db, "petugas", id));
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Update Profile
  const handleUpdateProfile = async (updated: Partial<Petugas>) => {
    if (!currentUser) return false;
    try {
      await safeSetDoc(doc(db, "petugas", currentUser.id), updated, { merge: true });
      setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Rencana Bulanan CRUD
  const handleSaveRencanaBulanan = async (data: Omit<RencanaBulanan, "id">, id?: string) => {
    try {
      const targetId = id || `rb_${Date.now()}`;
      return await safeSetDoc(doc(db, "rencana_bulanan", targetId), data, { merge: true });
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteRencanaBulanan = async (id: string) => {
    try {
      return await safeDeleteDoc(doc(db, "rencana_bulanan", id));
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Rencana Harian CRUD
  const handleSaveRencanaHarian = async (data: Omit<RencanaHarian, "id">, id?: string) => {
    try {
      const targetId = id || `rh_${Date.now()}`;
      return await safeSetDoc(doc(db, "rencana_harian", targetId), data, { merge: true });
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteRencanaHarian = async (id: string) => {
    try {
      return await safeDeleteDoc(doc(db, "rencana_harian", id));
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Template Laporan CRUD
  const handleSaveLaporan = async (data: Omit<LaporanTemplate, "id">, id?: string) => {
    try {
      const targetId = id || `lap_${Date.now()}`;
      return await safeSetDoc(doc(db, "laporan", targetId), data, { merge: true });
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteLaporan = async (id: string) => {
    try {
      return await safeDeleteDoc(doc(db, "laporan", id));
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Modul P2K2 CRUD
  const handleSaveModulP2k2 = async (data: Omit<ModulP2K2, "id">, id?: string) => {
    try {
      const targetId = id || `p2k2_${Date.now()}`;
      return await safeSetDoc(doc(db, "modul_p2k2", targetId), data, { merge: true });
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteModulP2k2 = async (id: string) => {
    try {
      return await safeDeleteDoc(doc(db, "modul_p2k2", id));
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Kegiatan Harian CRUD
  const handleSaveKegiatan = async (data: Omit<KegiatanHarian, "id">, id?: string) => {
    try {
      if (!id && limitReached) {
        addToast("error", "Batas trial 5 kegiatan telah tercapai!");
        return false;
      }
      const targetId = id || `kh_${Date.now()}`;
      return await safeSetDoc(doc(db, "kegiatan_harian", targetId), data, { merge: true });
    } catch (err: any) {
      console.error("Firestore save error:", err);
      addToast("error", `Gagal menyimpan: ${err?.message || "Ukuran data melebihi batas Firestore 1MB"}`);
      return false;
    }
  };

  const handleDeleteKegiatan = async (id: string) => {
    try {
      return await safeDeleteDoc(doc(db, "kegiatan_harian", id));
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // License Activation
  const handleActivateLicense = async (code: string, targetNip?: string, targetPetugasId?: string) => {
    const nipToActivate = targetNip || currentUser?.nip;
    const petugasIdToActivate = targetPetugasId || currentUser?.id;
    if (!nipToActivate || !petugasIdToActivate) return false;

    try {
      const docId = `lis_${nipToActivate}_${Date.now()}`;
      return await safeSetDoc(doc(db, "lisensi", docId), {
        kode: code.toUpperCase().trim(),
        nip: nipToActivate,
        petugas_id: petugasIdToActivate,
        tanggal_aktivasi: new Date().toISOString(),
        tanggal_kedaluwarsa: null, // Lifetime
      });
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteLicense = async (id: string) => {
    try {
      return await safeDeleteDoc(doc(db, "lisensi", id));
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // App Settings CRUD
  const handleSaveAppSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      return await safeSetDoc(doc(db, "app_settings", "global"), newSettings, { merge: true });
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // If not logged in, show Login / Register page
  if (!currentUser) {
    return (
      <>
        <LoginView
          onLoginSuccess={(petugas) => setCurrentUser(petugas)}
          petugasList={petugasList}
          onRegister={handleRegisterPetugas}
          addToast={addToast}
        />

        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-white rounded-xl p-3 shadow-xl border border-slate-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
              {t.type === "error" && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
              {t.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
              {t.type === "info" && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
              <span className="text-xs font-semibold text-slate-800 flex-1">{t.title}</span>
              <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-600 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  // If printing, display Official Government Report view
  if (printingKegiatan || (printingKegiatanList && printingKegiatanList.length > 0)) {
    const activeList = printingKegiatanList || (printingKegiatan ? [printingKegiatan] : []);
    const mainKeg = activeList[0];
    const parentRb = rencanaBulananList.find((rb) => rb.id === mainKeg?.rencana_bulanan_id) || null;
    const parentRh = rencanaHarianList.find((rh) => rh.id === mainKeg?.rencana_harian_id) || null;
    const officer = petugasList.find((p) => p.id === mainKeg?.petugas_id) || currentUser;
    const parentLap = laporanList.find((l) => l.nomor_rhk === parentRb?.no_rhk && l.petugas_id === officer.id) || null;

    return (
      <PrintReportView
        kegiatan={mainKeg}
        kegiatanList={activeList}
        petugas={officer}
        rencanaBulanan={parentRb}
        rencanaBulananList={rencanaBulananList}
        rencanaHarian={parentRh}
        rencanaHarianList={rencanaHarianList}
        laporanTemplate={parentLap}
        laporanList={laporanList}
        petugasList={petugasList}
        appSettings={appSettings}
        onSaveAppSettings={handleSaveAppSettings}
        onUpdateProfile={handleUpdateProfile}
        onBack={() => {
          setPrintingKegiatan(null);
          setPrintingKegiatanList(null);
        }}
        addToast={addToast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        darkMode={darkMode}
        themeMode={themeMode}
        onSetThemeMode={(mode) => setThemeMode(mode)}
        onToggleDarkMode={handleToggleThemeMode}
        autoHideMenu={autoHideMenu}
        onToggleAutoHideMenu={() => setAutoHideMenu(!autoHideMenu)}
        onLogout={() => setCurrentUser(null)}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          currentModule={currentModule}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          isLicensed={isLicensed}
          isOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
        />

        {/* Main Content View */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Support Notice Banner */}
          {!isLicensed && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-6 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Bantu Developer untuk mengembangkan aplikasi ini menjadi lebih baik
                </span>
              </div>
              <button
                onClick={() => handleNavigate("lisensi")}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shrink-0"
              >
                Support
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full"
            >
              {currentModule === "home" && (
                <DashboardView
                  currentUser={currentUser}
                  kegiatanList={kegiatanList}
                  laporanList={laporanList}
                  petugasList={petugasList}
                  rencanaBulananList={rencanaBulananList}
                  onNavigate={handleNavigate}
                />
              )}

              {currentModule === "kegiatan_harian" && (
                <KegiatanHarianView
                  currentUser={currentUser}
                  kegiatanList={kegiatanList}
                  laporanList={laporanList}
                  rencanaBulananList={rencanaBulananList}
                  rencanaHarianList={rencanaHarianList}
                  petugasList={petugasList}
                  modulP2k2List={modulP2k2List}
                  appSettings={appSettings}
                  isLicensed={isLicensed}
                  limitReached={limitReached}
                  onSaveKegiatan={handleSaveKegiatan}
                  onDeleteKegiatan={handleDeleteKegiatan}
                  onPrintReport={(keg) => setPrintingKegiatan(keg)}
                  onPrintReportList={(list) => setPrintingKegiatanList(list)}
                  addToast={addToast}
                  onNavigateToLisensi={() => handleNavigate("lisensi")}
                />
              )}

              {currentModule === "cek_drive_files" && (
                <CekDriveFilesView
                  currentUser={currentUser}
                  appSettings={appSettings}
                  petugasList={petugasList}
                  addToast={addToast}
                  onNavigate={handleNavigate}
                  onSaveAppSettings={handleSaveAppSettings}
                />
              )}

              {currentModule === "rencana_bulanan" && (
                <MasterBulananView
                  currentUser={currentUser}
                  appSettings={appSettings}
                  list={rencanaBulananList}
                  onSave={handleSaveRencanaBulanan}
                  onDelete={handleDeleteRencanaBulanan}
                  addToast={addToast}
                />
              )}

              {currentModule === "rencana_harian" && (
                <MasterHarianView
                  currentUser={currentUser}
                  appSettings={appSettings}
                  list={rencanaHarianList}
                  rencanaBulananList={rencanaBulananList}
                  onSave={handleSaveRencanaHarian}
                  onDelete={handleDeleteRencanaHarian}
                  addToast={addToast}
                />
              )}

              {currentModule === "petugas" && currentUser.level === "ADMIN" && (
                <MasterPetugasView
                  list={petugasList}
                  onSave={handleSavePetugas}
                  onDelete={handleDeletePetugas}
                  addToast={addToast}
                />
              )}

              {currentModule === "laporan" && (
                <MasterLaporanView
                  currentUser={currentUser}
                  appSettings={appSettings}
                  list={laporanList}
                  rencanaBulananList={rencanaBulananList}
                  petugasList={petugasList}
                  onSave={handleSaveLaporan}
                  onDelete={handleDeleteLaporan}
                  addToast={addToast}
                />
              )}

              {currentModule === "modul_p2k2" && (
                <MasterP2K2View
                  currentUser={currentUser}
                  appSettings={appSettings}
                  list={modulP2k2List}
                  onSave={handleSaveModulP2k2}
                  onDelete={handleDeleteModulP2k2}
                  addToast={addToast}
                />
              )}

              {currentModule === "lisensi" && (
                <LisensiView
                  currentUser={currentUser}
                  isLicensed={isLicensed}
                  kegiatanCount={myKegiatanCount}
                  petugasList={petugasList}
                  lisensiList={lisensiList}
                  appSettings={appSettings}
                  onActivateLicense={handleActivateLicense}
                  onDeleteLicense={handleDeleteLicense}
                  onSaveAppSettings={handleSaveAppSettings}
                  addToast={addToast}
                />
              )}

              {currentModule === "backup_restore" && (
                <BackupRestoreView
                  currentUser={currentUser}
                  petugasList={petugasList}
                  rencanaBulananList={rencanaBulananList}
                  rencanaHarianList={rencanaHarianList}
                  kegiatanList={kegiatanList}
                  laporanList={laporanList}
                  lisensiList={lisensiList}
                  appSettings={appSettings}
                  addToast={addToast}
                />
              )}

              {currentModule === "changelog" && (
                <ChangelogView
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                />
              )}

              {currentModule === "profil" && (
                <ProfilView
                  currentUser={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                  addToast={addToast}
                />
              )}

              {currentModule === "tutorial" && (
                <InteractiveTutorialView
                  currentUser={currentUser}
                  appSettings={appSettings}
                  onNavigate={handleNavigate}
                  onStartTour={() => setShowOnboardingTour(true)}
                  addToast={addToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Onboarding Tour Modal Overlay */}
      <OnboardingTourModal
        isOpen={showOnboardingTour}
        onClose={() => setShowOnboardingTour(false)}
        currentUser={currentUser}
        onNavigate={handleNavigate}
      />

      {/* Floating Toast Alerts */}
      <div className="fixed top-4 right-4 z-[99999] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-white rounded-xl p-3 shadow-xl border border-slate-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {t.type === "error" && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            {t.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
            {t.type === "info" && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
            <span className="text-xs font-semibold text-slate-800 flex-1">{t.title}</span>
            <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-600 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
