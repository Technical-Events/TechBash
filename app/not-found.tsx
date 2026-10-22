import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function NotFound() {
  return (
    <Panel title="404">
      <p className="text-sm text-muted">
        <span aria-hidden="true" className="text-accent">
          ${" "}
        </span>
        cd this-page
      </p>
      <h1 className="mt-2 text-2xl">No such file or directory</h1>
      <p className="mt-3 text-muted">The page you asked for does not exist.</p>
      <ButtonLink href="/" className="mt-6">
        Home
      </ButtonLink>
    </Panel>
  );
}
