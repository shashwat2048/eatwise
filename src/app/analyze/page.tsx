"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AnalyzePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    ingredients: string[];
    allergens: string[];
    possibleAllergens: string[];
    nutrition: Record<string, any>;
    health_analysis: string;
    grade?: string | null;
    saved?: boolean;
  }>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    }
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      setError("Camera access denied or unavailable");
    }
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(f);
      const url = URL.createObjectURL(blob);
      setPreview(url);
    }, "image/jpeg", 0.9);
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function clearImage() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  async function onSubmit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const query = `mutation Analyze($imageBase64: String!) { analyzeLabel(imageBase64: $imageBase64) { imageUrl ingredients allergens possibleAllergens analysisJson grade explanation saved reportId } }`;
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables: { imageBase64: base64 } }),
      });
      if (!res.ok) throw new Error("Failed to analyze");
      const json = await res.json();
      const data = json?.data?.analyzeLabel;
      if (!data) throw new Error('No result');
      setResult({
        ingredients: data.ingredients || [],
        allergens: data.allergens || [],
        possibleAllergens: data.possibleAllergens || [],
        nutrition: (()=>{ try { return JSON.parse(data.analysisJson||'{}').nutrition||{} } catch { return {} } })(),
        health_analysis: (()=>{ try { return JSON.parse(data.analysisJson||'{}').health_analysis||'' } catch { return '' } })(),
        grade: data.grade || null,
        saved: data.saved,
      });
      toast.success(data.saved ? "Report saved" : "Analysis ready");
      if (data.saved && data.reportId) {
        // Redirect to reports to view full analysis
        setTimeout(() => router.push('/reports'), 400);
      }
    } catch (e: any) {
      const msg = e?.message || "Upload failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Analyze Food Label</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Capture with camera or upload from device, then let EatWise do the rest.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-4 space-y-3">
          <video ref={videoRef} className="w-full rounded-xl border" playsInline muted />
          <div className="flex gap-2">
            <button onClick={startCamera} className="px-3 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700">Start Camera</button>
            <button onClick={captureFrame} className="px-3 py-2 rounded-md border">Capture</button>
            <button onClick={stopCamera} className="px-3 py-2 rounded-md border">Stop</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-4 space-y-3">
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />
          <div
            role="button"
            onClick={openFilePicker}
            className="w-full rounded-xl border-2 border-dashed p-8 text-center hover:bg-accent cursor-pointer select-none"
          >
            <div className="text-sm font-medium">Click to upload from your device</div>
            <div className="text-xs text-gray-500">Supported: JPG, PNG. Or use the camera on the left.</div>
          </div>
          {preview && (
            <div className="space-y-2">
              <img src={preview} alt="preview" className="w-full rounded-xl border" />
              <button onClick={clearImage} className="px-3 py-2 rounded-md border">Clear Image</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button disabled={!file || busy} onClick={onSubmit} className="px-5 py-2.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
          {busy ? "Analyzing..." : "Send to Analyze"}
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      {result && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Ingredients</h2>
              {result.grade && (
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-teal-600 text-white text-sm font-semibold">{result.grade}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {result.ingredients?.map((ing: string, i: number) => {
                const isAllergen = (result.allergens || []).some((a) => ing.toLowerCase().includes(String(a).toLowerCase()))
                return (
                  <span key={i} className={`text-sm px-2 py-1 rounded-full border ${isAllergen ? 'bg-red-100 text-red-700 border-red-300' : ''}`}>{ing}</span>
                )
              })}
            </div>
            {result.possibleAllergens && result.possibleAllergens.length > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-300">Possible allergens: {result.possibleAllergens.join(', ')}</div>
            )}
          </div>

          <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-4">
            <h2 className="font-semibold mb-2">Nutrition</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <tbody>
                  {Object.entries(result.nutrition || {}).map(([k, v]) => (
                    <tr key={k} className="border-b">
                      <td className="py-2 pr-6 font-medium capitalize">{k.replace(/_/g,' ')}</td>
                      <td className="py-2">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:col-span-2 rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-4 space-y-2">
            <h2 className="font-semibold">Health Analysis</h2>
            <p className="text-sm whitespace-pre-wrap">{result.health_analysis}</p>
            {!result.saved && (
              <button onClick={onSubmit} className="mt-2 px-3 py-2 rounded-md bg-teal-600 text-white">Save Report</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


