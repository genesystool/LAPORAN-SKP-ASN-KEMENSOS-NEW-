import React, { useState } from "react";
import { Petugas } from "../types";
import { Menu, LogOut, Settings, Sun, Moon, Eye, EyeOff } from "lucide-react";

interface NavbarProps {
  currentUser: Petugas;
  darkMode: boolean;
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
          <h1 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:block">
            LAPORAN SKP ONLINE
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 hidden md:block">
            Platform: <span className="text-slate-700 dark:text-slate-300 font-semibold">laporan-skp-v2.5</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Realtime Connected Status Indicator */}
        <span className="hidden lg:flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Connected to Firebase
        </span>

        {/* Dark Mode Quick Toggle Button */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          title={darkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
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
            <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.nama}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{currentUser.nip}</p>
              </div>

              {/* Mode Gelap Option */}
              <button
                onClick={() => {
                  onToggleDarkMode();
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                  <span>Mode Gelap</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? "bg-amber-500/20 text-amber-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                  {darkMode ? "ON" : "OFF"}
                </span>
              </button>

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

