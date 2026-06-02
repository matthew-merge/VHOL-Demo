const LOCATIONS = [
  { name: "My Custom Location", sub: "123 Main St, Toronto" },
  { name: "Shop location", sub: "United States" },
];

export default function AcmeLocations() {
  return (
    <div className="flex-1 bg-white m-2 rounded-lg p-4">
      <h1 className="font-bold text-base">📍 Locations</h1>
      <p className="text-neutral-500 text-xs">Using 2 of 200 active locations on your plan</p>
      {LOCATIONS.map((loc) => (
        <div key={loc.name} className="flex justify-between border border-neutral-200 rounded-lg p-3 mt-2">
          <span>
            <span className="font-semibold">{loc.name}</span>
            <br />
            <span className="text-neutral-400 text-xs">{loc.sub}</span>
          </span>
          <span className="bg-green-100 text-green-700 rounded-full px-2 text-xs self-start">Active</span>
        </div>
      ))}
    </div>
  );
}
