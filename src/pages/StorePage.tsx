import TopBar from "../components/store/TopBar";
import AcmeNav from "../components/store/AcmeNav";
import AcmeLocations from "../components/store/AcmeLocations";
import ChatWidget from "../components/store/ChatWidget";

export default function StorePage() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-100 text-neutral-900">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <AcmeNav />
        <main className="flex-1 overflow-y-auto">
          <AcmeLocations />
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}
