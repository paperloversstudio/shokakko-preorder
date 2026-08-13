import Link from "next/link";

export function FloatingAdminButton() {
  return (
    <Link
      href="/admin/login"
      aria-label="Admin login"
      title="Admin login"
      className="fixed bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-pill bg-ink/80 text-lg text-white shadow-lg backdrop-blur transition hover:bg-ink"
    >
      🔐
    </Link>
  );
}
