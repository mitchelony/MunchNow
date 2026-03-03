import Link from "next/link";

type Tab = "discover" | "close" | "saved" | "info";

type AppNavProps = {
  active: Tab;
  accentFrom?: string;
  accentTo?: string;
  glowColor?: string;
  showDesktop?: boolean;
  showMobile?: boolean;
};

const TABS: Array<{
  id: Tab;
  href: string;
  icon: string;
  label: string;
}> = [
  { id: "discover", href: "/", icon: "explore", label: "Discover" },
  { id: "close", href: "/close", icon: "near_me", label: "Nearby" },
  { id: "saved", href: "/saved", icon: "bookmark", label: "Saved" },
  { id: "info", href: "/info", icon: "info", label: "Info" },
];

export default function AppNav({
  active,
  accentFrom = "#6366f1",
  accentTo = "#4f46e5",
  glowColor,
  showDesktop = true,
  showMobile = true,
}: AppNavProps) {
  const glow = glowColor ?? accentFrom;
  const activeStyle = {
    background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
    boxShadow: `0 0 34px ${glow}88, 0 0 68px ${glow}38, 0 6px 20px ${glow}33`,
  };

  return (
    <>
      {showDesktop ? (
      <div className="hidden md:flex items-center gap-1 rounded-full border border-gray-200 dark:border-transparent bg-white dark:bg-[#1a1a1a] p-1">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${
                isActive
                  ? "text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626]"
              }`}
              style={isActive ? activeStyle : undefined}
            >
              <span className={`material-symbols-outlined text-[16px] leading-none ${isActive ? "filled" : ""}`}>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
      ) : null}

      {showMobile ? (
      <nav className="md:hidden fixed bottom-6 left-0 right-0 z-40 px-5">
        <div className="max-w-md mx-auto rounded-[28px] bg-white/85 dark:bg-[#1a1a1a]/92 backdrop-blur border border-gray-200/60 dark:border-transparent shadow-2xl px-2 py-2">
          <div className="grid grid-cols-4 gap-1 text-center">
            {TABS.map((tab) => {
              const isActive = tab.id === active;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`rounded-2xl py-2 transition ${
                    isActive
                      ? "text-white"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]"
                  }`}
                  style={isActive ? activeStyle : undefined}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? "filled" : ""}`}>
                    {tab.icon}
                  </span>
                  <p className="text-[10px] font-bold">{tab.label}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      ) : null}
    </>
  );
}
