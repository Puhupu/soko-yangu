import "../styles/globals.css";
import { CartProvider } from "../lib/CartContext";
import { ThemeProvider } from "../lib/ThemeContext";

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </ThemeProvider>
  );
}