import { createContext, useContext, useEffect, useState } from "react";

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sk-theme");
    const isDark = saved !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("sk-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
