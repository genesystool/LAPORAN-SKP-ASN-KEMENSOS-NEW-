import React, { useState } from "react";
import { Petugas } from "../types";
import {
  LayoutDashboard,
  ClipboardList,
  Database,
  CalendarDays,
  ListTodo,
  Users,
  FileText,
  Key,
  HardDrive,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  FileSearch,
  BookOpen,
} from "lucide-react";

interface SidebarProps {
  currentModule: string;
  onNavigate: (module: string) => void;
  currentUser: Petugas;
  isLicensed: boolean;
  isOpen: boolean;
  onCloseSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onNavigate,
  currentUser,
  isLicensed,
  isOpen,
  onCloseSidebar,
}) => {
  const [masterDataOpen, setMasterDataOpen] = useState(
    ["rencana_bulanan", "rencana_harian", "petugas", "laporan", "modul_p2k2"].includes(currentModule)
  );

  const isMasterActive = ["rencana_bulanan", "rencana_harian", "petugas", "laporan", "modul_p2k2"].includes(
    currentModule
  );

  const isAdmin = currentUser.level === "ADMIN";

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={onCloseSidebar}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        title="Tutup Menu"
      />

      <aside className="fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col shrink-0 border-r border-slate-800 transition-all duration-200 shadow-2xl md:shadow-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm tracking-wider">
          SKP
        </div>
        <div className="overflow-hidden">
          <span className="font-bold text-white text-base tracking-tight block truncate">
            Laporan SKP
          </span>
          <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider block">
            Versi 2.6 Online
          </span>
        </div>
      </div>

      {/* User Profile Mini Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          {currentUser.foto ? (
            <img
              src={currentUser.foto}
              alt={currentUser.nama}
              className="w-8 h-8 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase">
              {currentUser.nama.charAt(0)}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-white text-xs font-semibold truncate">{currentUser.nama}</p>
            <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser.nip}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-4 space-y-1 text-xs">
        {/* Dashboard */}
        <button
          onClick={() => onNavigate("home")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md transition-colors text-xs font-medium ${
            currentModule === "home"
              ? "bg-slate-800 text-white font-semibold"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${currentModule === "home" ? "bg-amber-500" : "bg-slate-600"}`} />
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        {/* Kegiatan Harian */}
        <button
          onClick={() => onNavigate("kegiatan_harian")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md transition-colors text-xs font-medium ${
            currentModule === "kegiatan_harian"
              ? "bg-slate-800 text-white font-semibold"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${currentModule === "kegiatan_harian" ? "bg-amber-500" : "bg-slate-600"}`} />
          <ClipboardList className="w-4 h-4" />
          <span>Kegiatan Harian</span>
        </button>

        {/* Cek File Google Drive */}
        <button
          onClick={() => onNavigate("cek_drive_files")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md transition-colors text-xs font-medium ${
            currentModule === "cek_drive_files"
              ? "bg-slate-800 text-white font-semibold"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${currentModule === "cek_drive_files" ? "bg-amber-500" : "bg-slate-600"}`} />
          <FileSearch className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-purple-200">Cek File Google Drive</span>
        </button>

        {/* Master Data Group */}
        <div>
          <button
            onClick={() => setMasterDataOpen(!masterDataOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md transition-colors text-xs font-medium ${
              isMasterActive
                ? "bg-slate-800 text-white font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${isMasterActive ? "bg-amber-500" : "bg-slate-600"}`} />
              <Database className="w-4 h-4" />
              <span>Master Data</span>
            </div>
            {masterDataOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {masterDataOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
              {currentUser.level === "ADMIN" && (
                <>
                  <button
                    onClick={() => onNavigate("rencana_bulanan")}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-[11px] ${
                      currentModule === "rencana_bulanan"
                        ? "bg-slate-800 text-indigo-300 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    Rencana Bulanan
                  </button>

                  <button
                    onClick={() => onNavigate("rencana_harian")}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-[11px] ${
                      currentModule === "rencana_harian"
                        ? "bg-slate-800 text-indigo-300 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    Rencana Harian
                  </button>

                  <button
                    onClick={() => onNavigate("petugas")}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-[11px] ${
                      currentModule === "petugas"
                        ? "bg-slate-800 text-indigo-300 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    Data Petugas
                  </button>
                </>
              )}

              <button
                onClick={() => onNavigate("laporan")}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors text-[11px] ${
                  currentModule === "laporan"
                    ? "bg-slate-800 text-indigo-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                Template Laporan
              </button>

              <button
                onClick={() => onNavigate("modul_p2k2")}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors text-[11px] ${
                  currentModule === "modul_p2k2"
                    ? "bg-slate-800 text-indigo-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                Modul P2K2
              </button>
            </div>
          )}
        </div>

        {/* Section Header */}
        <div className="pt-4 pb-1 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Pengaturan &amp; Informasi
        </div>

        {/* Tutorial Interaktif */}
        <button
          onClick={() => onNavigate("tutorial")}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md transition-colors text-xs font-medium ${
            currentModule === "tutorial"
              ? "bg-indigo-900/60 text-white font-semibold border border-indigo-700/50"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${currentModule === "tutorial" ? "bg-emerald-400" : "bg-slate-600"}`} />
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-300">Tutorial Interaktif</span>
          </div>
          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded-md border border-emerald-500/30">
            BARU
          </span>
        </button>

        {/* Perubahan Aplikasi / Catatan Rilis */}
        <button
          onClick={() => onNavigate("changelog")}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md transition-colors text-xs font-medium ${
            currentModule === "changelog"
              ? "bg-slate-800 text-white font-semibold"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${currentModule === "changelog" ? "bg-amber-500" : "bg-slate-600"}`} />
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Perubahan Aplikasi</span>
          </div>
          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold rounded-md border border-amber-500/30">
            v2.6
          </span>
        </button>

        {/* Backup & Restore Data (Admin Only) */}
        {isAdmin && (
          <button
            onClick={() => onNavigate("backup_restore")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md transition-colors text-xs font-medium ${
              currentModule === "backup_restore"
                ? "bg-slate-800 text-white font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${currentModule === "backup_restore" ? "bg-amber-500" : "bg-slate-600"}`} />
              <HardDrive className="w-4 h-4" />
              <span>Backup & Restore Data</span>
            </div>
          </button>
        )}

        {/* Lisensi Aplikasi */}
        <button
          onClick={() => onNavigate("lisensi")}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md transition-colors text-xs font-medium ${
            currentModule === "lisensi"
              ? "bg-slate-800 text-white font-semibold"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${currentModule === "lisensi" ? "bg-amber-500" : "bg-slate-600"}`} />
            <Key className="w-4 h-4" />
            <span>Lisensi Aplikasi</span>
          </div>
          {isLicensed ? (
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">
              PRO
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30">
              TRIAL
            </span>
          )}
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>FireLink Sync</span>
        <span className="font-mono text-[10px] text-amber-400">v2.6</span>
      </div>
    </aside>
    </>
  );
};
