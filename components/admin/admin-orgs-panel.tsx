"use client";

import { adminAddOrgMember, adminCreateOrg, adminListOrgs, adminRemoveOrgMember, adminUpdateOrg } from "@/lib/admin/client";
import type { AdminOrg } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AdminOrgsPanel() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSeats, setNewSeats] = useState("10");
  const [memberUid, setMemberUid] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await adminListOrgs();
      setOrgs(out.orgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orgs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organizations & business seats</CardTitle>
        <CardDescription>Create orgs, assign members, and manage seat limits.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Organization name"
            className="w-full max-w-xs rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={newSeats}
            onChange={(e) => setNewSeats(e.target.value)}
            placeholder="Seats"
            className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <Button
            type="button"
            size="sm"
            onClick={() =>
              void adminCreateOrg({
                name: newName.trim(),
                seatLimit: Number(newSeats),
              })
                .then(() => {
                  setNewName("");
                  setNewSeats("10");
                  return load();
                })
                .catch((e) => setError(String(e)))
            }
          >
            Create org
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
        {error ? <p className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {orgs.map((org) => (
              <li key={org.id} className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {org.name} · seats {org.memberCount}/{org.seatLimit}
                  </span>
                  <div className="flex gap-2">
                    <input
                      value={memberUid}
                      onChange={(e) => setMemberUid(e.target.value)}
                      placeholder="User UID"
                      className="w-44 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void adminAddOrgMember({ orgId: org.id, uid: memberUid.trim() })
                          .then(() => {
                            setMemberUid("");
                            return load();
                          })
                          .catch((e) => setError(String(e)))
                      }
                    >
                      Add member
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void adminUpdateOrg({ orgId: org.id, seatLimit: org.seatLimit + 1 })
                          .then(() => load())
                          .catch((e) => setError(String(e)))
                      }
                    >
                      +1 seat
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void adminRemoveOrgMember({ orgId: org.id, uid: memberUid.trim() })
                          .then(() => load())
                          .catch((e) => setError(String(e)))
                      }
                    >
                      Remove member
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
