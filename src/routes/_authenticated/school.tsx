import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Select, Textarea } from "@/components/axis/Field";
import { StatCard } from "@/components/axis/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, GraduationCap, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/school")({
  head: () => ({
    meta: [
      { title: "School — applications and deadlines in AXIS" },
      {
        name: "description",
        content:
          "Track target schools, application status, deadlines and per-school checklists alongside your academic profile.",
      },
      { property: "og:title", content: "School — applications and deadlines in AXIS" },
      {
        property: "og:description",
        content: "Target schools, deadlines, checklists and your academic profile in one view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolPage,
});

const STATUSES = ["researching", "applying", "submitted", "interview", "accepted", "rejected"] as const;
const STATUS_TONE: Record<string, string> = {
  researching: "text-muted-foreground",
  applying: "text-primary",
  submitted: "text-primary",
  interview: "text-warning",
  accepted: "text-success",
  rejected: "text-destructive",
};
const DEFAULT_ITEMS = ["Transcript", "Personal essay", "Recommendation letters", "Test scores", "Application fee"];

const iso = (d: Date) => d.toISOString().slice(0, 10);

function SchoolPage() {
  return (
    <>
      <Header title="School" subtitle="Every application, deadline and document in one place" />
      <div className="space-y-5">
        <AcademicProfile />
        <Schools />
      </div>
    </>
  );
}

function AcademicProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["school_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [gpa, setGpa] = useState("");
  const [scores, setScores] = useState("");
  const [extras, setExtras] = useState("");
  const [major, setMajor] = useState("");

  const startEdit = () => {
    setGpa(profile?.gpa ?? "");
    setScores(profile?.test_scores ?? "");
    setExtras(profile?.extracurriculars ?? "");
    setMajor(profile?.intended_major ?? "");
    setEditing(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        gpa: gpa.trim() || null,
        test_scores: scores.trim() || null,
        extracurriculars: extras.trim() || null,
        intended_major: major.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (profile) {
        const { error } = await supabase.from("school_profiles").update(payload).eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_profiles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["school_profile"] });
      toast.success("Academic profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardTitle
        action={
          !editing ? (
            <Button size="sm" variant="outline" onClick={startEdit}>
              {profile ? "Edit" : "Add details"}
            </Button>
          ) : null
        }
      >
        Academic profile
      </CardTitle>
      {editing ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-gpa">GPA / percentage</Label>
              <Input id="s-gpa" value={gpa} onChange={(e) => setGpa(e.target.value)} placeholder="3.8 / 92%" />
            </div>
            <div>
              <Label htmlFor="s-major">Intended major</Label>
              <Input
                id="s-major"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="Computer Science"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="s-scores">Test scores</Label>
            <Input
              id="s-scores"
              value={scores}
              onChange={(e) => setScores(e.target.value)}
              placeholder="SAT 1480, IELTS 7.5"
            />
          </div>
          <div>
            <Label htmlFor="s-extras">Extracurriculars</Label>
            <Textarea
              id="s-extras"
              rows={3}
              value={extras}
              onChange={(e) => setExtras(e.target.value)}
              placeholder="Football captain, robotics club, volunteering"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : profile ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GPA" value={profile.gpa} />
          <Field label="Intended major" value={profile.intended_major} />
          <Field label="Test scores" value={profile.test_scores} />
          <Field label="Extracurriculars" value={profile.extracurriculars} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add your GPA, scores and activities so everything you need for applications lives here.
        </p>
      )}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function Schools() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<string>("researching");
  const [notes, setNotes] = useState("");
  const today = iso(new Date());

  const { data: schools, isLoading } = useQuery({
    queryKey: ["target_schools", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("target_schools")
        .select("*")
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: checklist } = useQuery({
    queryKey: ["school_checklist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_checklist").select("*");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["target_schools"] });
    qc.invalidateQueries({ queryKey: ["school_checklist"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const addSchool = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("target_schools")
        .insert({
          user_id: user!.id,
          school_name: name.trim(),
          deadline: deadline || null,
          status,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: cErr } = await supabase
        .from("school_checklist")
        .insert(DEFAULT_ITEMS.map((item_name) => ({ school_id: data.id, item_name })));
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      setName("");
      setDeadline("");
      setNotes("");
      invalidate();
      toast.success("School added with a starter checklist");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from("target_schools").update({ status: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSchool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("target_schools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("School removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleItem = useMutation({
    mutationFn: async (item: { id: string; is_complete: boolean }) => {
      const { error } = await supabase
        .from("school_checklist")
        .update({ is_complete: !item.is_complete })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async ({ schoolId, itemName }: { schoolId: string; itemName: string }) => {
      const { error } = await supabase
        .from("school_checklist")
        .insert({ school_id: schoolId, item_name: itemName });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_checklist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const list = schools ?? [];
  const items = checklist ?? [];
  const upcoming = list.filter((s) => s.deadline && s.deadline >= today).length;
  const submitted = list.filter((s) => ["submitted", "interview", "accepted"].includes(s.status)).length;
  const nextDeadline = list.find((s) => s.deadline && s.deadline >= today)?.deadline ?? "—";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Target schools" value={list.length} icon={GraduationCap} tone="accent" />
        <StatCard label="Submitted or further" value={submitted} tone="success" />
        <StatCard label="Next deadline" value={nextDeadline} hint={`${upcoming} upcoming`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <p className="text-sm text-muted-foreground">Loading schools…</p>
            </Card>
          ) : list.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">
                No target schools yet. Add your first one on the right.
              </p>
            </Card>
          ) : (
            list.map((s) => {
              const own = items.filter((i) => i.school_id === s.id);
              const doneCount = own.filter((i) => i.is_complete).length;
              return (
                <Card key={s.id}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{s.school_name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.deadline ? (
                          <span className={s.deadline < today ? "text-destructive" : ""}>
                            Deadline {s.deadline}
                          </span>
                        ) : (
                          "No deadline set"
                        )}
                        {own.length ? ` · ${doneCount}/${own.length} documents ready` : ""}
                      </p>
                      {s.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        aria-label="Application status"
                        value={s.status}
                        onChange={(e) => updateStatus.mutate({ id: s.id, value: e.target.value })}
                        className={cn("h-9 w-36 capitalize", STATUS_TONE[s.status])}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st} className="capitalize">
                            {st}
                          </option>
                        ))}
                      </Select>
                      <button
                        aria-label="Delete school"
                        onClick={() => removeSchool.mutate(s.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {own.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 text-sm">
                        <button
                          aria-label={`Toggle ${i.item_name}`}
                          onClick={() => toggleItem.mutate({ id: i.id, is_complete: i.is_complete })}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                            i.is_complete
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border text-transparent hover:border-primary",
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <span
                          className={cn(
                            "flex-1",
                            i.is_complete ? "text-muted-foreground line-through" : "text-foreground",
                          )}
                        >
                          {i.item_name}
                        </span>
                        <button
                          aria-label="Delete item"
                          onClick={() => removeItem.mutate(i.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.elements.namedItem("item") as HTMLInputElement;
                      if (!input.value.trim()) return;
                      addItem.mutate({ schoolId: s.id, itemName: input.value.trim() });
                      input.value = "";
                    }}
                  >
                    <Input name="item" placeholder="Add a checklist item" className="h-9" />
                    <Button type="submit" size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                </Card>
              );
            })
          )}
        </div>

        <Card className="h-fit">
          <CardTitle>New target school</CardTitle>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              addSchool.mutate();
            }}
          >
            <div>
              <Label htmlFor="sc-name">School name</Label>
              <Input
                id="sc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="University of Toronto"
                required
              />
            </div>
            <div>
              <Label htmlFor="sc-deadline">Deadline</Label>
              <Input
                id="sc-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sc-status">Status</Label>
              <Select
                id="sc-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="capitalize"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st} className="capitalize">
                    {st}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="sc-notes">Notes</Label>
              <Textarea
                id="sc-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scholarship deadline is earlier"
              />
            </div>
            <Button type="submit" className="w-full" disabled={addSchool.isPending}>
              <Plus className="h-4 w-4" /> {addSchool.isPending ? "Adding…" : "Add school"}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
