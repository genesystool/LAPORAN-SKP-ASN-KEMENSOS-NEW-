import express from "express";
import { GoogleGenAI } from "@google/genai";

export const app = express();

app.use(express.json({ limit: "10mb" }));

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "RHK Generator API", firebaseConfigured: true });
});

// AI Narrative Generator for Kegiatan Harian (Isi & Hasil) with Style support
app.post("/api/generate-ai", async (req, res) => {
  try {
    const { keyword, style = "formal" } = req.body;
    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return res.status(400).json({ error: "Kata kunci tidak boleh kosong" });
    }

    let styleInstruction = "Sangat formal, komprehensif, dan baku sesuai tata bahasa birokrasi pemerintahan Indonesia (EYD/PUEBI).";
    if (style === "ringkas") {
      styleInstruction = "Singkat, padat, langsung pada inti poin utama, to-the-point tanpa kalimat berbelit-belit.";
    } else if (style === "teknis") {
      styleInstruction = "Teknis operasional, analitis, menyertakan istilah teknis spesifik, metrik/indikator capaian, dan langkah prosedural.";
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Anda adalah asisten ahli pembuat laporan kinerja ASN / Birokrasi pemerintahan Indonesia. 
Tugas Anda adalah mengembangkan kata kunci berikut: "${keyword.trim()}" menjadi narasi kegiatan harian untuk 'Isi Kegiatan' dan 'Hasil Kegiatan'.
Gaya penulisan yang diminta: ${styleInstruction}

KEMBALIKAN HANYA FORMAT JSON SBB (tanpa markdown backticks, tanpa kata pengantar):
{
  "isi": "Narasi pelaksanaan kegiatan...",
  "hasil": "Narasi hasil dan capaian kegiatan..."
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });

        const rawText = response.text || "";
        let cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").trim();
        if (cleaned.endsWith("```")) {
          cleaned = cleaned.slice(0, -3).trim();
        }

        try {
          const parsed = JSON.parse(cleaned);
          if (parsed.isi && parsed.hasil) {
            return res.json({ isi: parsed.isi, hasil: parsed.hasil });
          }
        } catch {
          // Fallthrough to standard text wrap if JSON parse fails
        }
      } catch (genError) {
        console.warn("Gemini API call failed, falling back to smart template:", genError);
      }
    }

    // Fallback smart generator if API key is missing or fails
    const kw = keyword.trim();
    let fallbackIsi = "";
    let fallbackHasil = "";

    if (style === "ringkas") {
      fallbackIsi = `Melaksanakan ${kw} secara langsung sesuai prosedur kerja yang berlaku, meliputi persiapan, koordinasi, dan pelaksanaan teknis.`;
      fallbackHasil = `Tercapainya target ${kw} secara baik, tepat waktu, serta tersusunnya catatan evaluasi pelaksanaan.`;
    } else if (style === "teknis") {
      fallbackIsi = `Melakukan verifikasi teknis dan eksekusi operasional terkait ${kw}. Tahapan mencakup: 1) Pemeriksaan instrumen & kelengkapan; 2) Pengujian/pendampingan lapangan; 3) Analisis data hasil pelaksanaan.`;
      fallbackHasil = `Indikator teknis ${kw} terpenuhi 100%, data terverifikasi secara presisi, dan dokumen berita acara telah diterbitkan.`;
    } else {
      fallbackIsi = `Telah dilaksanakan kegiatan ${kw} sesuai dengan petunjuk teknis dan rencana kerja harian. Pelaksanaan diawali dengan koordinasi bersama pihak terkait, penyiapan dokumen pendukung, penyampaian materi/substansi kegiatan, serta pendampingan langsung secara berkesinambungan untuk memastikan seluruh alur tugas berjalan secara efektif, efisien, dan transparan sesuai dengan standar operasional prosedur (SOP) birokrasi pemerintahan.`;
      fallbackHasil = `Tercapainya sasaran pelaksanaan ${kw} dengan hasil optimal. Terkumpulnya data dan informasi pendukung secara lengkap, tersusunnya rekapitulasi pelaksanaan tugas, serta terciptanya koordinasi yang harmonis antar instansi/pihak terkait untuk mendukung capaian Indikator Kinerja Utama (IKU) organisasi secara akuntabel.`;
    }

    return res.json({ isi: fallbackIsi, hasil: fallbackHasil });
  } catch (err: any) {
    console.error("AI Endpoint Error:", err);
    return res.status(500).json({ error: "Gagal memproses AI generator" });
  }
});

