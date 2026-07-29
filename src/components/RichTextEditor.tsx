import React, { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RemoveFormatting,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Palette,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Ketik teks di sini...",
  minHeight = "120px",
  className = "",
  label,
  required = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Sync value to innerHTML when value changes externally (e.g., AI generate or form reset)
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === "<br>" ? "" : html);
    }
  };

  const execCommand = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
  };

  const colors = [
    { name: "Default (Gelap)", value: "#1e293b" },
    { name: "Biru Resmi", value: "#1d4ed8" },
    { name: "Hijau Sukses", value: "#15803d" },
    { name: "Merah Peringatan", value: "#b91c1c" },
    { name: "Abu-abu Muted", value: "#64748b" },
  ];

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={`bg-white border rounded-xl overflow-hidden transition-all shadow-2xs ${
          isFocused
            ? "border-sky-500 ring-2 ring-sky-100"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        {/* CKEditor-Style Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-2 py-1.5 flex flex-wrap items-center gap-1 text-slate-700 select-none">
          {/* Text Style Commands */}
          <button
            type="button"
            onClick={() => execCommand("bold")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Tebal (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("italic")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Miring (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("underline")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Garis Bawah (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => execCommand("insertUnorderedList")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Daftar Simbol (Bullet List)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("insertOrderedList")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Daftar Angka (Numbered List)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => execCommand("justifyLeft")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Rata Kiri"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("justifyCenter")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Rata Tengah"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("justifyRight")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Rata Kanan"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("justifyFull")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Rata Kiri Kanan (Justify)"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<h3>")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 text-xs font-bold"
            title="Judul Kecil (Sub-Heading)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<h2>")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 text-xs font-bold"
            title="Judul Utama"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<p>")}
            className="px-2 py-0.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 text-[11px] font-semibold"
            title="Paragraf Biasa"
          >
            Paragraf
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Color Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 flex items-center gap-1"
              title="Warna Teks"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-lg rounded-xl p-2 z-20 w-36 space-y-1">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      execCommand("foreColor", c.value);
                      setShowColorPicker(false);
                    }}
                    className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded text-[11px] font-medium flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300 inline-block shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Undo / Redo / Clear */}
          <button
            type="button"
            onClick={() => execCommand("undo")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Urungkan (Undo)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("redo")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Ulangi (Redo)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("removeFormat")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Hapus Format Teks"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="relative p-3">
          {(!value || value === "<br>" || value.trim() === "") && (
            <div className="absolute top-3 left-3 text-slate-400 text-xs pointer-events-none italic">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setShowColorPicker(false);
            }}
            style={{ minHeight }}
            className="outline-none text-xs text-slate-800 leading-relaxed max-w-none prose prose-slate focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
