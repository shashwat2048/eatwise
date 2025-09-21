"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import gql from "graphql-tag";
import { GraphQLClient } from "graphql-request";
import { toast } from "sonner";
import { LoaderFive } from "@/components/ui/loader";
import { GridPattern } from "@/components/ui/file-upload";

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
          </div>
        </div>
      </div>
    </div>
  );
}


