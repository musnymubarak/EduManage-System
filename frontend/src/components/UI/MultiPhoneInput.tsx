import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Phone } from 'lucide-react';
import { Button } from './Button';

interface MultiPhoneInputProps {
  label: string;
  name: string;
  initialValues?: string[];
  placeholder?: string;
  required?: boolean;
}

export const MultiPhoneInput: React.FC<MultiPhoneInputProps> = ({
  label,
  name,
  initialValues = [],
  placeholder = "+94 7X XXX XXXX",
  required = false
}) => {
  const [phones, setPhones] = useState<string[]>(initialValues.length > 0 ? initialValues : ['']);

  useEffect(() => {
    if (initialValues && initialValues.length > 0) {
      // Only update if the values are actually different to prevent state reset on re-render
      if (JSON.stringify(phones) !== JSON.stringify(initialValues)) {
        setPhones(initialValues);
      }
    }
  }, [initialValues]);

  const handleAdd = () => {
    setPhones([...phones, '']);
  };

  const handleRemove = (index: number) => {
    const newPhones = phones.filter((_, i) => i !== index);
    if (newPhones.length === 0) {
      setPhones(['']);
    } else {
      setPhones(newPhones);
    }
  };

  const handleChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={handleAdd}
          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          <Plus size={12} /> Add Number
        </button>
      </div>
      
      <div className="space-y-2">
        {phones.map((phone, index) => (
          <div key={index} className="flex gap-2 group">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="text"
                name={name}
                value={phone}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={placeholder}
                required={required && index === 0}
                className="w-full pl-10 pr-4 h-11 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
              />
            </div>
            {phones.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleRemove(index)}
                className="h-11 w-11 p-0 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-all border border-gray-100 shrink-0"
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
