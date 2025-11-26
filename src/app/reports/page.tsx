"use client";
import { useEffect, useState } from "react";
import gql from "graphql-tag";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, Share2 } from "lucide-react";
import { LoaderFive } from "@/components/ui/loader";
import AccessGateBanner from "@/components/ui/access-gate-banner";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Report = {
  id: string;
  ingredients: string[];
  allergensFound: string[];
  createdAt: string;
  imageUrl?: string | null;
  content?: string | null;
};

const GET_REPORTS = gql`query{ myReports { id ingredients allergensFound createdAt imageUrl content } }`;
const GET_PROFILE = gql`query{ getProfile { allergies } }`;

export default function ReportsPage() {
  const { userId } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function shareReport(r: Report) {
    try {
      let parsed: any = {};
      try { parsed = r.content ? JSON.parse(r.content) : {}; } catch {}
      const grade = parsed?.grade || null;
      const possible: string[] = Array.isArray(parsed?.possibleAllergens)
        ? parsed.possibleAllergens
        : typeof parsed?.possibleAllergens === 'string'
          ? [parsed.possibleAllergens]
          : [];
      const name = parsed?.name || "Food Label";
      const health = parsed?.health_analysis ? String(parsed.health_analysis) : "";
      const healthSnippet = health ? (health.length > 500 ? health.slice(0, 500) + "…" : health) : "";
      const summary = [
        `${name}`,
        grade ? `Grade: ${grade}` : undefined,
        r.allergensFound?.length ? `Allergens: ${r.allergensFound.join(', ')}` : undefined,
        possible?.length ? `Possible: ${possible.join(', ')}` : undefined,
        healthSnippet ? `\nHealth analysis:\n${healthSnippet}` : undefined,
        `Shared via EatWise`
      ].filter(Boolean).join('\n');

      if (navigator.share) {
        await navigator.share({ title: 'EatWise Report', text: summary });
        return;
      }
      await navigator.clipboard.writeText(summary);
      toast.success('Report summary copied to clipboard');
    } catch {
      toast.error('Unable to share this report');
    }
  }

  async function deleteReportById(id: string) {
    try {
      const mutation = `mutation($id: String!){ deleteReport(id: $id){ success message } }`;
      const res = await fetch('/api/graphql', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: mutation, variables: { id } })
      });
      const json = await res.json();
      const ok = json?.data?.deleteReport?.success;
      if (!ok) throw new Error(json?.data?.deleteReport?.message || 'Failed');
      setReports(reports => reports.filter(r => r.id !== id));
      setConfirmId(null);
      toast.success('Report deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  }

  function gradeClass(g?: string | null) {
    const v = (g || '').toString().trim().toUpperCase();
    switch (v) {
      case 'A':
        return 'bg-green-700 text-white';
      case 'B':
        return 'bg-green-600 text-white';
      case 'C':
        return 'bg-yellow-400 text-black';
      case 'D':
        return 'bg-orange-500 text-white';
      case 'E':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ query: GET_REPORTS.loc?.source.body }),
        });
        const json = await res.json();
        const data: { myReports: any[] } = json?.data;
        if (!mounted) return;
        const normalized: Report[] = (data?.myReports || []).map((r: any) => ({
          ...r,
          ingredients: Array.isArray(r?.ingredients)
            ? r.ingredients
            : typeof r?.ingredients === 'string'
              ? [r.ingredients]
              : [],
          allergensFound: Array.isArray(r?.allergensFound)
            ? r.allergensFound
            : typeof r?.allergensFound === 'string'
              ? [r.allergensFound]
              : [],
        }));
        setReports(normalized);

        // fetch user allergies
        const res2 = await fetch('/api/graphql', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ query: GET_PROFILE.loc?.source.body }),
        });
        const json2 = await res2.json();
        const prof: { getProfile?: { allergies?: string[] } } = json2?.data || {};
        const ua = prof?.getProfile?.allergies || [];
        setUserAllergies(ua);
      } catch (err) {
        setReports([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [userId]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <AccessGateBanner />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Your Reports</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Recent label analyses with grades, allergens and nutrition.</p>
      </div>
      {loading ? (
        <div className="min-h-[40vh] grid place-items-center"><LoaderFive text="Loading reports..." /></div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {reports.map((r) => {
            let parsed: any = {};
            try { parsed = r.content ? JSON.parse(r.content) : {}; } catch {}
            const nutrition = parsed?.nutrition || {};
            const health = parsed?.health_analysis || "";
            const grade = parsed?.grade || null;
            const possibleRaw = parsed?.possibleAllergens;
            const possible: string[] = Array.isArray(possibleRaw)
              ? possibleRaw
              : typeof possibleRaw === 'string'
                ? [possibleRaw]
                : [];
            const name = parsed?.name || "Food Label";
            return (
              <details key={r.id} className="group rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-3 sm:p-4 hover:scale-101 hover:border-teal-600 transition transform duration-300">
                <summary className="cursor-pointer flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate max-w-[60vw] sm:max-w-[40vw]">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {grade && (
                      <span className={`inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-md text-sm font-semibold ${gradeClass(grade)}`}>{grade}</span>
                    )}
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                  </div>
                </summary>
                <div className="mt-3 space-y-3">
                {r.imageUrl && (
                  <img src={r.imageUrl} alt="report" className="w-full h-36 sm:h-48 object-cover rounded-xl border" />
                )}
                <div className="space-y-1">
                  <div className="text-sm font-medium">Ingredients</div>
                  <div className="text-sm rounded-xl border bg-background/50 px-3 py-2 break-words">
                    {r.ingredients.join(', ')}
                  </div>
                </div>
                {r.allergensFound.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Allergens</div>
                    <div className="flex flex-wrap gap-1">
                      {r.allergensFound.map((a) => {
                        const uaLC = userAllergies.map(x=>x.toLowerCase());
                        const expanded = new Set<string>(uaLC);
                        if (expanded.has('dairy')) expanded.add('milk');
                        if (expanded.has('milk')) expanded.add('dairy');
                        const isUser = expanded.has(String(a).toLowerCase());
                        return (
                          <span key={a} className={`text-xs px-2 py-1 rounded-full border ${isUser ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>{a}</span>
                        )
                      })}
                    </div>
                  </div>
                )}
                {possible.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">Possible allergens: {possible.join(', ')}</div>
                )}
                {Object.keys(nutrition).length > 0 && (
                  <details className="rounded-xl border bg-background/50">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Nutrition</summary>
                    <div className="px-3 pb-3 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <tbody>
                          {Object.entries(nutrition).map(([k,v]) => (
                            <tr key={k} className="border-b">
                              <td className="py-1 pr-6 font-medium capitalize">{k.replace(/_/g,' ')}</td>
                              <td className="py-1">{String(v)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
                {health && (
                  <details className="rounded-xl border bg-background/50">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Health analysis</summary>
                    <div className="px-3 pb-3 text-xs whitespace-pre-wrap">{health}</div>
                  </details>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => shareReport(r)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs hover:bg-accent">
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                    <button onClick={() => setConfirmId(r.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-300 text-xs text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                </div>
              </details>
            );
          })}
          {reports.length === 0 && <div className="text-sm text-gray-500">No reports yet.</div>}
        </div>
      )}
      {confirmId && (
        <div className="fixed inset-0 z-[1006] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setConfirmId(null)} />
          <div className="relative w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl border backdrop-blur bg-white/90 dark:bg-black/70 shadow-xl p-4 sm:p-6">
            <div className="text-center space-y-2">
              <h3 className="text-base sm:text-lg font-semibold">Delete this report?</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">This action cannot be undone.</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={()=>setConfirmId(null)} className="h-10 rounded-md border">No</button>
              <button onClick={()=>deleteReportById(confirmId)} className="h-10 rounded-md bg-red-600 text-white hover:bg-red-700">Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


