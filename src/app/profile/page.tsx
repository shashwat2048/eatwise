"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoaderFive } from "@/components/ui/loader";
import { GridPattern } from "@/components/ui/file-upload";
 

type Profile = {
  name?: string | null;
  fitnessGoal?: string | null;
  allergies: string[];
};

const GET_PROFILE = `query GetProfile { getProfile { name fitnessGoal allergies } }`;

const GET_ME = `query Me { me { name email } }`;

const SAVE_PROFILE = `mutation SaveProfile($name: String, $fitnessGoal: String, $allergies: [String!]) {
  updateUserProfile(name: $name, fitnessGoal: $fitnessGoal, allergies: $allergies) {
    success
    message
  }
}`;

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<Profile | null>(null);
  const nav = useRouter();

  async function gqlFetch<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const res = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    if (json?.errors?.length) throw new Error(json.errors[0]?.message || 'GraphQL error');
    return json.data as T;
  }
  const [upgrading, setUpgrading] = useState(false);
  const [quota, setQuota] = useState<{ role: string; used: number; max: number; remaining: number; unlimited: boolean } | null>(null);
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [meName, setMeName] = useState<string | null>(null);
  const [cardMode, setCardMode] = useState<boolean>(true);
  const router = useRouter();

  const { register, handleSubmit, setValue, watch } = useForm<Profile>({
    defaultValues: { name: "", fitnessGoal: "", allergies: [] },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await gqlFetch<{ getProfile: Profile | null }>(GET_PROFILE);
        if (!mounted) return;
        setInitial(data.getProfile ?? { name: "", fitnessGoal: "", allergies: [] });
        setValue("name", data.getProfile?.name ?? "");
        setValue("fitnessGoal", data.getProfile?.fitnessGoal ?? "");
        setValue("allergies", data.getProfile?.allergies ?? []);
      } catch (err) {
        setInitial({ name: "", fitnessGoal: "", allergies: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [setValue]);

  // Toast payment status based on query param
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const up = sp.get('upgrade');
      if (up === 'success') {
        toast.success('Payment successful. You are now on Pro.');
      } else if (up === 'cancelled') {
        toast('Checkout cancelled');
      }
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await gqlFetch<{ myQuota: any }>(`query { myQuota { role used max remaining unlimited } }`);
        if (mounted) setQuota(res.myQuota);
      } catch {}
      try {
        const r = await gqlFetch<{ me?: { name?: string|null; email?: string|null } | null }>(GET_ME);
        if (mounted) {
          setMeEmail(r?.me?.email || null);
          setMeName(r?.me?.name || null);
        }
      } catch {}
    })();
    return () => { mounted = false };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await gqlFetch<{ updateUserProfile: { success: boolean; message?: string } }>(
        SAVE_PROFILE,
        { name: values.name || null, fitnessGoal: values.fitnessGoal || null, allergies: values.allergies || [] }
      );
      if (!res.updateUserProfile.success) throw new Error(res.updateUserProfile.message || 'Failed to save');
      toast.success("Preferences saved");
      // Refetch latest profile and refresh form + card state
      try {
        const fresh = await gqlFetch<{ getProfile: Profile | null }>(GET_PROFILE);
        const next = fresh.getProfile ?? { name: "", fitnessGoal: "", allergies: [] };
        setInitial(next);
        setValue("name", next.name ?? "");
        setValue("fitnessGoal", next.fitnessGoal ?? "");
        setValue("allergies", next.allergies ?? []);
      } catch {}
      setCardMode(true);
      try { nav.refresh(); } catch {}
    } catch (err: any) {
      // Fallback to REST if GraphQL auth fails
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('unauthorized')) {
        try {
          const resp = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: values.name || null, fitnessGoal: values.fitnessGoal || null, allergies: values.allergies || [] }),
          });
          const json = await resp.json();
          if (!resp.ok || !json?.success) throw new Error(json?.message || 'Failed');
          toast.success('Preferences saved');
          try {
            const fresh = await gqlFetch<{ getProfile: Profile | null }>(GET_PROFILE);
            const next = fresh.getProfile ?? { name: "", fitnessGoal: "", allergies: [] };
            setInitial(next);
            setValue("name", next.name ?? "");
            setValue("fitnessGoal", next.fitnessGoal ?? "");
            setValue("allergies", next.allergies ?? []);
          } catch {}
          setCardMode(true);
          try { nav.refresh(); } catch {}
          return;
        } catch (e:any) {
          toast.error(e?.message || 'Failed to save Preferences');
          return;
        }
      }
      toast.error(err?.message || "Failed to save Preferences");
    }
  });

  const allergies: string[] = watch("allergies");

  if (loading) return (
    <div className="min-h-[40vh] grid place-items-center p-6">
      <LoaderFive text="Loading Preferences..." />
    </div>
  );

  return (
    <div className="px-4 py-10">
      <div className="max-w-2xl mx-auto min-h-[70vh] grid place-items-center">
        <div className="relative w-full rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-8 shadow-sm overflow-hidden">
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
            <GridPattern />
          </div>
          <div className="relative z-10">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Your Profile</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">Manage your details and preferences.</p>
            </div>

            {/* Read-only card view */}
            <div className={`grid gap-3 mb-4 ${cardMode ? '' : 'hidden'}`}>
              <div className="relative rounded-2xl border p-5 bg-white/80 dark:bg-black/30 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-lime-500" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-teal-600 text-white grid place-items-center font-semibold">
                      {(initial?.name || meName || 'U')?.slice(0,1)?.toUpperCase()}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{initial?.name || meName || '—'}</div>
                      <div className="text-neutral-500">{meEmail || '—'}</div>
                    </div>
                  </div>
                  <span className={`${quota?.role==='pro' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-amber-300' : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-800'} text-xs px-2.5 py-1 rounded-full border`}>
                    {quota?.role || 'free'}{quota?.unlimited ? ' • unlimited' : ''}
                  </span>
                </div>
                <div className="grid gap-1.5 text-sm">
                  <div><span className="font-medium">Fitness goal:</span> {initial?.fitnessGoal || '—'}</div>
                  <div><span className="font-medium">Allergies:</span> {(initial?.allergies||[]).length ? initial!.allergies.join(', ') : '—'}</div>
                </div>
              </div>
              <div>
                <button type="button" onClick={()=>setCardMode(false)} className="px-4 py-2 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">Edit</button>
              </div>
            </div>

            {/* Edit form */}
            <form onSubmit={onSubmit} className={`grid gap-6 ${cardMode ? 'hidden' : ''}`}>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  {...register("name")}
                  placeholder="Your name"
                  className="w-full rounded-md border border-neutral-200/60 dark:border-neutral-800/60 px-3 py-2 backdrop-blur bg-white/70 dark:bg-black/30"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Fitness Goal</label>
                <select
                  {...register("fitnessGoal")}
                  className="w-full rounded-md border border-neutral-200/60 dark:border-neutral-800/60 px-3 py-2 backdrop-blur bg-white/70 dark:bg-black/30"
                >
                  <option value="">Select</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium">Allergies</label>
                <div className="flex flex-wrap gap-2">
                  {["peanuts","gluten","dairy","soy","eggs","shellfish"].map((opt) => {
                    const active = allergies?.includes(opt as any);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const next = active ? allergies.filter(a => a !== opt) : [...(allergies||[]), opt];
                          setValue("allergies", next, { shouldDirty: true });
                        }}
                        className={`px-3 py-1 rounded-full border border-neutral-200/60 dark:border-neutral-800/60 backdrop-blur transition ${active ? "bg-teal-600 text-white border-teal-600" : "bg-white/70 dark:bg-black/30 hover:bg-white/80 dark:hover:bg-black/40"}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700">Save changes</button>
                <button type="button" onClick={()=>{
                  // Revert fields to initial values and return to card view
                  setValue("name", initial?.name ?? "");
                  setValue("fitnessGoal", initial?.fitnessGoal ?? "");
                  setValue("allergies", initial?.allergies ?? []);
                  setCardMode(true);
                }} className="px-4 py-2 rounded-md border">Discard</button>
                <span className="text-xs text-gray-500">We’ll tailor analyses to your preferences.</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


