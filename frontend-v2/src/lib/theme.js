import { useState } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState(() =>
    localStorage.getItem('theme') ||
    (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  );

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { theme, setTheme };
}
