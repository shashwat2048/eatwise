"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import gql from "graphql-tag";
import { GraphQLClient } from "graphql-request";
import { toast } from "sonner";

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
          toast.success("Profile saved");
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
        toast.success('Profile saved');
      } else {
        throw new Error(json?.message || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile");
    }
  });

  const allergies: string[] = watch("allergies");

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-6">Profile</h1>
        <form onSubmit={onSubmit} className="grid gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Fitness Goal</label>
            <select {...register("fitnessGoal")} className="w-full rounded-md border px-3 py-2 bg-background">
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
                    className={`px-3 py-1 rounded-full border transition ${active ? "bg-teal-600 text-white border-teal-600" : "hover:bg-accent"}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700">Save changes</button>
            <span className="text-xs text-gray-500">We’ll tailor analyses to your profile.</span>
          </div>
        </form>
      </div>
    </div>
  );
}


