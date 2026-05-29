"use client";

import { useSpeechPersonalization } from "@/hooks/use-speech-personalization";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";

type SpeechPersonalizationSettingsProps = {
  userId: string;
};

export function SpeechPersonalizationSettings({
  userId,
}: SpeechPersonalizationSettingsProps) {
  const { prefs, loading, addTerm, deleteTerm, deleteCorrection } =
    useSpeechPersonalization(userId);
  const [phrase, setPhrase] = useState("");
  const [replacement, setReplacement] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAddTerm = async () => {
    if (!phrase.trim() || !replacement.trim()) return;
    setBusy(true);
    try {
      await addTerm(phrase, replacement);
      setPhrase("");
      setReplacement("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Speech vocabulary</CardTitle>
        <CardDescription>
          Custom terms and corrections stay on this device (IndexedDB). Applied
          to on-device Whisper and browser speech transcripts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Add term</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              placeholder="Heard as (e.g. migiude)"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
            />
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              placeholder="Show as (e.g. Migiude)"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={busy || !phrase.trim() || !replacement.trim()}
            onClick={() => void handleAddTerm()}
          >
            Add term
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <>
            {prefs.terms.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {prefs.terms.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
                  >
                    <span>
                      <span className="text-muted-foreground">{t.phrase}</span>
                      {" → "}
                      <span className="font-medium">{t.replacement}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => void deleteTerm(t.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                No custom terms yet. Add product names or jargon you say often.
              </p>
            )}

            {prefs.corrections.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Learned corrections
                </p>
                <ul className="space-y-1 text-sm">
                  {prefs.corrections.slice(0, 12).map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
                    >
                      <span>
                        <span className="line-through opacity-60">
                          {c.from}
                        </span>
                        {" → "}
                        <span className="font-medium">{c.to}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 text-xs"
                        onClick={() => void deleteCorrection(c.id)}
                      >
                        Forget
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
