import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Send a message to the TechBash team.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeading command="./techbash --contact" title="Contact Us">
        Found a bug, have a quiz idea or want to use TechBash at an event? Write
        to us.
      </PageHeading>
      <div className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:gap-8">
        <ContactForm />
        <Panel title="readme" className="self-start">
          <h2 className="text-base">What happens to your message</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>&gt; It is checked in your browser and again on the server.</li>
            <li>&gt; If this deployment has a database, it is stored there.</li>
            <li>
              &gt; If it does not, you are told so. Nothing is stored or sent.
            </li>
            <li>&gt; No email is sent in either case.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
