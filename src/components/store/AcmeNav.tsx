const ITEMS = ["Home", "Orders", "Products", "Locations", "Customers", "Analytics"];

export default function AcmeNav() {
  return (
    <nav className="w-48 shrink-0 bg-neutral-100 border-r border-neutral-200 p-3 text-sm">
      <div className="flex items-center gap-2 font-extrabold text-base mb-4">
        <span className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-500" />
        Acme&nbsp;Co
      </div>
      {ITEMS.map((item) => (
        <div
          key={item}
          className={`px-2 py-1 rounded-md ${
            item === "Locations" ? "bg-neutral-200 font-semibold" : "text-neutral-600"
          }`}
        >
          {item}
        </div>
      ))}
    </nav>
  );
}
