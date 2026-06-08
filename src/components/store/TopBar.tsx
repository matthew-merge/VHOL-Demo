import { Search, Bell, Store } from "lucide-react";

export default function TopBar() {
  return (
    <header className="flex items-center gap-4 bg-neutral-900 text-white px-4 h-14 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 font-semibold shrink-0">
        <span className="grid place-items-center w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-violet-500">
          <Store className="w-4 h-4" />
        </span>
        <span className="text-[15px]">Acme&nbsp;Co</span>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2 w-full max-w-xl bg-neutral-800 border border-neutral-700 rounded-lg px-3 h-9 text-neutral-400">
          <Search className="w-4 h-4" />
          <span className="text-sm flex-1">Search</span>
          <kbd className="text-[11px] bg-neutral-700 rounded px-1.5 py-0.5 text-neutral-300">⌘K</kbd>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 shrink-0">
        <button className="grid place-items-center w-9 h-9 rounded-lg hover:bg-neutral-800 text-neutral-300" aria-label="Store">
          <Store className="w-[18px] h-[18px]" />
        </button>
        <button className="grid place-items-center w-9 h-9 rounded-lg hover:bg-neutral-800 text-neutral-300" aria-label="Notifications">
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <button className="flex items-center gap-2 rounded-lg hover:bg-neutral-800 pl-1 pr-2 h-9 ml-1">
          <span className="grid place-items-center w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 text-[11px] font-bold text-neutral-900">
            AC
          </span>
          <span className="text-sm hidden sm:inline">Acme Co Store</span>
          <span className="text-[10px] uppercase bg-neutral-700 text-neutral-300 rounded px-1.5 py-0.5">dev</span>
        </button>
      </div>
    </header>
  );
}
