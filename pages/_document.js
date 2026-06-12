import { Html, Head, Main, NextScript } from "next/document";

// Inline script runs before paint to prevent flash of wrong theme
const themeScript = `(function(){try{var t=localStorage.getItem('sk-theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}})()`;

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
