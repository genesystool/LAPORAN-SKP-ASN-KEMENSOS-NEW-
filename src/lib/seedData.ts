import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Petugas, RencanaBulanan, RencanaHarian, LaporanTemplate, KegiatanHarian, ModulP2K2 } from "../types";

export async function seedInitialFirestoreData() {
  try {
    // Check if initial seeding has already been completed once in this Firestore database
    const seedRef = doc(db, "app_settings", "seed_status");
    const seedSnap = await getDoc(seedRef);
    if (seedSnap.exists() && seedSnap.data()?.isSeeded) {
      // Already seeded once; do not re-inject initial data even if collections become empty
      return;
    }

    // 1. Check & Seed Petugas
    const petugasSnap = await getDocs(collection(db, "petugas"));
    if (petugasSnap.empty) {
      const adminDoc: Petugas = {
        id: "petugas_admin",
        nip: "admin",
        nama: "Administrator",
        password: "@Mautauaja1",
        level: "ADMIN",
        status: "AKTIF",
        foto: "",
        scan_ttd: "",
        createdAt: new Date().toISOString(),
      };

      const defaultPetugas: Petugas[] = [
        adminDoc,
        {
          id: "petugas_user1",
          nip: "1995050512345678",
          nama: "Siti Nurhaliza, S.STP",
          password: "user",
          level: "USER",
          status: "AKTIF",
          foto: "",
          scan_ttd: "",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const p of defaultPetugas) {
        await setDoc(doc(db, "petugas", p.id), p);
      }
    } else {
      // If petugas collection exists, ensure admin exists without overwriting existing profiles
      const hasAdmin = petugasSnap.docs.some(
        (d) => d.data()?.nip === "admin" || d.id === "petugas_admin"
      );
      if (!hasAdmin) {
        const adminDoc: Petugas = {
          id: "petugas_admin",
          nip: "admin",
          nama: "Administrator",
          password: "@Mautauaja1",
          level: "ADMIN",
          status: "AKTIF",
          foto: "",
          scan_ttd: "",
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "petugas", "petugas_admin"), adminDoc);
      }
    }

    // 2. Check & Seed Rencana Bulanan
    const rbSnap = await getDocs(collection(db, "rencana_bulanan"));
    let rbId1 = "rb_1";
    let rbId2 = "rb_2";

    if (rbSnap.empty) {
      const defaultRB: RencanaBulanan[] = [
        {
          id: rbId1,
          no_rhk: 1,
          rencana_kerja: "Meningkatnya Kualitas Pendampingan dan Verifikasi Lapangan Program Layanan Operasional",
          createdAt: new Date().toISOString(),
        },
        {
          id: rbId2,
          no_rhk: 2,
          rencana_kerja: "Tersusunnya Laporan Rekapitulasi Evaluasi dan Dokumentasi Kegiatan Pelayanan Publik",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const rb of defaultRB) {
        await setDoc(doc(db, "rencana_bulanan", rb.id), rb);
      }
    } else {
      rbId1 = rbSnap.docs[0].id;
      if (rbSnap.docs.length > 1) rbId2 = rbSnap.docs[1].id;
    }

    // 3. Check & Seed Rencana Harian
    const rhSnap = await getDocs(collection(db, "rencana_harian"));
    if (rhSnap.empty) {
      const defaultRH: RencanaHarian[] = [
        {
          id: "rh_1",
          norhkharian: 1,
          rencana_harian: "Melakukan koordinasi awal dengan perangkat desa terkait jadwal verifikasi lapangan",
          rencana_kerja_bulanan_id: rbId1,
          createdAt: new Date().toISOString(),
        },
        {
          id: "rh_2",
          norhkharian: 2,
          rencana_harian: "Melaksanakan peninjauan dan wawancara langsung kepada warga penerima manfaat",
          rencana_kerja_bulanan_id: rbId1,
          createdAt: new Date().toISOString(),
        },
        {
          id: "rh_3",
          norhkharian: 3,
          rencana_harian: "Menyusun rekapitulasi data hasil monitoring dan evaluasi mingguan",
          rencana_kerja_bulanan_id: rbId2,
          createdAt: new Date().toISOString(),
        },
      ];

      for (const rh of defaultRH) {
        await setDoc(doc(db, "rencana_harian", rh.id), rh);
      }
    }

    // 4. Check & Seed Template Laporan
    const lapSnap = await getDocs(collection(db, "laporan"));
    if (lapSnap.empty) {
      const defaultLap: LaporanTemplate[] = [
        {
          id: "lap_1",
          nomor_rhk: 1,
          petugas_id: "petugas_user1",
          umum: "<p>Laporan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas operasional ASN dalam rangka meningkatkan akuntabilitas dan efektivitas pelayanan publik.</p>",
          maksud_tujuan: "<p>Maksud kegiatan ini adalah untuk memastikan seluruh tahapan pendampingan berjalan sesuai standar operational baku dan mencapai target kinerja yang ditetapkan.</p>",
          ruang_lingkup: "<p>Ruang lingkup laporan meliputi persiapan administrasi, koordinasi instansi, serta verifikasi lapangan di wilayah kerja.</p>",
          dasar: "<p>1. Peraturan Menteri tentang Standar Pelayanan Operasional.<br>2. Surat Perintah Tugas Kepala Dinas/Instansi.</p>",
          kegiatan: "<p>Pelaksanaan koordinasi, verifikasi data, dan wawancara langsung bersama pemangku kepentingan.</p>",
          hasil_capaian: "<p>Tercapainya validasi data 100% serta tersusunnya rekomendasi perbaikan layanan.</p>",
          simpulan: "<p>Kegiatan pendampingan telah terlaksana dengan lancar dan memberikan kontribusi positif bagi indikator kinerja organisasi.</p>",
          penutup: "<p>Demikian laporan pelaksanaan kegiatan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya</p>",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const l of defaultLap) {
        await setDoc(doc(db, "laporan", l.id), l);
      }
    }

    // 5. Check & Seed Kegiatan Harian
    const khSnap = await getDocs(collection(db, "kegiatan_harian"));
    if (khSnap.empty) {
      const todayStr = new Date().toISOString().split("T")[0];
      const defaultKH: KegiatanHarian[] = [
        {
          id: "kh_1",
          tanggal: todayStr,
          haritglkegiatan: "Selasa",
          waktu: "08:30 - 12:00 WIB",
          tempat: "Kantor Desa / Balai Pertemuan",
          desa: "Kualasimpang",
          rencana_bulanan_id: rbId1,
          rencana_harian_id: "rh_1",
          isi_kegiatan: "Telah dilaksanakan rapat koordinasi bersama perangkat desa dan pendamping lapangan dalam rangka verifikasi berkas dan validasi penerima bantuan sosial.",
          hasil: "Terverifikasinya 25 berkas calon penerima manfaat secara lengkap dan tersusunnya berita acara kesepakatan bersama.",
          foto_kegiatan1: [],
          petugas_id: "petugas_user1",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const kh of defaultKH) {
        await setDoc(doc(db, "kegiatan_harian", kh.id), kh);
      }
    }

    // 6. Check & Seed Modul P2K2
    const p2k2Snap = await getDocs(collection(db, "modul_p2k2"));
    if (p2k2Snap.empty) {
      const defaultP2K2: ModulP2K2[] = [
        {
          id: "p2k2_m1",
          kode_modul: "M1",
          nama_modul: "Modul 1: Pengasuhan dan Pendidikan Anak",
          jumlah_sesi: 4,
          deskripsi: "Meningkatkan pengetahuan dan keterampilan orang tua dalam membimbing, mengasuh, dan membantu keberhasilan pendidikan anak.",
          materi_sesi: "Sesi 1: Menjadi Orang Tua yang Lebih Baik\nSesi 2: Memahami Perilaku Anak\nSesi 3: Memahami Cara Anak Usia Dini Belajar\nSesi 4: Membantu Anak Sukses di Sekolah",
          link_materi: "https://drive.google.com",
          createdAt: new Date().toISOString(),
        },
        {
          id: "p2k2_m2",
          kode_modul: "M2",
          nama_modul: "Modul 2: Pengelolaan Keuangan dan Perencanaan Usaha",
          jumlah_sesi: 3,
          deskripsi: "Edukasi strategi keuangan rumah tangga, perencanaan anggaran, kecermatan berutang, serta keterampilan merintis usaha mandiri.",
          materi_sesi: "Sesi 5: Mengelola Keuangan Keluarga\nSesi 6: Cermat Meminjam dan Menabung\nSesi 7: Memulai Usaha",
          link_materi: "https://drive.google.com",
          createdAt: new Date().toISOString(),
        },
        {
          id: "p2k2_m3",
          kode_modul: "M3",
          nama_modul: "Modul 3: Kesehatan dan Gizi",
          jumlah_sesi: 3,
          deskripsi: "Meningkatkan kesadaran pemenuhan gizi 1000 HPK (Hari Pertama Kehidupan), kebersihan diri, sanitasi lingkungan, serta akses fasilitas kesehatan.",
          materi_sesi: "Sesi 8: Pentingnya Gizi dan Layanan Kesehatan Ibu Hamil\nSesi 9: Pentingnya Gizi untuk Ibu Menyusui dan Balita\nSesi 10: Kesakitan pada Anak dan Kebersihan Lingkungan",
          link_materi: "https://drive.google.com",
          createdAt: new Date().toISOString(),
        },
        {
          id: "p2k2_m4",
          kode_modul: "M4",
          nama_modul: "Modul 4: Perlindungan Anak",
          jumlah_sesi: 2,
          deskripsi: "Pencegahan tindak kekerasan, perlakuan salah, penelantaran, serta eksploitasi terhadap anak dalam keluarga dan masyarakat.",
          materi_sesi: "Sesi 11: Pencegahan Kekerasan dan Perlakuan Salah Pada Anak\nSesi 12: Pencegahan Penelantaran dan Eksploitasi Anak",
          link_materi: "https://drive.google.com",
          createdAt: new Date().toISOString(),
        },
        {
          id: "p2k2_m5",
          kode_modul: "M5",
          nama_modul: "Modul 5: Kesejahteraan Sosial (Disabilitas & Lansia)",
          jumlah_sesi: 2,
          deskripsi: "Meningkatkan kepedulian dan pemenuhan hak-hak penyandang disabilitas berat serta pelayanan dan penghormatan bagi lansia.",
          materi_sesi: "Sesi 13: Pelayanan Bagi Penyandang Disabilitas Berat\nSesi 14: Hak-Hak Lansia dan Pelayanan Lansia",
          link_materi: "https://drive.google.com",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const p of defaultP2K2) {
        await setDoc(doc(db, "modul_p2k2", p.id), p);
      }
    }

    // Flag database as seeded so subsequent page refreshes never re-inject deleted dummy data
    await setDoc(seedRef, { isSeeded: true, seededAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error("Firestore seeding error:", err);
  }
}
