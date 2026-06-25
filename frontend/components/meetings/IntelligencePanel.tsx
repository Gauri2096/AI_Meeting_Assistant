"use client";

import React, { useState } from "react";
import { MeetingIntelligence, Topic, Quote, ActionItem } from "@/types/intelligence";

interface IntelligencePanelProps {
  intelligence: MeetingIntelligence | null;
  loading: boolean;
  error: string | null;
  isEditable: boolean;
  onChange?: (val: MeetingIntelligence) => void;
}

export default function IntelligencePanel({
  intelligence,
  loading,
  error,
  isEditable,
  onChange,
}: IntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<
    "summary" | "topics" | "decisions" | "actionItems" | "risks" | "quotes"
  >("summary");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
        <p className="text-sm text-muted-text">Loading intelligence details...</p>
      </div>
    );
  }

  if (error || !intelligence) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-card-border bg-card-bg text-center h-full shadow-sm">
        <div className="rounded-full bg-accent-secondary p-3 border border-accent-primary/20 text-accent-primary mb-4">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Intelligence Loading Fallback</h3>
        <p className="text-sm text-muted-text max-w-sm">
          {error ? `API status: ${error}` : "Intelligence is being prepared by the AI Model."}
        </p>
        <div className="mt-6 p-4 rounded-xl border border-card-border bg-background text-left text-xs font-mono text-muted-text max-w-md w-full">
          GET /meetings/[meetingId]/intelligence
        </div>
      </div>
    );
  }

  // Update handlers
  const updateSummary = (newSummary: string) => {
    if (onChange) {
      onChange({ ...intelligence, summary: newSummary });
    }
  };

  const updateDecisions = (newDecisions: string[]) => {
    if (onChange) {
      onChange({ ...intelligence, decisions: newDecisions });
    }
  };

  const updateTopics = (newTopics: Topic[]) => {
    if (onChange) {
      onChange({ ...intelligence, topics_discussed: newTopics });
    }
  };

  const updateRisks = (newRisks: string[]) => {
    if (onChange) {
      onChange({ ...intelligence, risks_and_concerns: newRisks });
    }
  };

  const updateQuotes = (newQuotes: Quote[]) => {
    if (onChange) {
      onChange({ ...intelligence, notable_quotes: newQuotes });
    }
  };

  const updateActionItems = (newActionItems: ActionItem[]) => {
    if (onChange) {
      onChange({ ...intelligence, action_items: newActionItems });
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-card-border bg-background/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground font-sans">Meeting Intelligence</h2>
          <p className="text-xs text-muted-text">
            {isEditable ? "Review and edit the extracted insights below" : "Read-only summary of intelligence"}
          </p>
        </div>
        {intelligence.confidence !== undefined && (
          <div className="flex items-center space-x-1 bg-background px-2 py-1 rounded-lg border border-card-border">
            <span className="text-[10px] text-muted-text font-semibold uppercase">Confidence:</span>
            <span className={`text-[10px] font-bold ${
              intelligence.confidence >= 0.8
                ? "text-emerald-600 dark:text-emerald-400"
                : intelligence.confidence >= 0.5
                ? "text-amber-600 dark:text-amber-400"
                : "text-rose-600 dark:text-rose-400"
            }`}>
              {(intelligence.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-card-border bg-background/30 overflow-x-auto scrollbar-none">
        {(
          [
            { id: "summary", label: "Summary" },
            { id: "topics", label: "Topics" },
            { id: "decisions", label: "Decisions" },
            { id: "actionItems", label: "Actions" },
            { id: "risks", label: "Risks" },
            { id: "quotes", label: "Quotes" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-4 text-xs font-semibold border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-accent-primary text-accent-primary bg-background/50"
                : "border-transparent text-muted-text hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-h-[600px] scrollbar-thin">
        
        {/* SUMMARY TAB */}
        {activeTab === "summary" && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-muted-text uppercase tracking-wider">Executive Summary</h3>
            {isEditable ? (
              <textarea
                value={intelligence.summary}
                onChange={(e) => updateSummary(e.target.value)}
                rows={10}
                className="w-full rounded-xl bg-background border border-card-border p-4 text-sm text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary transition-all duration-200 resize-y"
                placeholder="Enter executive summary..."
              />
            ) : (
              <p className="text-sm text-foreground leading-relaxed bg-background p-4 rounded-xl border border-card-border/60 whitespace-pre-wrap">
                {intelligence.summary || "No summary generated."}
              </p>
            )}
          </div>
        )}

        {/* TOPICS TAB */}
        {activeTab === "topics" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-muted-text uppercase tracking-wider">Topics Discussed</h3>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => updateTopics([...(intelligence.topics_discussed || []), { title: "", discussion: "" }])}
                  className="flex items-center space-x-1 text-xs font-semibold text-accent-primary hover:opacity-90 cursor-pointer"
                >
                  <span>+ Add Topic</span>
                </button>
              )}
            </div>

            {!intelligence.topics_discussed || intelligence.topics_discussed.length === 0 ? (
              <p className="text-sm text-muted-text italic">No topics discussed identified.</p>
            ) : (
              <div className="space-y-4">
                {intelligence.topics_discussed.map((topic, idx) => (
                  <div key={idx} className="relative bg-background border border-card-border p-4 rounded-xl space-y-3 group">
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...intelligence.topics_discussed];
                          updated.splice(idx, 1);
                          updateTopics(updated);
                        }}
                        className="absolute top-3 right-3 text-muted-text hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove Topic"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    {isEditable ? (
                      <div className="space-y-3 pr-6">
                        <div>
                          <label className="block text-[10px] font-bold text-muted-text uppercase tracking-wider mb-1">Topic Title</label>
                          <input
                            type="text"
                            value={topic.title}
                            onChange={(e) => {
                              const updated = [...intelligence.topics_discussed];
                              updated[idx] = { ...topic, title: e.target.value };
                              updateTopics(updated);
                            }}
                            placeholder="Topic Title"
                            className="w-full rounded-lg bg-background border border-card-border px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-text uppercase tracking-wider mb-1">Discussion Details</label>
                          <textarea
                            value={topic.discussion}
                            onChange={(e) => {
                              const updated = [...intelligence.topics_discussed];
                              updated[idx] = { ...topic, discussion: e.target.value };
                              updateTopics(updated);
                            }}
                            placeholder="Enter discussion details..."
                            rows={3}
                            className="w-full rounded-lg bg-background border border-card-border p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-sm font-bold text-foreground">{topic.title}</h4>
                        <p className="text-xs text-muted-text leading-relaxed">{topic.discussion}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DECISIONS TAB */}
        {activeTab === "decisions" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-muted-text uppercase tracking-wider">Decisions Made</h3>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => updateDecisions([...(intelligence.decisions || []), ""])}
                  className="flex items-center space-x-1 text-xs font-semibold text-accent-primary hover:opacity-90 cursor-pointer"
                >
                  <span>+ Add Decision</span>
                </button>
              )}
            </div>

            {!intelligence.decisions || intelligence.decisions.length === 0 ? (
              <p className="text-sm text-muted-text italic">No decisions identified.</p>
            ) : (
              <ul className="space-y-2.5">
                {intelligence.decisions.map((dec, idx) => (
                  <li key={idx} className="flex items-start space-x-3 bg-background border border-card-border p-3.5 rounded-xl relative group">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-secondary border border-accent-primary/20 text-xs font-bold text-accent-primary">
                      {idx + 1}
                    </span>
                    
                    {isEditable ? (
                      <div className="flex-1 flex items-center space-x-2 pr-6">
                        <input
                           type="text"
                           value={dec}
                           onChange={(e) => {
                             const updated = [...intelligence.decisions];
                             updated[idx] = e.target.value;
                             updateDecisions(updated);
                           }}
                           placeholder="Enter decision..."
                           className="flex-1 rounded-lg bg-background border border-card-border px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...intelligence.decisions];
                            updated.splice(idx, 1);
                            updateDecisions(updated);
                          }}
                          className="text-muted-text hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove Decision"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-foreground">{dec}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ACTION ITEMS TAB */}
        {activeTab === "actionItems" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-muted-text uppercase tracking-wider">Action Items</h3>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => updateActionItems([...(intelligence.action_items || []), { description: "", owner: "", deadline_mentioned: "" }])}
                  className="flex items-center space-x-1 text-xs font-semibold text-accent-primary hover:opacity-90 cursor-pointer"
                >
                  <span>+ Add Action Item</span>
                </button>
              )}
            </div>

            {!intelligence.action_items || intelligence.action_items.length === 0 ? (
              <p className="text-sm text-muted-text italic">No action items identified.</p>
            ) : (
              <div className="space-y-3">
                {intelligence.action_items.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 bg-background border border-card-border p-4 rounded-xl relative group">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent-secondary border border-card-border text-accent-primary mt-0.5">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    {isEditable ? (
                      <div className="flex-1 space-y-3 pr-6">
                        <textarea
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...intelligence.action_items];
                            updated[idx] = { ...item, description: e.target.value };
                            updateActionItems(updated);
                          }}
                          placeholder="Action item description..."
                          rows={2}
                          className="w-full rounded-lg bg-background border border-card-border p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-semibold text-muted-text uppercase tracking-wider mb-1">Owner</label>
                            <input
                              type="text"
                              value={item.owner || ""}
                              onChange={(e) => {
                                const updated = [...intelligence.action_items];
                                updated[idx] = { ...item, owner: e.target.value };
                                updateActionItems(updated);
                              }}
                              placeholder="e.g. Sarah Conners"
                              className="w-full rounded-lg bg-background border border-card-border px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-muted-text uppercase tracking-wider mb-1">Deadline Mentioned</label>
                            <input
                              type="text"
                              value={item.deadline_mentioned || ""}
                              onChange={(e) => {
                                const updated = [...intelligence.action_items];
                                updated[idx] = { ...item, deadline_mentioned: e.target.value };
                                updateActionItems(updated);
                              }}
                              placeholder="e.g. End of next week"
                              className="w-full rounded-lg bg-background border border-card-border px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                            />
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...intelligence.action_items];
                            updated.splice(idx, 1);
                            updateActionItems(updated);
                          }}
                          className="absolute top-4 right-4 text-muted-text hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove Action Item"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-foreground">{item.description}</p>
                        <div className="flex flex-wrap gap-2 pt-1.5">
                          {item.owner && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-secondary text-accent-primary border border-accent-primary/10">
                              Owner: {item.owner}
                            </span>
                          )}
                          {item.deadline_mentioned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-background text-muted-text border border-card-border">
                              Deadline: {item.deadline_mentioned}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RISKS TAB */}
        {activeTab === "risks" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-muted-text uppercase tracking-wider">Risks and Concerns</h3>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => updateRisks([...(intelligence.risks_and_concerns || []), ""])}
                  className="flex items-center space-x-1 text-xs font-semibold text-accent-primary hover:opacity-90 cursor-pointer"
                >
                  <span>+ Add Risk</span>
                </button>
              )}
            </div>

            {!intelligence.risks_and_concerns || intelligence.risks_and_concerns.length === 0 ? (
              <p className="text-sm text-muted-text italic">No risks or concerns identified.</p>
            ) : (
              <ul className="space-y-3">
                {intelligence.risks_and_concerns.map((risk, idx) => (
                  <li key={idx} className="flex items-start space-x-3 bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/25 p-3.5 rounded-xl relative group">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-extrabold font-mono">
                      !
                    </span>

                    {isEditable ? (
                      <div className="flex-1 flex items-center space-x-2 pr-6">
                        <input
                          type="text"
                          value={risk}
                          onChange={(e) => {
                            const updated = [...intelligence.risks_and_concerns];
                            updated[idx] = e.target.value;
                            updateRisks(updated);
                          }}
                          placeholder="Enter risk/concern..."
                          className="flex-1 rounded-lg bg-background border border-card-border px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...intelligence.risks_and_concerns];
                            updated.splice(idx, 1);
                            updateRisks(updated);
                          }}
                          className="text-muted-text hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove Risk"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-foreground">{risk}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* NOTABLE QUOTES TAB */}
        {activeTab === "quotes" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-muted-text uppercase tracking-wider">Notable Quotes</h3>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => updateQuotes([...(intelligence.notable_quotes || []), { speaker: "", quote: "" }])}
                  className="flex items-center space-x-1 text-xs font-semibold text-accent-primary hover:opacity-90 cursor-pointer"
                >
                  <span>+ Add Quote</span>
                </button>
              )}
            </div>

            {!intelligence.notable_quotes || intelligence.notable_quotes.length === 0 ? (
              <p className="text-sm text-muted-text italic">No notable quotes identified.</p>
            ) : (
              <div className="space-y-3">
                {intelligence.notable_quotes.map((quote, idx) => (
                  <div key={idx} className="bg-background border border-card-border p-4 rounded-xl space-y-2 relative group">
                    
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...intelligence.notable_quotes];
                          updated.splice(idx, 1);
                          updateQuotes(updated);
                        }}
                        className="absolute top-4 right-4 text-muted-text hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove Quote"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    {isEditable ? (
                      <div className="space-y-3 pr-6">
                        <div>
                          <label className="block text-[9px] font-semibold text-muted-text uppercase tracking-wider mb-1">Speaker</label>
                          <input
                            type="text"
                            value={quote.speaker}
                            onChange={(e) => {
                              const updated = [...intelligence.notable_quotes];
                              updated[idx] = { ...quote, speaker: e.target.value };
                              updateQuotes(updated);
                            }}
                            placeholder="e.g. Mike"
                            className="w-full rounded-lg bg-background border border-card-border px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold text-muted-text uppercase tracking-wider mb-1">Quote</label>
                          <textarea
                            value={quote.quote}
                            onChange={(e) => {
                              const updated = [...intelligence.notable_quotes];
                              updated[idx] = { ...quote, quote: e.target.value };
                              updateQuotes(updated);
                            }}
                            placeholder="Enter quote..."
                            rows={2}
                            className="w-full rounded-lg bg-background border border-card-border p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm italic text-foreground">"{quote.quote}"</p>
                        <div className="flex items-center space-x-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
                          <span className="text-xs font-semibold text-muted-text">— {quote.speaker}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
