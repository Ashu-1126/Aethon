"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { documents, ApiError, IS_MOCK } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Document, DocStatus, IngestProgress } from "@/lib/types";
import { PageHero } from "@/components/layout/PageHero";

const ACCEPTED = [".pdf", ".docx", ".xlsx", ".csv", ".txt", ".png", ".jpg", ".html", ".htm"];
const MAX_MB = 50;

type QueueItem = {
  id: string;
  name: string;
  stage: DocStatus;
  progress: number;
  error?: string;
};

const stageLabel: Record<DocStatus, string> = {
  queued: "Queued",
  parsing: "Parsing",
  embedding: "Embedding",
  indexed: "Indexed",
  failed: "Failed",
};

export default function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshDocs = useCallback(async () => {
    try {
      setDocs(await documents.list());
    } catch {
      /* list is best-effort */
    }
  }, []);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  // Live ingestion progress over WebSocket (real backend mode)
  useWebSocket<IngestProgress>("/ws/ingest", (p) => {
    setQueue((q) =>
      q.map((it) => (it.id === p.id ? { ...it, stage: p.stage, progress: p.progress } : it))
    );
    if (p.stage === "indexed") refreshDocs();
  });

  // In mock mode there's no socket — fake the progress so the page is demoable.
  function simulateProgress(id: string) {
    if (!IS_MOCK) return;
    const steps: [DocStatus, number, number][] = [
      ["parsing", 30, 500],
      ["embedding", 70, 1100],
      ["indexed", 100, 1700],
    ];
    steps.forEach(([stage, progress, ms]) => {
      setTimeout(() => {
        setQueue((q) => q.map((it) => (it.id === id ? { ...it, stage, progress } : it)));
        if (stage === "indexed") refreshDocs();
      }, ms);
    });
  }

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!ACCEPTED.includes(ext)) {
          setQueue((q) => [
            { id: `err-${file.name}-${Date.now()}`, name: file.name, stage: "failed", progress: 0, error: "Unsupported file type" },
            ...q,
          ]);
          continue;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          setQueue((q) => [
            { id: `err-${file.name}-${Date.now()}`, name: file.name, stage: "failed", progress: 0, error: `File exceeds ${MAX_MB} MB` },
            ...q,
          ]);
          continue;
        }
        try {
          const doc = await documents.upload(file);
          setQueue((q) => [{ id: doc.id, name: doc.name, stage: doc.status, progress: 5 }, ...q]);
          simulateProgress(doc.id);
        } catch (e) {
          const msg =
            e instanceof ApiError && e.offline
              ? "Backend offline"
              : e instanceof ApiError
                ? e.message
                : "Upload failed";
          setQueue((q) => [
            { id: `err-${file.name}-${Date.now()}`, name: file.name, stage: "failed", progress: 0, error: msg },
            ...q,
          ]);
        }
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer 
        size="narrow"
        hero={
          <PageHero 
            badgeLabel="✦ Data"
            badgeText="Ingestion"
            title1="Feed"
            title2="the Brain"
            description="Drop drawings, manuals, procedures, regulations or incident reports. Each one is parsed, embedded and woven into the knowledge graph automatically."
          />
        }
      >

          {/* dropzone */}
          <Reveal delay={0.1}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={`glass-glow mt-8 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-14 ${
                dragging ? "border-tealGlow bg-teal/5 shadow-glow-teal" : "border-border"
              }`}
            >
              <motion.span
                animate={dragging ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/30 bg-teal/10 text-tealGlow"
              >
                <UploadCloud className="h-7 w-7" strokeWidth={1.5} />
              </motion.span>
              <p className="text-sm font-medium">
                {dragging ? "Release to ingest" : "Drag & drop files, or click to browse"}
              </p>
              <p className="font-mono text-[11px] text-muted">
                {ACCEPTED.join("  ·  ")} — up to {MAX_MB} MB
              </p>
              <input
                id="file-upload"
                name="file-upload"
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          </Reveal>

          {/* live queue */}
          <AnimatePresence>
            {queue.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 space-y-3"
              >
                {queue.map((it) => (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted" />
                        {it.name}
                      </div>
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        {it.stage === "failed" ? (
                          <span className="flex items-center gap-1 text-danger">
                            <XCircle className="h-3.5 w-3.5" /> {it.error}
                          </span>
                        ) : it.stage === "indexed" ? (
                          <span className="flex items-center gap-1 text-tealGlow">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Indexed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stageLabel[it.stage]}
                          </span>
                        )}
                      </span>
                    </div>
                    {it.stage !== "failed" && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <motion.div
                          animate={{ width: `${it.progress}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full bg-gradient-to-r from-teal to-gold"
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* indexed corpus */}
          <Reveal delay={0.2}>
            <h2 className="display mb-4 mt-12 text-lg font-semibold">Indexed Corpus</h2>
            {docs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents yet"
                message="Upload your first document to begin building the operations brain."
              />
            ) : (
              <div className="space-y-2">
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-base/50 px-4 py-3 transition-colors hover:border-teal/30 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3 text-sm">
                      <FileText className="h-4 w-4 flex-none text-muted" />
                      <span className="truncate">{d.name}</span>
                      <span className="flex-none font-mono text-[10px] text-muted">{d.pages}p</span>
                    </div>
                    <span
                      className={`chip flex-none ${
                        d.status === "indexed" ? "" : "border-gold/20 bg-gold/10 text-goldGlow"
                      }`}
                    >
                      {stageLabel[d.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
      </PageContainer>
    </div>
  );
}
