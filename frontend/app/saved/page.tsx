import AppNav from "../../components/redesign/AppNav";

export default function SavedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-28">
      <div className="sticky top-0 z-30 bg-white dark:bg-[#1a1a1a] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Saved</h1>
            <AppNav
              active="saved"
              accentFrom="#10b981"
              accentTo="#059669"
              showMobile={false}
            />
          </div>
        </div>
      </div>

      <div className="pb-20 flex flex-col items-center justify-center text-center p-4 min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-88px)]">
        <div className="space-y-4 animate-fade-up">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto text-orange-600 dark:text-orange-400">
            <span className="material-symbols-outlined text-[40px]">bookmark</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Construction in progress</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xs">
            We&apos;re building a place for you to save your favorite spots. Check back soon!
          </p>
        </div>
      </div>

      <AppNav
        active="saved"
        accentFrom="#10b981"
        accentTo="#059669"
        showDesktop={false}
      />
    </div>
  );
}
