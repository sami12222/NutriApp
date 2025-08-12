import React, { useEffect, useMemo, useState } from "react";

// Mobile-first nutrition & workout tracker (PWA-friendly web app)
// - Works offline (data in localStorage)
// - Add to Home Screen on iOS/Android for an app-like experience
// - Tracks calories & protein per day + basic workout notes
// - Calendar-style day switcher (compact)
//
// Next steps (tonight):
// - Swap localStorage -> IndexedDB for robustness
// - Add camera-based food scan (placeholder button included)
// - Export/Import JSON
// - Simple charts (weekly totals)

// Utilities
const fmtDate = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
const todayStr = fmtDate(new Date());

// Types
interface Entry {
  id: string;
  name: string;
  calories: number;
  protein: number; // grams
}

interface DayData {
  entries: Entry[];
  workout?: string;
}

function usePersistentDay(date: string) {
  const key = `nutri:v1:day:${date}`;
  const [data, setData] = useState<DayData>(() => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { return JSON.parse(raw) as DayData; } catch {}
    }
    return { entries: [] };
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data));
  }, [key, data]);

  return [data, setData] as const;
}

export default function App() {
  const [date, setDate] = useState<string>(todayStr);
  const [day, setDay] = usePersistentDay(date);

  const totals = useMemo(() => {
    const calories = day.entries.reduce((s, e) => s + (e.calories || 0), 0);
    const protein = day.entries.reduce((s, e) => s + (e.protein || 0), 0);
    return { calories, protein };
  }, [day.entries]);

  // New entry form state
  const [name, setName] = useState("");
  const [cal, setCal] = useState<string>("");
  const [prot, setProt] = useState<string>("");

  function addEntry() {
    const calories = Number(cal) || 0;
    const protein = Number(prot) || 0;
    if (!name.trim() || (calories <= 0 && protein <= 0)) return;
    const entry: Entry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      calories,
      protein,
    };
    setDay({ ...day, entries: [entry, ...day.entries] });
    setName(""); setCal(""); setProt("");
  }

  function removeEntry(id: string) {
    setDay({ ...day, entries: day.entries.filter(e => e.id !== id) });
  }

  function clearDay() {
    if (!confirm("Effacer toutes les entrées de la journée ?")) return;
    setDay({ entries: [], workout: "" });
  }

  // Calendar mini-nav (last 14 days)
  const recentDays = useMemo(() => {
    const days: string[] = [];
    const base = new Date(date);
    for (let i = -6; i <= 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(fmtDate(d));
    }
    return days;
  }, [date]);

  // Export / Import
  function exportAll() {
    const dump: Record<string, DayData> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith("nutri:v1:day:")) {
        const v = localStorage.getItem(k)!;
        try { dump[k] = JSON.parse(v); } catch {}
      }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "nutrition_export.json"; a.click();
    URL.revokeObjectURL(url);
  }

  async function importAll(evt: React.ChangeEvent<HTMLInputElement>) {
    const file = evt.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text) as Record<string, DayData>;
      Object.entries(data).forEach(([k, v]) => {
        if (k.startsWith("nutri:v1:day:")) localStorage.setItem(k, JSON.stringify(v));
      });
      alert("Import réussi. Recharge la page si nécessaire.");
    } catch {
      alert("Fichier invalide");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 p-4 max-w-md mx-auto">
      <header className="sticky top-0 bg-neutral-100/80 backdrop-blur z-10">
        <h1 className="text-2xl font-bold">Suivi Nutri & Workout</h1>
        <p className="text-sm text-neutral-500">Mobile • local • rapide</p>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="date"
            className="w-full rounded-xl border p-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            className="rounded-xl px-3 py-2 bg-black text-white"
            onClick={() => setDate(todayStr)}
          >Aujourd'hui</button>
        </div>

        {/* recent days scroller */}
        <div className="mt-3 grid grid-cols-7 gap-1">
          {recentDays.map(d => {
            const isSel = d === date;
            const key = `nutri:v1:day:${d}`;
            const has = !!localStorage.getItem(key);
            return (
              <button
                key={d}
                className={`rounded-xl border py-2 text-sm ${isSel ? 'bg-black text-white' : 'bg-white'} ${has ? 'font-semibold' : ''}`}
                onClick={() => setDate(d)}
                title={d}
              >{d.slice(5)}</button>
            );
          })}
        </div>
      </header>

      {/* totals */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-neutral-500">Calories</div>
          <div className="text-2xl font-bold">{totals.calories}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-neutral-500">Protéines (g)</div>
          <div className="text-2xl font-bold">{totals.protein}</div>
        </div>
      </section>

      {/* new entry */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow">
        <div className="text-sm font-semibold mb-2">Ajouter un aliment</div>
        <div className="flex flex-col gap-2">
          <input className="rounded-xl border p-2" placeholder="Nom (ex: poulet, riz)" value={name} onChange={e=>setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-xl border p-2" placeholder="Calories" inputMode="numeric" value={cal} onChange={e=>setCal(e.target.value)} />
            <input className="rounded-xl border p-2" placeholder="Protéines (g)" inputMode="numeric" value={prot} onChange={e=>setProt(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-black text-white py-2" onClick={addEntry}>Ajouter</button>
            <button className="rounded-xl border py-2 px-3" onClick={() => alert('Scan caméra à venir — accès caméra pour lire un code-barres ou détecter un aliment.')}>Scanner 📷</button>
          </div>
        </div>
      </section>

      {/* workout notes */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow">
        <div className="text-sm font-semibold mb-2">Workout (notes)</div>
        <textarea
          className="w-full rounded-xl border p-2 min-h-[80px]"
          placeholder="Incline bench, deadlift, etc. Poids/répétitions..."
          value={day.workout || ""}
          onChange={(e) => setDay({ ...day, workout: e.target.value })}
        />
      </section>

      {/* entries list */}
      <section className="mt-4 rounded-2xl bg-white p-2">
        {day.entries.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">Aucune entrée pour cette date.</div>
        ) : (
          <ul className="divide-y">
            {day.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-sm text-neutral-500">{e.calories} cal • {e.protein} g prot</div>
                </div>
                <button className="text-sm text-red-600" onClick={() => removeEntry(e.id)}>Supprimer</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* footer actions */}
      <footer className="mt-6 mb-12 flex flex-wrap gap-2">
        <button className="rounded-xl border px-3 py-2" onClick={clearDay}>Effacer la journée</button>
        <button className="rounded-xl border px-3 py-2" onClick={exportAll}>Exporter</button>
        <label className="rounded-xl border px-3 py-2 cursor-pointer">
          Importer
          <input type="file" accept="application/json" className="hidden" onChange={importAll} />
        </label>
      </footer>

      <div className="text-xs text-neutral-400 text-center pb-8">v0.1 (MVP) — Données stockées localement sur l'appareil</div>
    </div>
  );
}
