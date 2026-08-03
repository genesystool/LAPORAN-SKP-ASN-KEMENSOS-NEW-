import React, { useState } from "react";
import {
  KegiatanHarian,
  LaporanTemplate,
  Petugas,
  RencanaBulanan,
} from "../types";
import {
  Filter,
  Search,
  ClipboardList,
  FileText,
  Users,
  BarChart3,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface DashboardViewProps {
  currentUser: Petugas;
  kegiatanList: KegiatanHarian[];
  laporanList: LaporanTemplate[];
  petugasList: Petugas[];
  rencanaBulananList: RencanaBulanan[];
  onNavigate: (module: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  kegiatanList,
  laporanList,
  petugasList,
  rencanaBulananList,
  onNavigate,
}) => {
  const currentDate = new Date();
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
  const currentYearStr = String(currentDate.getFullYear());

  const [bulan, setBulan] = useState(currentMonthStr);
  const [tahun, setTahun] = useState(currentYearStr);

  const bulanOptions = [
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  // Filter user activities for selected Month & Year
  const myActivities = kegiatanList.filter((k) => {
    const isUserMatch =
      currentUser.level === "ADMIN" || k.petugas_id === currentUser.id;
    if (!k.tanggal) return false;
    const parts = k.tanggal.split("-");
    if (parts.length < 2) return false;
    const kYear = parts[0];
    const kMonth = parts[1];
    return isUserMatch && kMonth === bulan && kYear === tahun;
  });

  const totKegiatan = myActivities.length;

  const cleanNip = currentUser.nip ? currentUser.nip.replace(/\s+/g, "") : "";
  const myLaporan = laporanList.filter(
    (l) =>
      l.petugas_id === currentUser.id ||
      l.petugas_id === currentUser.nip ||
      (cleanNip !== "" && l.petugas_id === cleanNip)
  );
  const totLaporan = myLaporan.length;

  const totPetugasAktif = petugasList.filter((p) => p.status === "AKTIF").length;

  // Compute breakdown per RHK Bulanan
  const rhkBreakdown = rencanaBulananList.map((rb, idx) => {
    const count = myActivities.filter((k) => k.rencana_bulanan_id === rb.id).length;
    return {
      id: rb.id ? `rb_${rb.id}` : `rb_idx_${idx}`,
      no_rhk: rb.no_rhk,
      rencana_kerja: rb.rencana_kerja,
      count,
    };
  });

  const maxCount = Math.max(...rhkBreakdown.map((r) => r.count), 1);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Project Overview & Analytics</h1>
          <p className="text-xs text-slate-500">
            Rekapitulasi Capaian RHK, Laporan Kinerja, dan Status Sinkronisasi Realtime
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Filter Periode Rekapitulasi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Pilih Bulan
            </label>
            <select
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md py-2 px-3 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {bulanOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Pilih Tahun
            </label>
            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {}}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Tampilkan Ringkasan
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout with Professional Polish Styling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Metric Cards & Visual Progress */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kegiatan Bulan Ini</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ClipboardList className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{totKegiatan}</p>
              <button
                onClick={() => onNavigate("kegiatan_harian")}
                className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Lihat Detail Data &rarr;
              </button>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Template Laporan</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{totLaporan}</p>
              <button
                onClick={() => onNavigate("laporan")}
                className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                Lihat Template &rarr;
              </button>
            </div>

            {currentUser.level === "ADMIN" && (
              <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Petugas Aktif</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{totPetugasAktif}</p>
                <button
                  onClick={() => onNavigate("petugas")}
                  className="mt-3 text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1"
                >
                  Kelola Petugas &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Visual Bar Chart */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800 text-sm">
                  Grafik Capaian RHK
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Bulan {bulan}/{tahun}</span>
            </div>

            <div className="p-6">
              {rhkBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Belum ada data Rencana Bulanan.
                </p>
              ) : (
                <div className="space-y-4">
                  {rhkBreakdown.map((r) => {
                    const pct = Math.round((r.count / maxCount) * 100);
                    return (
                      <div key={r.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-slate-700">
                          <span className="truncate pr-2 font-semibold">
                            RHK {r.no_rhk}: {r.rencana_kerja.slice(0, 50)}...
                          </span>
                          <span className="text-indigo-600 font-mono font-bold">
                            {r.count} Record
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 6)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Summary Table */}
        <div className="lg:col-span-4 space-y-6">
          {/* Breakdown List Card */}
          <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              Rincian Per RHK
            </h3>
            <div className="space-y-3">
              {rhkBreakdown.map((r) => (
                <div key={r.id} className="flex items-center justify-between pb-2 border-b border-slate-100 last:border-0">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-bold text-slate-800">RHK No. {r.no_rhk}</p>
                    <p className="text-[11px] text-slate-500 truncate">{r.rencana_kerja}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-indigo-700 font-mono font-bold text-xs rounded-md shrink-0">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
