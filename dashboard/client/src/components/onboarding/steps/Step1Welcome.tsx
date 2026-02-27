import React, { useState, useRef } from 'react';
import { ChevronDown, Upload, X, File } from 'lucide-react';

export interface StepsProps {
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

interface UploadedFile {
  name: string;
  file: File;
}

// ── Moved OUTSIDE Step1Welcome to prevent remount on every render ──

const InputField = ({
  placeholder,
  value,
  onChange,
  className = '',
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:outline-none focus:border-gray-400 transition-colors ${className}`}
  />
);

const SelectField = ({
  placeholder,
  value,
  onChange,
  options,
  className = '',
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500 bg-white focus:outline-none focus:border-gray-400 transition-colors"
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

const FileDropZone = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
        ${dragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-white hover:border-gray-400'}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
      />
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
        <Upload className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-600 font-medium text-center">
        Choose a file or drag & drop it here.
      </p>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        className="text-xs border border-gray-300 rounded px-3 py-1 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Browse File
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────

const Step1Welcome = ({ onNext, onBack, onSubmit }: StepsProps) => {
  const [form, setForm] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    industry: '',
    websiteUrl: '',
    address: '',
    country: '',
    companySize: '',
    salesGoal: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleFileUpload = (file: File) => {
    if (uploadedFiles.length < 2) {
      setUploadedFiles((prev) => [...prev, { name: file.name, file }]);
    }
  };

  const removeFile = (index: number) =>
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="bg-background rounded-2xl border border-gray-200 p-8 w-full">
      <div className="flex gap-8">
        {/* Left Column */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Tell Us About Your Business
            </h2>
            <p className="text-sm text-gray-500">
              Provide business context to power AI calls, emails, and workflows.
            </p>
          </div>

          <InputField
            placeholder="Business Name"
            value={form.businessName}
            onChange={(v) => handleChange('businessName', v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField
              placeholder="Business email"
              value={form.businessEmail}
              onChange={(v) => handleChange('businessEmail', v)}
            />
            <InputField
              placeholder="Business phone"
              value={form.businessPhone}
              onChange={(v) => handleChange('businessPhone', v)}
            />
          </div>

          <SelectField
            placeholder="Industry Selection"
            value={form.industry}
            onChange={(v) => handleChange('industry', v)}
            options={['Technology', 'Healthcare', 'Finance', 'Retail', 'Education', 'Other']}
          />

          <InputField
            placeholder="Website URL"
            value={form.websiteUrl}
            onChange={(v) => handleChange('websiteUrl', v)}
          />

          <InputField
            placeholder="Address"
            value={form.address}
            onChange={(v) => handleChange('address', v)}
          />
        </div>
        <div className="inline-block  h-96 w-px self-stretch bg-gray-200"></div>
        {/* Right Column */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              placeholder="Country / Timezone"
              value={form.country}
              onChange={(v) => handleChange('country', v)}
              options={['UTC-5 (EST)', 'UTC-8 (PST)', 'UTC+0 (GMT)', 'UTC+1 (CET)', 'UTC+3 (EAT)']}
            />
            <SelectField
              placeholder="Company Size"
              value={form.companySize}
              onChange={(v) => handleChange('companySize', v)}
              options={['1–10', '11–50', '51–200', '201–500', '500+']}
            />
          </div>

          <textarea
            placeholder="Sales Goal  (appointments, deals closed, inbound, outbound)"
            value={form.salesGoal}
            onChange={(e) => handleChange('salesGoal', e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:outline-none focus:border-gray-400 transition-colors resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <FileDropZone onFileSelect={handleFileUpload} />
            <FileDropZone onFileSelect={handleFileUpload} />
          </div>

          {uploadedFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-white"
            >
              <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {uploadedFiles.length > 0 && (
            <p className="text-sm text-primary font-medium">
              {uploadedFiles.length} of 2 sources added
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step1Welcome;