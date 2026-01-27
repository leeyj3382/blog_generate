import { AuthGate } from "@/components/AuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen">{children}</div>
    </AuthGate>
  );
}
