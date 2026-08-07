import React, { useState } from "react";
import { Petugas } from "../types";
import { Menu, LogOut, Settings, Sun, Moon, Eye, EyeOff, Clock, BookOpen } from "lucide-react";

interface NavbarProps {
  currentUser: Petugas;
  darkMode: boolean;
  themeMode: "auto" | "light" | "dark";
  onSetThemeMode: (mode: "auto" | "light" | "dark") => void;
  onToggleDarkMode: () => void;
  autoHideMenu: boolean;
  onToggleAutoHideMenu: () => void;
  onLogout: () => void;
  onNavigate: (module: string) => void;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  darkMode,
  themeMode,
  onSetThemeMode,
  onToggleDarkMode,
  autoHideMenu,
  onToggleAutoHideMenu,
  onLogout,
  onNavigate,
  onToggleSidebar,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-30 shadow-xs transition-colors">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
              LAPORAN SKP ONLINE
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded border border-amber-300/50 dark:border-amber-700/50 shrink-0">
              v2.6.1
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold hidden md:block">
            Develop By Genesystool
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Realtime Connected Status Indicator */}
        <span className="hidden lg:flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Connected to Firebase
        </span>

        {/* Tutorial Interaktif Quick Button */}
        <button
          onClick={() => onNavigate("tutorial")}
          className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Buka Tutorial Interaktif & Panduan Penggunaan"
        >
          <BookOpen className="w-5 h-5" />
          <span className="hidden sm:inline">Tutorial</span>
        </button>

        {/* Dark Mode Quick Toggle Button */}
        <button
          onClick={onToggleDarkMode}
          className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          title={
            themeMode === "auto"
              ? "Mode Otomatis Siang/Malam (06:00-18:00 Terang, 18:00-06:00 Gelap) - Klik untuk ganti"
              : darkMode
              ? "Mode Gelap (Manual) - Klik untuk ganti"
              : "Mode Terang (Manual) - Klik untuk ganti"
          }
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          {themeMode === "auto" && (
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" title="Mode Otomatis Jam Berjalan" />
          )}
        </button>

        {/* Action Button */}
        <button
          onClick={() => onNavigate("kegiatan_harian")}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium shadow-xs transition-colors"
        >
          + Tambah Kegiatan
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          >
            {currentUser.foto ? (
              <img
                src={currentUser.foto}
                alt={currentUser.nama}
                className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                {currentUser.nama.charAt(0)}
              </div>
            )}

            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {currentUser.nama}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                <span>{currentUser.nip}</span>
                <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-semibold text-[9px] uppercase border border-slate-200 dark:border-slate-700">
                  {currentUser.level}
                </span>
              </div>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.nama}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{currentUser.nip}</p>
              </div>

              {/* Theme Selector */}
              <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tema Tampilan</span>
                  </span>
                  {themeMode === "auto" && (
                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
                      Auto Siang/Malam
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px]">
                  <button
                    onClick={() => onSetThemeMode("auto")}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-lg font-bold transition-all ${
                      themeMode === "auto"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                    title="Otomatis: 06:00-18:00 Terang, 18:00-06:00 Gelap"
                  >
                    <Clock className="w-3.5 h-3.5 mb-0.5 text-indigo-500" />
                    <span>Auto</span>
                  </button>

                  <button
                    onClick={() => onSetThemeMode("light")}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-lg font-bold transition-all ${
                      themeMode === "light"
                        ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                    title="Mode Terang (Siang)"
                  >
                    <Sun className="w-3.5 h-3.5 mb-0.5 text-amber-500" />
                    <span>Terang</span>
                  </button>

                  <button
                    onClick={() => onSetThemeMode("dark")}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-lg font-bold transition-all ${
                      themeMode === "dark"
                        ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                    title="Mode Gelap (Malam)"
                  >
                    <Moon className="w-3.5 h-3.5 mb-0.5 text-indigo-400" />
                    <span>Gelap</span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 px-1 leading-tight">
                  {themeMode === "auto"
                    ? "06:00–18:00 Terang • 18:00–06:00 Gelap"
                    : themeMode === "light"
                    ? "Terkunci pada Mode Terang"
                    : "Terkunci pada Mode Gelap"}
                </p>
              </div>

              {/* Autohide Menu Option */}
              <button
                onClick={() => {
                  onToggleAutoHideMenu();
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {autoHideMenu ? <EyeOff className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> : <Eye className="w-4 h-4 text-slate-500" />}
                  <span>Auto-hide Menu</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${autoHideMenu ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                  {autoHideMenu ? "AKTIF" : "NONAKTIF"}
                </span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onNavigate("profil");
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
              >
                <Settings className="w-4 h-4 text-slate-500" /> Profil Saya
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 font-semibold"
              >
                <LogOut className="w-4 h-4 text-red-500" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

