import { PublicFooter } from "@/components/layout/public/PublicFooter";
import { PublicHeader } from "@/components/layout/public/PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `.line-public` is a scoping hook only (no box styling of its own). It lets
  // globals.css apply the token-driven public visual language (buttons, panels,
  // hover lights) to every off-home public page WITHOUT touching the admin
  // dashboard, which lives outside this route group.
  //
  // PublicHeader/PublicFooter live here (not the root layout) so `/admin/*`
  // never mounts them: admin's own AdminShell is a `fixed inset-0 z-[9999]`
  // overlay that already covers the full viewport, so the public header/footer
  // rendered underneath it was always invisible dead weight — and after the
  // header grew its own admin-identity resolution + several dynamic imports,
  // that dead weight became a second concurrent `useCurrentAdmin()` Supabase
  // auth-listener mounted on every admin page load, doubling the client module
  // graph admin routes had to resolve per request.
  return (
    <div className="line-public">
      <PublicHeader />
      <main className="flex-1 w-full pt-[6.4rem] sm:pt-[7.2rem] md:pt-[7.9rem]">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
