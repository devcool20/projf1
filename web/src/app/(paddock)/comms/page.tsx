import { CommsView } from "@/components/comms/comms-view";

type Props = {
  searchParams: Promise<{ q?: string; t?: string }>;
};

export default async function CommsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = (params.q ?? "").toLowerCase();
  const initialThreadId = params.t ?? "";

  return <CommsView query={query} initialThreadId={initialThreadId} />;
}
