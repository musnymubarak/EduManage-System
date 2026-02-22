import React, { useState } from 'react';
import { Upload, X, File, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  onChange?: (files: File[]) => void;
  value?: File[];
  preview?: boolean;
  className?: string;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*,.pdf,.doc,.docx',
  multiple = false,
  maxSize = 5,
  onChange,
  value = [],
  preview = true,
  className,
  error,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    // Filter files by size
    const validFiles = newFiles.filter((file) => {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSize) {
        alert(`File ${file.name} is too large. Max size is ${maxSize}MB`);
        return false;
      }
      return true;
    });

    if (multiple) {
      onChange?.([...value, ...validFiles]);
    } else {
      onChange?.(validFiles.slice(0, 1));
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange?.(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    } else if (file.type.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else {
      return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50',
          error ? 'border-red-500' : '',
          'hover:border-blue-400 hover:bg-blue-50'
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        <div className="space-y-2">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-sm text-gray-600">
            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
          </div>
          <p className="text-xs text-gray-500">
            {accept.split(',').map(ext => ext.trim()).join(', ')} (max {maxSize}MB)
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* File Preview */}
      {preview && value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border bg-white p-3"
            >
              {/* File Icon or Image Preview */}
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                getFileIcon(file)
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X size={18} className="text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// SingleImageUpload component for profile photos
interface SingleImageUploadProps {
  label?: string;
  onChange?: (file: File | null) => void;
  value?: File | string | null;
  className?: string;
  error?: string;
}

export const SingleImageUpload: React.FC<SingleImageUploadProps> = ({
  label,
  onChange,
  value,
  className,
  error,
}) => {
  const [preview, setPreview] = useState<string>('');

  React.useEffect(() => {
    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof value === 'string') {
      setPreview(value);
    } else {
      setPreview('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Check size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image must be less than 2MB');
        return;
      }

      onChange?.(file);
    }
  };

  const handleRemove = () => {
    onChange?.(null);
    setPreview('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex items-center gap-4">
        {/* Image Preview */}
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {/* Upload Button */}
        <div>
          <label
            htmlFor="image-upload"
            className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Upload size={16} />
            {preview ? 'Change Photo' : 'Upload Photo'}
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="sr-only"
          />
          <p className="mt-1 text-xs text-gray-500">
            JPG, PNG or GIF (max 2MB)
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
