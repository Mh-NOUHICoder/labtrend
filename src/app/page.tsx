import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-50 selection:bg-emerald-500/30">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
          AI That Prevents <br className="hidden sm:block" /> Kidney Failure
        </h1>
        
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
          Advanced continuous monitoring of diabetes lab trends. Our AI detects early 
          renal risk factors in real-time, empowering preventative action before irreversible damage starts.
        </p>

        <div className="pt-6 flex flex-col items-center gap-4">
          <Link 
            href="/dashboard" 
            className="inline-flex h-14 items-center justify-center rounded-full bg-emerald-600 px-10 text-lg font-semibold text-white shadow-sm ring-1 ring-emerald-500 transition-all hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            Access Dashboard
          </Link>
          <Link 
            href="/a2a-tester"
            className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors border-b border-transparent hover:border-slate-700 pb-0.5"
          >
            Open A2A Tester →
          </Link>
        </div>
      </div>
    </main>
  );
}
