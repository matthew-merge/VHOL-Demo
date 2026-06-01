import StorePage from "./pages/StorePage";
import ConsolePage from "./pages/ConsolePage";

export default function App() {
  const isConsole = window.location.pathname.startsWith("/console");
  return isConsole ? <ConsolePage /> : <StorePage />;
}
