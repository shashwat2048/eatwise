"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/file-upload";
import { GridPattern } from "@/components/ui/file-upload";
import { LoaderFive } from "@/components/ui/loader";
import { canGuestAnalyze, ensureGuestSession, getGuestHeaders, incrementGuestAnalyses, MAX_FREE_ANALYSES, getRemainingAnalyses, saveGuestAnalysis } from "@/lib/guest";
import { StepHeader } from "@/components/ui/step-header";
import { SaveShareBar } from "@/components/ui/save-share-bar";
import { BlurIndicator } from "@/components/ui/blur-indicator";
import LimitNotice from "@/components/ui/limit-notice";

export default function AnalyzePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [result, setResult] = useState<null | {
    ingredients: string[];
    allergens: string[];
    possibleAllergens: string[];
    nutrition: Record<string, any>;
    health_analysis: string;
    grade?: string | null;
    saved?: boolean;
  }>(null);
  const [quota, setQuota] = useState<{ role: string; used: number; max: number; remaining: number; unlimited: boolean } | null>(null);
  const [blurScore, setBlurScore] = useState<number | null>(null);
  const router = useRouter();

  function gradeClass(g?: string | null) {
    const val = (g || '').toString().trim().toUpperCase();
    switch (val) {
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
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    }
  }, []);

  useEffect(() => {
    // Fetch quota for signed-in users; guests rely on localStorage display
    async function fetchQuota() {
      try {
        const query = `query { myQuota { role used max remaining unlimited } }`;
        const res = await fetch('/api/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query }) });
        const json = await res.json();
        const q = json?.data?.myQuota || null;
        if (q) setQuota(q);
      } catch {}
    }
    fetchQuota();
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
      setCameraOn(true);
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
      // compute simple blur score
      computeBlurScore(canvas).then(setBlurScore).catch(()=>setBlurScore(null));
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
    setCameraOn(false);
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

  function handleFileUpload(files: File[]) {
    if (!files || files.length === 0) return;
    const first = files[0];
    setFile(first);
    try {
      if (preview) URL.revokeObjectURL(preview);
    } catch {}
    setPreview(URL.createObjectURL(first));
    // attempt blur score after load
    setTimeout(async () => {
      try {
        if (!canvasRef.current) return;
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          computeBlurScore(canvas).then(setBlurScore).catch(()=>setBlurScore(null));
        };
        img.src = URL.createObjectURL(first);
      } catch {}
    }, 0);
  }

  async function onSubmit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // Ensure guest session exists if user is not signed in (middleware allows guests here)
      ensureGuestSession();
      const gate = canGuestAnalyze();
      const freeLimitHit = quota && !quota.unlimited && quota.role === 'free' && quota.remaining <= 0;
      if (!gate.ok || freeLimitHit) {
        toast.error(`Free guest limit reached. Please sign in to continue.`);
        setBusy(false);
        return;
      }
      const base64 = await fileToBase64(file);
      const query = `mutation Analyze($imageBase64: String!) { analyzeLabel(imageBase64: $imageBase64) { imageUrl ingredients allergens possibleAllergens analysisJson grade explanation saved reportId } }`;
      const used = (canGuestAnalyze().remaining < MAX_FREE_ANALYSES) ? (MAX_FREE_ANALYSES - getRemainingAnalyses()) : 0;
      const guestHeaders = getGuestHeaders();
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...guestHeaders };
      if (guestHeaders["x-guest"]) headers["x-guest-used"] = String(used);
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query, variables: { imageBase64: base64 } }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to analyze");
      }
      const json = await res.json();
      if (json?.errors?.length) {
        const msg = json.errors[0]?.message || 'Request failed';
        throw new Error(msg);
      }
      const data = json?.data?.analyzeLabel;
      if (!data) throw new Error('No result');
      incrementGuestAnalyses();
      // Refresh quota if signed-in free user (server increments analysesDone)
      try {
        const q = `query { myQuota { role used max remaining unlimited } }`;
        const r2 = await fetch('/api/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q }) });
        const j2 = await r2.json();
        if (j2?.data?.myQuota) setQuota(j2.data.myQuota);
      } catch {}
      const structured = {
        ingredients: data.ingredients || [],
        allergens: data.allergens || [],
        possibleAllergens: data.possibleAllergens || [],
        nutrition: (()=>{ try { return JSON.parse(data.analysisJson||'{}').nutrition||{} } catch { return {} } })(),
        health_analysis: (()=>{ try { return JSON.parse(data.analysisJson||'{}').health_analysis||'' } catch { return '' } })(),
        grade: data.grade || null,
        saved: data.saved,
      };
      setResult(structured);
      toast.success(data.saved ? "Report saved" : "Analysis ready");
      // haptic / visual small feedback on success
      try { if (navigator.vibrate) navigator.vibrate(20); } catch {}
      // If guest, store locally
      if (guestHeaders["x-guest"]) {
        saveGuestAnalysis({
          ingredients: structured.ingredients,
          allergens: structured.allergens,
          possibleAllergens: structured.possibleAllergens,
          nutrition: structured.nutrition,
          health_analysis: structured.health_analysis,
          grade: structured.grade || null,
        });
      }
      if (data.saved && data.reportId) {
        // Redirect to reports to view full analysis
        setTimeout(() => router.push('/reports'), 400);
      }
    } catch (e: any) {
      const msg = e?.message?.includes('limit') ? e.message : (e?.message || "Upload failed");
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

  // Simple Tenengrad-like focus measure using Sobel gradients on a downscaled patch
  async function computeBlurScore(canvas: HTMLCanvasElement): Promise<number> {
    const w = Math.max(64, Math.min(256, Math.floor(canvas.width / 4)));
    const h = Math.max(64, Math.min(256, Math.floor(canvas.height / 4)));
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    if (!tctx) return Promise.resolve(NaN);
    tctx.drawImage(canvas, 0, 0, w, h);
    const img = tctx.getImageData(0, 0, w, h);
    const g = new Float32Array(w * h);
    for (let i=0;i<w*h;i++){
      const o = i*4;
      g[i] = 0.2126*img.data[o] + 0.7152*img.data[o+1] + 0.0722*img.data[o+2];
    }
    const sobelX = [[-1,0,1],[-2,0,2],[-1,0,1]];
    const sobelY = [[-1,-2,-1],[0,0,0],[1,2,1]];
    let sum = 0;
    for (let y=1;y<h-1;y++){
      for (let x=1;x<w-1;x++){
        let gx=0, gy=0;
        for (let ky=-1;ky<=1;ky++){
          for (let kx=-1;kx<=1;kx++){
            const val = g[(y+ky)*w + (x+kx)];
            gx += val * sobelX[ky+1][kx+1];
            gy += val * sobelY[ky+1][kx+1];
          }
        }
        const mag = Math.sqrt(gx*gx + gy*gy);
        sum += mag;
      }
    }
    // Normalize roughly by number of pixels
    return sum / (w*h);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <StepHeader step={file ? (result ? 3 : 2) : 1} />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Analyze Food Label</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Capture with camera or upload from device. Make sure label text is clear and fills the frame.</p>
        <div className="text-xs text-gray-500 space-y-0.5">
          <p>Guest remaining: {getRemainingAnalyses()} of {MAX_FREE_ANALYSES}</p>
          {quota && (
            <p>User plan: {quota.role} {quota.unlimited ? '(unlimited)' : `(remaining ${quota.remaining} of ${quota.max})`}</p>
          )}
        </div>
        {!quota || (!quota.unlimited && quota.role==='free') ? (
          <LimitNotice plan={quota ? 'free' : 'guest'} remaining={quota ? quota.remaining : getRemainingAnalyses()} max={quota ? quota.max : MAX_FREE_ANALYSES} />
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button disabled={!file || busy || (quota && !quota.unlimited && quota.role==='free' && quota.remaining<=0) || (!canGuestAnalyze().ok)} onClick={onSubmit} className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition transform duration-300">
          Send to Analyze
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      {busy ? (
        <div className="min-h-[40vh] grid place-items-center">
          <LoaderFive text="Analyzing..." />
        </div>
      ) : (
      <>
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-4 sm:p-6 space-y-3 relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div>
              <p className="font-semibold text-neutral-800 dark:text-neutral-100">Use your camera</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-300">Start the camera, frame the food label and capture.</p>
            </div>
            <div className="relative aspect-video w-full rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden bg-black/40">
              <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none">
                <GridPattern />
              </div>
              {!cameraOn && (
                <div className="absolute inset-0 z-20 flex items-center justify-center text-neutral-200/80 text-xs">
                  Start camera to preview
                </div>
              )}
              <video ref={videoRef} className="relative z-10 w-full h-full object-contain" playsInline muted />
              <div className="absolute top-2 right-2 z-20">
                <BlurIndicator score={blurScore} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={startCamera} className="w-full sm:w-auto justify-center px-3 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 transition transform duration-300">Start Camera</button>
              <button onClick={captureFrame} className="w-full sm:w-auto justify-center px-3 py-2 rounded-md border border-neutral-200/60 dark:border-neutral-800/60">Capture</button>
              <button onClick={stopCamera} className="w-full sm:w-auto justify-center px-3 py-2 rounded-md border border-neutral-200/60 dark:border-neutral-800/60">Stop</button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-4 space-y-3">
          <div className="w-full max-w-4xl mx-auto min-h-40 border border-dashed bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-lg">
            <FileUpload onChange={handleFileUpload} />
          </div>
          {preview && (
            <div className="space-y-2">
              <img src={preview} alt="preview" className="w-full rounded-xl border" />
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-neutral-600 dark:text-neutral-300">Tip: Ensure the label is well-lit and not skewed.</div>
                <BlurIndicator score={blurScore} />
              </div>
              <button onClick={clearImage} className="w-full sm:w-auto px-3 py-2 rounded-md border transition transform duration-300">Clear Image</button>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Ingredients</h2>
              {result.grade && (
                <span className={`inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-md text-sm font-semibold ${gradeClass(result.grade)}`}>{result.grade}</span>
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

          <div className="rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-3 sm:p-4">
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

          <div className="md:col-span-2 rounded-2xl border backdrop-blur bg-white/60 dark:bg-black/30 p-3 sm:p-4 space-y-2">
            <h2 className="font-semibold">Health Analysis</h2>
            <p className="text-sm whitespace-pre-wrap">{result.health_analysis}</p>
            {(() => {
              const plan: 'guest'|'free'|'pro' = quota ? (quota.unlimited ? 'pro' : (quota.role === 'free' ? 'free' : 'pro')) : 'guest';
              return (<SaveShareBar
              canSave={!result.saved}
              onSave={onSubmit}
              onShare={() => navigator.share ? navigator.share({ title: 'EatWise Report', text: 'Food label analysis from EatWise' }).catch(()=>{}) : null}
              onUpgrade={() => window.location.href = '/profile'}
              plan={plan}
            />);
            })()}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}


