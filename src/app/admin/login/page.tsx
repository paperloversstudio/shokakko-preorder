import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const nextParam = params.next;
  const next = typeof nextParam === "string" ? nextParam : "/admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-mint/40 via-cream to-lavender/30 px-4">
      <div className="w-full max-w-sm rounded-card bg-white/90 p-8 shadow-lg shadow-ink/5 backdrop-blur">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center font-display text-xl font-bold">
          Admin sign in
        </h1>
        <p className="mb-6 text-center text-sm text-ink-soft">
          Manage products and view submitted pre-orders.
        </p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
