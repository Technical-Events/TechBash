import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { ActionForm } from "@/components/ui/action-form";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { requireAdminDb } from "@/lib/auth/session";
import { contactSubmissions } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { deleteMessage } from "./actions";

export const metadata: Metadata = { title: "Messages" };

const LIMIT = 200;

export default async function MessagesPage() {
  const { db } = await requireAdminDb();
  const messages = await db
    .select()
    .from(contactSubmissions)
    .orderBy(desc(contactSubmissions.createdAt))
    .limit(LIMIT);

  return (
    <>
      <PageHeading command="./admin --inbox" title="Messages">
        Sent from the Contact Us form, newest first (latest {LIMIT}).
      </PageHeading>
      {messages.length === 0 && (
        <p className="text-muted"># No messages yet.</p>
      )}
      <ul className="space-y-8">
        {messages.map((message) => (
          <li key={message.id}>
            <Panel title={formatDateTime(message.createdAt)}>
              <h2 className="text-base normal-case">{message.subject}</h2>
              <p className="mt-1 text-sm text-muted">
                {message.name} &lt;
                <a
                  href={`mailto:${message.email}`}
                  className="text-accent underline-offset-4 hover:underline"
                >
                  {message.email}
                </a>
                &gt;
              </p>
              <p className="mt-4 whitespace-pre-wrap break-words">
                {message.message}
              </p>
              <div className="mt-5">
                <ActionForm
                  action={deleteMessage}
                  submitLabel="Delete"
                  variant="secondary"
                  confirmLabel="Confirm delete"
                >
                  <input type="hidden" name="messageId" value={message.id} />
                </ActionForm>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </>
  );
}
