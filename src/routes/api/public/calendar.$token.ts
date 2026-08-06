import { createFileRoute } from "@tanstack/react-router";

function esc(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function stamp(date: Date) {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function dayValue(iso: string) {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return dayValue(d.toISOString().slice(0, 10));
}

export const Route = createFileRoute("/api/public/calendar/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = String(params.token ?? "").replace(/\.ics$/i, "");
        if (!/^[a-f0-9]{32,64}$/i.test(token)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: feed } = await supabaseAdmin
          .from("calendar_feeds")
          .select("user_id")
          .eq("token", token)
          .maybeSingle();
        if (!feed) return new Response("Not found", { status: 404 });

        const [{ data: tasks }, { data: schools }] = await Promise.all([
          supabaseAdmin
            .from("tasks")
            .select("id, title, description, due_date, category, is_priority, is_complete")
            .eq("user_id", feed.user_id)
            .not("due_date", "is", null)
            .limit(500),
          supabaseAdmin
            .from("target_schools")
            .select("id, school_name, deadline, status, notes")
            .eq("user_id", feed.user_id)
            .not("deadline", "is", null)
            .limit(200),
        ]);

        const now = stamp(new Date());
        const lines = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//AXIS//Life OS//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "X-WR-CALNAME:AXIS",
          "X-WR-CALDESC:Tasks and application deadlines from AXIS",
          "X-PUBLISHED-TTL:PT1H",
          "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
        ];

        for (const t of tasks ?? []) {
          if (!t.due_date) continue;
          lines.push(
            "BEGIN:VEVENT",
            `UID:task-${t.id}@axis`,
            `DTSTAMP:${now}`,
            `DTSTART;VALUE=DATE:${dayValue(t.due_date)}`,
            `DTEND;VALUE=DATE:${nextDay(t.due_date)}`,
            `SUMMARY:${esc(`${t.is_complete ? "✓ " : ""}${t.is_priority ? "★ " : ""}${t.title}`)}`,
            `DESCRIPTION:${esc(t.description ?? "")}`,
            `CATEGORIES:${esc(t.category)}`,
            "END:VEVENT",
          );
        }

        for (const s of schools ?? []) {
          if (!s.deadline) continue;
          lines.push(
            "BEGIN:VEVENT",
            `UID:school-${s.id}@axis`,
            `DTSTAMP:${now}`,
            `DTSTART;VALUE=DATE:${dayValue(s.deadline)}`,
            `DTEND;VALUE=DATE:${nextDay(s.deadline)}`,
            `SUMMARY:${esc(`🎓 ${s.school_name} deadline`)}`,
            `DESCRIPTION:${esc(`Status: ${s.status}${s.notes ? `\n${s.notes}` : ""}`)}`,
            "CATEGORIES:School",
            "BEGIN:VALARM",
            "TRIGGER:-P7D",
            "ACTION:DISPLAY",
            `DESCRIPTION:${esc(`${s.school_name} deadline in one week`)}`,
            "END:VALARM",
            "END:VEVENT",
          );
        }

        lines.push("END:VCALENDAR");

        return new Response(lines.join("\r\n"), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Disposition": 'inline; filename="axis.ics"',
          },
        });
      },
    },
  },
});
