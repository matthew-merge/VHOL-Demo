import type { ComponentType } from "react";
import {
  Search,
  Building2,
  Users,
  Store,
  Tag,
  ReceiptText,
  CreditCard,
  ShoppingCart,
  CircleUser,
  Truck,
  Coins,
  MapPin,
  LayoutGrid,
  ShoppingBag,
  Globe,
  Activity,
  Bell,
  Database,
  Languages,
  Lock,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type Icon = ComponentType<{ className?: string }>;

const ITEMS: { label: string; icon: Icon }[] = [
  { label: "General", icon: Store },
  { label: "Plan", icon: Tag },
  { label: "Billing", icon: ReceiptText },
  { label: "Payments", icon: CreditCard },
  { label: "Checkout", icon: ShoppingCart },
  { label: "Customer accounts", icon: CircleUser },
  { label: "Shipping and delivery", icon: Truck },
  { label: "Taxes and duties", icon: Coins },
  { label: "Locations", icon: MapPin },
  { label: "Apps", icon: LayoutGrid },
  { label: "Sales channels", icon: ShoppingBag },
  { label: "Domains", icon: Globe },
  { label: "Customer events", icon: Activity },
  { label: "Notifications", icon: Bell },
  { label: "Metafields and metaobjects", icon: Database },
  { label: "Languages", icon: Languages },
  { label: "Customer privacy", icon: Lock },
  { label: "Policies", icon: FileText },
];

function NavRow({ icon: Icon, label, active }: { icon: Icon; label: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-default ${
        active ? "bg-neutral-100 font-semibold text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

export default function AcmeNav() {
  return (
    <aside className="w-72 shrink-0 m-3 bg-white border border-neutral-200 rounded-xl shadow-sm flex flex-col overflow-hidden text-[13px]">
      {/* Organization switcher */}
      <button className="flex items-center gap-2 px-3 py-3 hover:bg-neutral-50 text-left">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-900">Acme Co</div>
          <div className="text-neutral-500 text-xs">2 stores</div>
        </div>
        <ChevronDown className="w-4 h-4 text-neutral-400" />
      </button>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-2.5 h-8">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            className="bg-transparent outline-none text-sm flex-1 text-neutral-700 placeholder:text-neutral-400"
            placeholder="Search"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <NavRow icon={Building2} label="Organization" />
        <NavRow icon={Users} label="Users" />

        <div className="my-2 border-t border-neutral-100" />

        {/* Active store */}
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="grid place-items-center w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 text-[10px] font-bold text-neutral-900 shrink-0">
            AC
          </span>
          <div className="min-w-0">
            <div className="font-medium text-neutral-900 truncate">Acme Co Store</div>
            <div className="text-neutral-400 text-[11px] truncate">acme-co-store.acme.app</div>
          </div>
        </div>

        {ITEMS.map((it) => (
          <NavRow key={it.label} icon={it.icon} label={it.label} active={it.label === "Locations"} />
        ))}
      </nav>

      {/* Account */}
      <button className="flex items-center gap-2 px-3 py-3 border-t border-neutral-100 hover:bg-neutral-50 text-left">
        <span className="grid place-items-center w-7 h-7 rounded-full bg-neutral-800 text-white text-[11px] font-semibold shrink-0">
          R
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-neutral-900 truncate">Richard</div>
          <div className="text-neutral-500 text-[11px] truncate">richard@acme.co</div>
        </div>
        <ChevronRight className="w-4 h-4 text-neutral-400" />
      </button>
    </aside>
  );
}
