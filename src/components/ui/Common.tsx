import React from 'react';
import { LucideIcon, X, ChevronLeft } from 'lucide-react';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', icon: Icon, className = '', ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow focus:ring-blue-500 border border-transparent",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm focus:ring-slate-500",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-red-500 border border-transparent",
    outline: "border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700 focus:ring-slate-400",
    ghost: "hover:bg-slate-100 text-slate-600 hover:text-slate-900 bg-transparent"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {Icon && <Icon className={`mr-2 ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />}
      {children}
    </button>
  );
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  // Safely handle numeric NaN values which React warns about when passed to `value`
  const { value, ...rest } = props as any;
  let safeValue: any = value;
  if (typeof safeValue === 'number') {
    if (isNaN(safeValue)) safeValue = '';
    else safeValue = String(safeValue);
  } else if (typeof safeValue === 'undefined') {
    safeValue = undefined;
  } else {
    // ensure non-number values are strings
    safeValue = safeValue != null ? String(safeValue) : '';
  }

  const inputProps: any = { ...rest };
  if (typeof safeValue !== 'undefined') inputProps.value = safeValue;

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>}
      <input
        className={`flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 transition-all shadow-sm ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`}
        {...inputProps}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

// --- TEXTAREA ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>}
    <textarea
      className={`flex min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 transition-all shadow-sm ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>}
    <div className="relative">
      <select
        className={`flex h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 transition-all shadow-sm ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  </div>
);

// --- CARD ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, ...props }) => (
  <div className={`rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm ${className}`} {...props}>
    {title && (
      <div className="flex flex-col space-y-1.5 p-6 border-b border-slate-100">
        <h3 className="font-semibold text-lg leading-none tracking-tight text-slate-900">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  full?: boolean; // render full-screen overlay
  showBack?: boolean; // show a Back button in header which calls onClose
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, full = false, showBack = false }) => {
  if (!isOpen) return null;
  const outerCls = "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200";
  const innerCls = full
    ? "w-full h-full max-w-none rounded-none bg-white shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden"
    : "w-full max-w-lg rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100";
  const bodyCls = full ? "p-4 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar" : "p-6 max-h-[70vh] overflow-y-auto custom-scrollbar";

  return (
    <div className={outerCls}>
      <div className={innerCls}>
        <div className={`flex items-center ${showBack ? 'justify-start' : 'justify-between'} border-b border-slate-100 p-5`}>
          {showBack ? (
            <div className="flex items-center gap-3 w-full">
              <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 text-slate-500 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        <div className={bodyCls}>
          {children}
        </div>
        {footer && <div className="border-t border-slate-100 p-4 bg-slate-50/50 rounded-b-xl flex justify-end space-x-3">{footer}</div>}
      </div>
    </div>
  );
};

// --- TABLE ---
export const Table: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
  <div className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {children}
        </tbody>
      </table>
    </div>
  </div>
);

// --- SWITCH ---
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}
export const Switch: React.FC<SwitchProps> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`${checked ? 'bg-blue-600' : 'bg-slate-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
  >
    <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm`} />
  </button>
);

// --- SOFT LOADER ---
interface SoftLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const SoftLoader: React.FC<SoftLoaderProps> = ({ size = 'md', text }) => {
  const dims = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`rounded-full ${dims} bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 animate-[pulse_1.6s_ease-in-out_infinite] shadow-inner`} />
      {text && <div className="text-sm text-slate-500 mt-2">{text}</div>}
    </div>
  );
};

// --- SKELETON / PLACEHOLDER ---
interface SkeletonProps {
  variant?: 'text' | 'input' | 'card' | 'tableRow';
  lines?: number;
  colSpan?: number;
}

export const Skeleton: React.FC<SkeletonProps> = (props) => {
  const { variant = 'text', lines = 1, colSpan } = props;
  if (variant === 'input') {
    return <div className="animate-pulse"><div className="h-10 rounded-md bg-slate-200 w-full" /></div>;
  }
  if (variant === 'card') {
    return (
      <div className="animate-pulse space-y-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="h-4 bg-slate-200 rounded w-3/5" />
        <div className="h-2 bg-slate-200 rounded w-1/2" />
        <div className="h-40 bg-slate-100 rounded" />
      </div>
    );
  }
  if (variant === 'tableRow') {
    if (colSpan && typeof colSpan === 'number') {
      return (
        <>
          {Array.from({ length: lines }).map((_, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td colSpan={colSpan} className="text-center py-6"><div className="h-3 bg-slate-200 rounded w-3/4 mx-auto animate-pulse" /></td>
            </tr>
          ))}
        </>
      );
    }
    return (
      <>
        {Array.from({ length: lines }).map((_, i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="py-3 px-3"><div className="h-3 bg-slate-200 rounded w-24 animate-pulse" /></td>
            <td className="py-3 px-3"><div className="h-3 bg-slate-200 rounded w-48 animate-pulse" /></td>
            <td className="py-3 px-3"><div className="h-3 bg-slate-200 rounded w-20 animate-pulse ml-auto" /></td>
            <td className="py-3 px-3"><div className="h-3 bg-slate-200 rounded w-16 animate-pulse ml-auto" /></td>
          </tr>
        ))}
      </>
    );
  }
  // text
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-slate-200 rounded w-full animate-pulse" />
      ))}
    </div>
  );
};