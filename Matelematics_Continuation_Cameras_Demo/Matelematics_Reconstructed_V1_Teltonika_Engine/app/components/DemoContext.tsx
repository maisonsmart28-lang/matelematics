"use client";

import { createContext, useContext, useState, ReactNode } from "react";

const DemoModalContext = createContext({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export const DemoModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <DemoModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </DemoModalContext.Provider>
  );
};

export const useDemoModal = () => useContext(DemoModalContext);