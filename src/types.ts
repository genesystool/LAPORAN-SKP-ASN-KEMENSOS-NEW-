export type UserLevel = 'ADMIN' | 'USER';
export type UserStatus = 'AKTIF' | 'TIDAK';

export interface Petugas {
  id: string;
  nip: string;
  nama: string;
  password?: string;
  level: UserLevel;
  status: UserStatus;
  foto?: string;
  scan_ttd?: string;
  tempat_dibuat?: string;
  drive_link?: string;
  createdAt?: string;
}

export interface RencanaBulanan {
  id: string;
  no_rhk: number;
  rencana_kerja: string;
  createdAt?: string;
}

export interface RencanaHarian {
  id: string;
  norhkharian: number;
  rencana_harian: string;
  rencana_kerja_bulanan_id: string;
  createdAt?: string;
}

export interface LaporanTemplate {
  id: string;
  nomor_rhk: number;
  petugas_id: string;
  umum: string;
  maksud_tujuan: string;
  ruang_lingkup: string;
  dasar: string;
  kegiatan: string;
  hasil_capaian: string;
  simpulan: string;
  penutup: string;
  createdAt?: string;
}

export interface KegiatanHarian {
  id: string;
  tanggal: string; // YYYY-MM-DD
  haritglkegiatan: string; // e.g. "Senin"
  waktu: string;
  tempat: string;
  desa: string;
  rencana_bulanan_id: string;
  rencana_harian_id: string;
  modul_p2k2_id?: string;
  isi_kegiatan: string;
  hasil: string;
  foto_kegiatan1: string[]; // array of photo urls / data strings
  petugas_id: string;
  createdAt?: string;
}

export interface Lisensi {
  id: string;
  kode: string;
  nip: string;
  petugas_id: string;
  tanggal_aktivasi: string;
  tanggal_kedaluwarsa: string | null;
}

export interface ModulP2K2 {
  id: string;
  kode_modul: string;
  nama_modul: string;
  kategori?: string;
  jumlah_sesi: number;
  deskripsi: string;
  materi_sesi?: string;
  link_materi?: string;
  createdAt?: string;
}

export interface FeaturePermissions {
  disableUserAdd?: boolean;        // Matikan tombol Tambah / Input Data Baru untuk User
  disableUserEdit?: boolean;       // Matikan tombol Edit untuk User
  disableUserDelete?: boolean;     // Matikan tombol Hapus untuk User
  disableUserPrintPdf?: boolean;   // Matikan tombol Cetak / Export PDF untuk User
  disableUserUploadDrive?: boolean; // Matikan tombol Upload / Simpan ke Drive untuk User
  disableUserCopyTemplate?: boolean; // Matikan tombol Salin Template untuk User
}

export interface CoffeePackage {
  id: string;
  title: string;
  badge?: string;
  icon?: "coffee" | "clock" | "infinity" | "sparkles" | "gift";
  descriptionList: string[];
  priceLabel?: string;
  priceValue: string;
  pricePeriod?: string;
  buttonText: string;
  popular?: boolean;
  enabled?: boolean;
  gradient?: string;
  contactUrl?: string;
}

export interface AppSettings {
  id?: string;
  kop_surat_url?: string;
  kop_mode?: "image" | "text" | "auto";
  instansi_header?: string;
  sub_header?: string;
  alamat_header?: string;
  kop_margin_top?: number;
  kop_margin_bottom?: number;
  shared_drive_link?: string;
  apps_script_url?: string;
  feature_permissions?: FeaturePermissions;
  show_coffee_packages?: boolean;
  coffee_packages?: CoffeePackage[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
}
