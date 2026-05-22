import Image from "next/image";

/** Full-screen splash (docs/P6SY6.jpg → public/branding/loading.jpg). */
export function AppLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      role="status"
      aria-label="Loading Migiude"
    >
      <Image
        src="/branding/loading.jpg"
        alt=""
        fill
        priority
        unoptimized
        className="object-cover"
        sizes="100vw"
      />
    </div>
  );
}