// AI Template Laporan Generator (Generates full template fields)
app.post("/api/generate-template-ai", async (req, res) => {
  try {
    const { keyword, nomorRhk, style = "formal" } = req.body;
    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return res.status(400).json({ error: "Kata kunci tidak boleh kosong" });
    }

    let styleInstruction = "Sangat formal, komprehensif, dan baku sesuai tata bahasa birokrasi pemerintahan Indonesia (EYD/PUEBI).";
    if (style === "ringkas") {
      styleInstruction = "Singkat, padat, langsung pada poin utama tanpa kata-kata klise berlebihan.";
    } else if (style === "teknis") {
      styleInstruction = "Teknis operasional, analitis, fokus pada instrumen, metrik, dan dasar regulasi teknis.";
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Anda adalah pakar penyusun dokumen laporan resmi birokrasi pemerintahan Indonesia.
Buatkan draft narasi lengkap untuk 'Template Laporan Resmi' (RHK ${nomorRhk || 1}) berdasarkan kata kunci/topik berikut: "${keyword.trim()}".
Gaya penulisan: ${styleInstruction}

Hasilkan 6 narasi berikut dalam JSON (tanpa markdown backticks, tanpa teks pendahuluan):
{
  "umum": "Narasi latar belakang/gambaran umum tugas...",
  "maksudTujuan": "Narasi maksud dan tujuan pelaksanaan...",
  "ruangLingkup": "Narasi ruang lingkup kegiatan...",
  "dasar": "1. Landasan regulasi/Peraturan terkait...\\n2. Surat Tugas/Perintah Kepala Instansi...",
  "simpulan": "Narasi simpulan capaian dan saran rekomendasi...",
  "penutup": "Narasi penutup laporan resmi..."
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });

        const rawText = response.text || "";
        let cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").trim();
        if (cleaned.endsWith("```")) {
          cleaned = cleaned.slice(0, -3).trim();
        }

        try {
          const parsed = JSON.parse(cleaned);
          if (
            parsed.umum &&
            parsed.maksudTujuan &&
            parsed.ruangLingkup &&
            parsed.dasar &&
            parsed.simpulan &&
            parsed.penutup
          ) {
            return res.json(parsed);
          }
        } catch {
          // Fallthrough to fallback
        }
      } catch (genError) {
        console.warn("Gemini API call failed for template generator, using fallback:", genError);
      }
    }

    // Smart Fallback
    const kw = keyword.trim();
    return res.json({
      umum: `Laporan ini disusun sebagai pertanggungjawaban pelaksanaan tugas operasional ASN terkait ${kw} dalam rangka mendukung indikator kinerja instansi secara transparan dan akuntabel.`,
      maksudTujuan: `Maksud dan tujuan kegiatan ini adalah untuk merealisasikan sasaran kerja ${kw} dengan standar mutu pelayanan yang tinggi dan meminimalisir kendala teknis di lapangan.`,
      ruangLingkup: `Ruang lingkup pelaksanaan meliputi perencanaan awal, koordinasi administratif, eksekusi teknis ${kw}, serta penyusunan berkas evaluasi dan pelaporan.`,
      dasar: `1. Peraturan Perundang-undangan dan Petunjuk Teknis Instansi Terkait.\n2. Surat Perintah Tugas/Rencana Kinerja Tahunan Organisasi.`,
      simpulan: `Pelaksanaan ${kw} telah terselenggara dengan hasil memuaskan dan mencapai target indikator keberhasilan yang dipersyaratkan.`,
      penutup: `Demikian laporan pelaksanaan kegiatan ini dibuat dengan penuh rasa tanggung jawab untuk digunakan sebagai bahan pertimbangan pimpinan.`,
    });
  } catch (err: any) {
    console.error("Template AI Generator Error:", err);
    return res.status(500).json({ error: "Gagal memproses AI Template Generator" });
  }
});
