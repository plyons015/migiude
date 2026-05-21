import { ListenMode } from "@/components/listen/listen-mode";

export const metadata = {
  title: "Listen — Migiude",
  description: "Live voice transcription",
};

export default function ListenPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ListenMode />
    </main>
  );
}
