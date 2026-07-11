export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `.line-public` is a scoping hook only (no box styling of its own). It lets
  // globals.css apply the token-driven public visual language (buttons, panels,
  // hover lights) to every off-home public page WITHOUT touching the admin
  // dashboard, which lives outside this route group.
  return <div className="line-public">{children}</div>;
}
