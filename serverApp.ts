import express from "express";
import { GoogleGenAI } from "@google/genai";

export const app = express();

app.use(express.json({ limit: "50mb" }));

// Google Drive Apps Script Upload Proxy (Guarantees bypass of browser CORS & hosting restrictions)
app.post("/api/upload-drive-webhook", async (req, res) => {
  try {
    const { webhookUrl, fileName, folderId, base64Data, mimeType } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
      return res.status(400).json({ error: "URL Webhook Google Apps Script belum diisi." });
    }
    if (!base64Data || typeof base64Data !== "string") {
      return res.status(400).json({ error: "Data file Base64 tidak ditemukan." });
    }

    let url = webhookUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    if (!url.includes("script.google.com")) {
      return res.status(400).json({
        error: "URL Webhook tidak valid. URL Apps Script harus berawalan 'https://script.google.com/macros/s/.../exec'.",
      });
    }

    // Clean base64 string if data URL prefix exists
    let cleanBase64 = base64Data;
    if (cleanBase64.indexOf(",") > -1) {
      cleanBase64 = cleanBase64.split(",")[1];
    }

    const payload = JSON.stringify({
      action: "uploadFile",
      filename: fileName || "Laporan_SKP.pdf",
      fileName: fileName || "Laporan_SKP.pdf",
      folderId: folderId || "root",
      fileData: cleanBase64,
      mimeType: mimeType || "application/pdf",
      base64Data: cleanBase64,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload,
      redirect: "follow",
    });

    const text = await response.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      if (
        text.includes("Google Drive") ||
        text.includes("doctype html") ||
        text.includes("<!DOCTYPE")
      ) {
        return res.status(502).json({
          error:
            "Koneksi Google Apps Script gagal. Pastikan Web App disetel dengan Akses: 'Siapa saja (Anyone)' dan Publikasikan Ulang Versi Baru (New Version).",
        });
      }
      return res.status(502).json({
        error: "Respon dari Google Apps Script tidak valid. Pastikan URL Webhook benar.",
      });
    }

    if (json?.status === "success" || json?.fileUrl || json?.fileId) {
      return res.json({
        status: "success",
        fileId: json.fileId || "webhook-" + Date.now(),
        fileName: json.fileName || fileName,
        fileUrl: json.fileUrl,
      });
    }

    if (json?.message) {
      return res.status(400).json({ error: `Google Apps Script Error: ${json.message}` });
    }

    return res.status(500).json({ error: "Gagal mengunggah file via Webhook Apps Script." });
  } catch (err: any) {
    console.error("Upload Drive Webhook Proxy Error:", err);
    return res.status(500).json({
      error: err?.message || "Gagal terhubung ke URL Webhook Apps Script. Periksa koneksi internet Anda.",
    });
  }
});

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
  "isi": "<p>Narasi pelaksanaan kegiatan...</p>",
  "hasil": "<p>Narasi hasil dan capaian kegiatan...</p>"
}`;

        // Try primary model gemini-3.6-flash first, then fallback to gemini-flash-latest
        let responseText = "";
        try {
          const resAI = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
          });
          responseText = resAI.text || "";
        } catch (m1Err) {
          console.warn("gemini-3.6-flash failed, trying gemini-flash-latest:", m1Err);
          const resAI2 = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
          });
          responseText = resAI2.text || "";
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.isi && parsed.hasil) {
            return res.json({ isi: parsed.isi, hasil: parsed.hasil });
          }
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
      fallbackIsi = `<p>Melaksanakan <strong>${kw}</strong> secara langsung sesuai prosedur kerja yang berlaku, meliputi tahap persiapan, koordinasi lintas sektor, dan pelaksanaan teknis di lapangan.</p>`;
      fallbackHasil = `<p>Tercapainya target <strong>${kw}</strong> secara baik, tepat waktu, serta tersusunnya dokumen laporan dan catatan evaluasi pelaksanaan tugas.</p>`;
    } else if (style === "teknis") {
      fallbackIsi = `<p>Melakukan verifikasi teknis dan eksekusi operasional terkait <strong>${kw}</strong>.</p><p>Tahapan pelaksanaan mencakup:</p><ol><li>Pemeriksaan instrumen &amp; kelengkapan administrasi;</li><li>Pengujian dan pendampingan lapangan;</li><li>Analisis data serta rekapitulasi hasil pelaksanaan.</li></ol>`;
      fallbackHasil = `<p>Indikator teknis <strong>${kw}</strong> terpenuhi 100%, data terverifikasi secara presisi, dan dokumen berita acara kegiatan telah diterbitkan.</p>`;
    } else {
      fallbackIsi = `<p>Telah dilaksanakan kegiatan <strong>${kw}</strong> sesuai dengan petunjuk teknis dan rencana kerja harian.</p><p>Pelaksanaan diawali dengan koordinasi bersama pihak terkait, penyiapan dokumen pendukung, penyampaian materi/substansi kegiatan, serta pendampingan langsung secara berkesinambungan untuk memastikan seluruh alur tugas berjalan secara efektif, efisien, dan transparan sesuai dengan Standar Operasional Prosedur (SOP) birokrasi pemerintahan.</p>`;
      fallbackHasil = `<p>Tercapainya sasaran pelaksanaan <strong>${kw}</strong> dengan hasil optimal.</p><p>Terkumpulnya data dan informasi pendukung secara lengkap, tersusunnya rekapitulasi pelaksanaan tugas, serta terciptanya koordinasi yang harmonis antar instansi/pihak terkait untuk mendukung capaian Indikator Kinerja Utama (IKU) organisasi secara akuntabel.</p>`;
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

Hasilkan 6 narasi berikut dalam format JSON murni (tanpa markdown backticks, tanpa teks pendahuluan):
{
  "umum": "<p>Narasi latar belakang/gambaran umum tugas...</p>",
  "maksudTujuan": "<p>Narasi maksud dan tujuan pelaksanaan...</p>",
  "ruangLingkup": "<p>Narasi ruang lingkup kegiatan...</p>",
  "dasar": "<ol><li>Peraturan perundang-undangan...</li><li>Surat Tugas / RHK...</li></ol>",
  "simpulan": "<p>Narasi simpulan capaian dan saran rekomendasi...</p>",
  "penutup": "<p>Narasi penutup laporan resmi...</p>"
}`;

        let responseText = "";
        try {
          const resAI = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
          });
          responseText = resAI.text || "";
        } catch (m1Err) {
          console.warn("gemini-3.6-flash failed for template generator, trying gemini-flash-latest:", m1Err);
          const resAI2 = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
          });
          responseText = resAI2.text || "";
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
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
        }
      } catch (genError) {
        console.warn("Gemini API call failed for template generator, using fallback:", genError);
      }
    }

    // Smart Fallback
    const kw = keyword.trim();
    return res.json({
      umum: `<p>Laporan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas operasional ASN terkait <strong>${kw}</strong> dalam rangka mendukung pencapaian indikator kinerja instansi secara transparan, akuntabel, dan profesional.</p>`,
      maksudTujuan: `<p>Maksud dan tujuan pelaksanaan kegiatan ini adalah untuk merealisasikan sasaran kerja <strong>${kw}</strong> dengan standar mutu pelayanan publik yang tinggi serta meminimalisir kendala teknis operasional di lapangan.</p>`,
      ruangLingkup: `<p>Ruang lingkup pelaksanaan tugas mencakup tahap perencanaan awal, koordinasi administratif antar unit, eksekusi teknis operasional <strong>${kw}</strong>, serta penyusunan berkas evaluasi dan pelaporan resmi.</p>`,
      dasar: `<ol><li>Peraturan Perundang-undangan dan Petunjuk Teknis Instansi yang berlaku;</li><li>Surat Perintah Tugas dan Rencana Kinerja Tahunan (RHK ${nomorRhk || 1}) Organisasi.</li></ol>`,
      simpulan: `<p>Pelaksanaan tugas <strong>${kw}</strong> telah terselenggara dengan hasil optimal dan berhasil mencapai target indikator keberhasilan yang dipersyaratkan oleh instansi.</p>`,
      penutup: `<p>Demikian laporan pelaksanaan kegiatan ini dibuat dengan penuh rasa tanggung jawab untuk dipergunakan sebagaimana mestinya dan sebagai bahan pertimbangan pimpinan.</p>`,
    });
  } catch (err: any) {
    console.error("Template AI Generator Error:", err);
    return res.status(500).json({ error: "Gagal memproses AI Template Generator" });
  }
});
