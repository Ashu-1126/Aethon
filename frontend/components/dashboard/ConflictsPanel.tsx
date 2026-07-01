"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertTriangle, GitCompareArrows } from "lucide-react";
import { conflicts } from "@/lib/api";
import type { Conflict } from "@/lib/types";
import { ExpandOnClick } from "@/components/ui/expand-on-click";
import { PanelExpand } from "@/components/ui/panel-expand";

export function ConflictsPanel() {
  const [items, setItems] = useState<Conflict[] | null>(null);

  useEffect(() => {
    conflicts.list().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <PanelExpand render={() => (
    <div id="conflicts" className="glass-glow p-6">
      <div className="mb-5 flex items-center gap-2">
        <GitCompareArrows className="h-4 w-4 text-goldGlow" />
        <h2 className="display text-lg font-semibold">Open Conflicts</h2>
      </div>

      {items === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No unresolved conflicts. 🎉</p>
      ) : (
        <div className="space-y-3">
          {items.map((c, i) => {
            const collapsed = (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-base/50 px-4 py-3 transition-colors hover:border-gold/40"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 flex-none text-goldGlow" />
                    <span className="font-mono text-danger">{c.value_a}</span>
                    <span className="text-muted">vs</span>
                    <span className="font-mono text-danger">{c.value_b}</span>
                    <span className="truncate text-muted">· {c.field}</span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
                    {c.doc_a} ↔ {c.doc_b}
                  </p>
                </div>
                <span className="flex-none rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs text-tealGlow">
                  Resolve
                </span>
              </motion.div>
            );

            const expanded = (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-goldGlow" />
                  <h3 className="display text-xl font-semibold">Document conflict</h3>
                </div>
                <p className="mb-5 text-sm text-muted">
                  Two sources disagree on <span className="text-text">{c.field}</span> — this
                  contradiction is flagged before it reaches the shop floor.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {[{ doc: c.doc_a, val: c.value_a }, { doc: c.doc_b, val: c.value_b }].map((d, di) => (
                    <div key={di} className="rounded-xl border border-border bg-base/50 p-4 text-center">
                      <p className="font-mono text-[11px] text-muted">{d.doc}</p>
                      <p className="mt-2 font-mono text-2xl font-semibold text-danger">{d.val}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex gap-3">
                  <button className="flex-1 rounded-full border border-teal/30 bg-teal/10 px-4 py-2 text-sm text-tealGlow transition-colors hover:bg-teal/20">
                    Accept {c.doc_a}
                  </button>
                  <button className="flex-1 rounded-full border border-teal/30 bg-teal/10 px-4 py-2 text-sm text-tealGlow transition-colors hover:bg-teal/20">
                    Accept {c.doc_b}
                  </button>
                </div>
              </div>
            );

            return <ExpandOnClick key={i} collapsed={collapsed} expanded={expanded} accent="gold" />;
          })}
        </div>
      )}
    </div>
    )} />
  );
}
