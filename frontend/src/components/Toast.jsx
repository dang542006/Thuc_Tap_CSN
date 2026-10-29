import { Check, CircleAlert, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;
  const Icon = type === 'error' ? CircleAlert : Check;
  return <div className={`toast toast-${type}`} role={type === 'error' ? 'alert' : 'status'}><Icon size={17} /><span>{message}</span><button onClick={onClose} aria-label="Đóng thông báo"><X size={15} /></button></div>;
}
