import { Button } from "@/components/axis/Button";
import { Input, Label } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { scanMealPhoto } from "@/lib/ai.functions";
import { useAuth, useProfile } from "@/lib/auth";
import { DEFAULT_MODEL_ID, MODELS, canUseModel, effectiveTier, tierConfig } from "@/lib/tiers";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Lock, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Estimate = {
  name: string;
  confidence: "low" | "medium" | "high";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  note: string;
  items: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>;
};

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.readAsDataURL(file);
  });
}

export function MealScanner({ onLogged }: { onLogged: () => void }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);
  const fileRef = useRef<HTMLInputElement>(null);

  const visionModel =
    MODELS.filter((m) => m.vision && canUseModel(tier, m)).find((m) => m.id === DEFAULT_MODEL_ID) ??
    MODELS.filter((m) => m.vision && canUseModel(tier, m)).pop();

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  const scanFn = useServerFn(scanMealPhoto);

  const scan = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("Pick a photo first");
      return (await scanFn({
        data: {
          imageDataUrl: preview,
          modelId: visionModel?.id ?? "axis-swift",
          ...(hint.trim() ? { hint: hint.trim() } : {}),
        },
      })) as Estimate;
    },
    onSuccess: (res) => setEstimate(res),
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!estimate) return;
      const { data: log, error } = await supabase
        .from("nutrition_logs")
        .insert({
          user_id: user!.id,
          items_json: estimate.items.length
            ? estimate.items
            : [
                {
                  name: estimate.name,
                  calories: estimate.calories,
                  protein: estimate.protein_g,
                  carbs: estimate.carbs_g,
                  fat: estimate.fat_g,
                },
              ],
          calories: Math.round(estimate.calories),
          protein_g: estimate.protein_g,
          carbs_g: estimate.carbs_g,
          fat_g: estimate.fat_g,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (file) {
        const path = `${user!.id}/${log.id}-${Date.now()}.${(file.name.split(".").pop() ?? "jpg").toLowerCase()}`;
        const { error: upErr } = await supabase.storage.from("meal-photos").upload(path, file);
        if (!upErr) {
          await supabase.from("meal_photos").insert({
            user_id: user!.id,
            nutrition_log_id: log.id,
            photo_url: path,
          });
        }
      }
    },
    onSuccess: () => {
      setEstimate(null);
      setPreview(null);
      setFile(null);
      setHint("");
      if (fileRef.current) fileRef.current.value = "";
      onLogged();
      toast.success("Meal logged from photo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!config.mealScan) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Lock className="h-4 w-4 text-muted-foreground" /> Meal photo scanning
        </div>
        <p className="text-xs text-muted-foreground">
          Snap a photo and let AXIS estimate calories and macros for you. Available on Plus and above.
        </p>
        <Link to="/plans">
          <Button className="w-full" variant="outline">
            See plans
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 8_000_000) {
            toast.error("That photo is over 8 MB — try a smaller one");
            return;
          }
          setFile(f);
          setEstimate(null);
          setPreview(await readFile(f));
        }}
      />

      {preview ? (
        <img
          src={preview}
          alt="Meal to be analysed"
          className="h-40 w-full rounded-xl border border-border object-cover"
        />
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Camera className="h-6 w-6" />
          <span className="text-xs">Take or choose a meal photo</span>
        </button>
      )}

      <div>
        <Label htmlFor="scan-hint">Anything AXIS should know? (optional)</Label>
        <Input
          id="scan-hint"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Large portion, cooked in olive oil"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
          {preview ? "Change photo" : "Choose photo"}
        </Button>
        <Button
          className="flex-1"
          disabled={!preview || scan.isPending}
          onClick={() => scan.mutate()}
        >
          <Sparkles className="h-4 w-4" /> {scan.isPending ? "Analysing…" : "Scan meal"}
        </Button>
      </div>

      {estimate ? (
        <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
          <p className="text-sm font-medium text-foreground">{estimate.name}</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(estimate.calories)} kcal · {Math.round(estimate.protein_g)}p /{" "}
            {Math.round(estimate.carbs_g)}c / {Math.round(estimate.fat_g)}f ·{" "}
            {estimate.confidence} confidence
          </p>
          {estimate.items.length ? (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {estimate.items.map((i, idx) => (
                <li key={idx}>
                  {i.name} — {Math.round(i.calories)} kcal
                </li>
              ))}
            </ul>
          ) : null}
          {estimate.note ? (
            <p className="text-xs text-muted-foreground italic">{estimate.note}</p>
          ) : null}
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Logging…" : "Log this meal"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Estimates are approximate — edit later by logging manually if you know the exact numbers.
          </p>
        </div>
      ) : null}
    </div>
  );
}
