"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import gql from "graphql-tag";
import { GraphQLClient } from "graphql-request";
import { toast } from "sonner";
import { LoaderFive } from "@/components/ui/loader";
import { GridPattern } from "@/components/ui/file-upload";
import { getGuestAnalyses, clearGuestAnalyses } from "@/lib/guest";

type Profile = {
  name?: string | null;
  fitnessGoal?: string | null;
  allergies: string[];
};

const GET_PROFILE = gql`
  query GetProfile {
    getProfile {
      name
      fitnessGoal
      allergies
    }
  }
`;

const SAVE_PROFILE = gql`
  mutation SaveProfile($fitnessGoal: String, $allergies: [String!]) {
    updateUserProfile(fitnessGoal: $fitnessGoal, allergies: $allergies) {
      success
      message
    }
  }
`;

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<Profile | null>(null);
  const client = useMemo(() => new GraphQLClient("/api/graphql", { credentials: "include" }), []);
  const [coupon, setCoupon] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [quota, setQuota] = useState<{ role: string; used: number; max: number; remaining: number; unlimited: boolean } | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<Profile>({
    defaultValues: { fitnessGoal: "", allergies: [] },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await client.request<{ getProfile: Profile | null }>(GET_PROFILE);
        if (!mounted) return;
        setInitial(data.getProfile ?? { name: "", fitnessGoal: "", allergies: [] });
        setValue("fitnessGoal", data.getProfile?.fitnessGoal ?? "");
        setValue("allergies", data.getProfile?.allergies ?? []);
      } catch (err) {
        setInitial({ name: "", fitnessGoal: "", allergies: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [client, setValue]);

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
        const q = gql`query { myQuota { role used max remaining unlimited } }`;
        const res = await client.request<{ myQuota: any }>(q);
        if (mounted) setQuota(res.myQuota);
      } catch {}
    })();
    return () => { mounted = false };
  }, [client]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      // Try GraphQL first
      try {
        const res = await client.request<{ updateUserProfile: { success: boolean; message?: string } }>(
          SAVE_PROFILE,
          { fitnessGoal: values.fitnessGoal || null, allergies: values.allergies || [] }
        );
        if (res.updateUserProfile.success) {
          toast.success("Preferences saved");
          return;
        }
      } catch {}

      // Fallback to REST API
      const resp = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fitnessGoal: values.fitnessGoal || null, allergies: values.allergies || [] }),
      });
      const json = await resp.json();
      if (json?.success) {
        toast.success('Preferences saved');
      } else {
        throw new Error(json?.message || 'Failed to save');
      }
    } catch (err: any) {
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
              <h1 className="text-2xl font-semibold">Your Preferences</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">Tell EatWise about your goals and allergies for smarter analyses.</p>
            </div>
            <form onSubmit={onSubmit} className="grid gap-6">
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

              <div className="flex items-center gap-3">
                <button type="submit" className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700">Save changes</button>
                <span className="text-xs text-gray-500">We’ll tailor analyses to your preferences.</span>
              </div>
            </form>
            <div className="mt-6">
              <button onClick={async()=>{
                try{
                  const items = getGuestAnalyses();
                  if(!items.length){ toast.info('No guest analyses found'); return; }
                  const m = gql`mutation Migrate($items: [GuestAnalysisInput!]!){ migrateGuestAnalyses(items: $items){ success message } }`;
                  const payload = items.map(it=>({ ingredients: it.ingredients, allergens: it.allergens, possibleAllergens: it.possibleAllergens||[], nutrition: JSON.stringify(it.nutrition||{}), health_analysis: it.health_analysis||'', grade: it.grade||null }));
                  const res = await client.request<{ migrateGuestAnalyses: { success: boolean; message?: string } }>(m, { items: payload });
                  toast.success(res.migrateGuestAnalyses.message || 'Migrated');
                  clearGuestAnalyses();
                }catch(err:any){
                  toast.error(err?.message || 'Migration failed');
                }
              }} className="px-4 py-2 rounded-md border">Migrate guest analyses to account</button>
            </div>
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-semibold">Upgrade to Pro</h2>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Unlimited analyses. One-time purchase.</p>
                </div>
                {quota && (
                  <span className="text-xs rounded-md border px-2 py-1">Current plan: {quota.role}{quota.unlimited ? ' (unlimited)' : ''}</span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={coupon} onChange={(e)=>setCoupon(e.target.value)} placeholder="Coupon code (optional)" className="flex-1 rounded-md border border-neutral-200/60 dark:border-neutral-800/60 px-3 py-2 backdrop-blur bg-white/70 dark:bg-black/30" />
                <button disabled={upgrading} onClick={async ()=>{
                  try{
                    setUpgrading(true);
                    const m = gql`mutation Upgrade($coupon: String){ upgradeToPro(coupon: $coupon){ success message checkoutUrl } }`;
                    const res = await client.request<{ upgradeToPro: { success: boolean; message?: string; checkoutUrl?: string|null } }>(m, { coupon: coupon || null });
                    if(!res.upgradeToPro.success || !res.upgradeToPro.checkoutUrl){
                      throw new Error(res.upgradeToPro.message || 'Failed to start checkout');
                    }
                    window.location.href = res.upgradeToPro.checkoutUrl as string;
                  }catch(err:any){
                    toast.error(err?.message || 'Failed to start checkout');
                  }finally{
                    setUpgrading(false);
                  }
                }} className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{upgrading? 'Redirecting...' : 'Upgrade'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


