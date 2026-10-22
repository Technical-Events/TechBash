import type { Metadata } from "next";
import { Suspense } from "react";
import { TestGate } from "@/components/test/test-gate";
import { PageHeading } from "@/components/ui/page-heading";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = {
  title: "Test",
  description:
    "Log in with your full name and USN to take the TechBash rounds.",
};

export default function TestPage() {
  return (
    <>
      <PageHeading command="./techbash --login" title="Test">
        Log in with your full name and USN, then unlock each round with its
        access key.
      </PageHeading>
      <Suspense fallback={<Loading label="Checking your session" />}>
        <TestGate />
      </Suspense>
    </>
  );
}
