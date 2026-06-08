import type { ReactNode } from "react";
import {
  MapPin,
  Search,
  ListFilter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from "lucide-react";

function Card({ children }: { children: ReactNode }) {
  return <section className="bg-white border border-neutral-200 rounded-xl shadow-sm">{children}</section>;
}

function LocationRow({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="grid grid-cols-[1fr_7rem_5rem] gap-4 items-center px-1 py-3 border-b border-neutral-100 last:border-0">
      <div>
        <div className="font-medium text-neutral-900 text-sm">{name}</div>
        <div className="text-neutral-500 text-xs">{sub}</div>
      </div>
      <span className="justify-self-end text-xs bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5">POS Pro</span>
      <span className="justify-self-end text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5">Active</span>
    </div>
  );
}

const TABS = ["All", "Active", "Inactive", "POS Pro", "POS Lite"];

export default function AcmeLocations() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <MapPin className="w-5 h-5" /> Locations
        </h1>
        <button aria-label="Close" className="grid place-items-center w-7 h-7 rounded-lg text-neutral-400 hover:bg-neutral-200/60">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-5">
        {/* All locations */}
        <Card>
          <div className="flex items-start justify-between p-4">
            <div>
              <h2 className="font-semibold text-neutral-900">All locations</h2>
              <p className="text-neutral-500 text-sm">Max number of locations reached</p>
            </div>
            <button
              disabled
              className="text-sm font-medium border border-neutral-200 rounded-lg px-3 py-1.5 text-neutral-400 bg-neutral-50 cursor-not-allowed shrink-0"
            >
              Add location
            </button>
          </div>

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1 text-sm">
              {TABS.map((t, i) => (
                <span
                  key={t}
                  className={`px-2.5 py-1 rounded-lg ${i === 0 ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600"}`}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-0.5 text-neutral-500">
              <button className="grid place-items-center w-8 h-8 rounded-lg hover:bg-neutral-100" aria-label="Search">
                <Search className="w-4 h-4" />
              </button>
              <button className="grid place-items-center w-8 h-8 rounded-lg hover:bg-neutral-100" aria-label="Filter">
                <ListFilter className="w-4 h-4" />
              </button>
              <button className="grid place-items-center w-8 h-8 rounded-lg hover:bg-neutral-100" aria-label="Sort">
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-[1fr_7rem_5rem] gap-4 text-xs text-neutral-500 px-1 pb-2 border-b border-neutral-200">
              <span>Location</span>
              <span className="justify-self-end">POS Subscription</span>
              <span className="justify-self-end">Status</span>
            </div>
            <LocationRow name="Flagship Store" sub="123 Broadway Ave, New York City, USA" />
            <LocationRow name="Airport Kiosk" sub="LaGuardia Airport" />
          </div>
        </Card>

        {/* Default location */}
        <Card>
          <div className="p-4">
            <h2 className="font-semibold text-neutral-900">Default location</h2>
            <p className="text-neutral-500 text-sm mb-3">
              This location is used by Acme Co and apps when no other location is specified
            </p>
            <div className="flex items-center justify-between border border-neutral-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-medium text-neutral-900 text-sm">Flagship Store</div>
                  <div className="text-neutral-500 text-xs">United States</div>
                </div>
              </div>
              <button className="flex items-center gap-1 text-sm font-medium border border-neutral-300 rounded-lg px-3 py-1.5 hover:bg-neutral-50">
                Change <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* Point of Sale subscriptions */}
        <Card>
          <div className="p-4">
            <h2 className="flex items-center gap-1.5 font-semibold text-neutral-900">
              Point of Sale subscriptions <Info className="w-4 h-4 text-neutral-400" />
            </h2>
            <p className="text-neutral-500 text-sm mb-3">
              Start selling in person from any location with the in-person selling features included in your Acme Co plan
            </p>
            <div className="flex items-center justify-between border border-neutral-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-500 text-white text-[11px] font-bold">
                  POS
                </span>
                <div>
                  <div className="font-medium text-neutral-900 text-sm">Point of Sale</div>
                  <div className="text-neutral-500 text-xs">Installed</div>
                </div>
              </div>
              <button className="text-sm font-medium border border-neutral-300 rounded-lg px-3 py-1.5 hover:bg-neutral-50">
                Open
              </button>
            </div>
          </div>
        </Card>

        {/* App and custom fulfillment locations */}
        <Card>
          <div className="p-4">
            <h2 className="font-semibold text-neutral-900">App and custom fulfillment locations</h2>
            <p className="text-neutral-500 text-sm mb-3">3rd-party services that manage inventory and fulfill orders</p>
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 text-xs text-neutral-500">
                <span>Location</span>
                <ChevronUp className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <div className="font-medium text-neutral-900 text-sm">Acme Co Cosellers</div>
                  <div className="text-neutral-500 text-xs">1 location</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-neutral-100 text-neutral-600 rounded-md px-2 py-0.5">App</span>
                  <ChevronUp className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
              <div className="pl-8 pr-3 py-2.5 border-t border-neutral-100">
                <div className="font-medium text-neutral-900 text-sm">Denver Warehouse</div>
                <div className="text-neutral-500 text-xs">United States</div>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-center text-sm font-medium text-neutral-600 py-2">Learn more about locations</p>
      </div>
    </div>
  );
}
