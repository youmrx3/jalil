import { useEffect } from "react";
import { useApp } from "./store";

export function useThemeSync() {
  const theme = useApp((s) => s.settings.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);
}
