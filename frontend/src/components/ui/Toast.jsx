import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext({ toast: () => {} });

/** Lightweight toast notifications: `const { toast } = useToast(); toast('Saved', 'success')`. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const toast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-wrap" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`ui-toast ${t.type}`}>
            <span aria-hidden="true">{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : '💬'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
