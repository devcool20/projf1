import { CommsView } from "@/components/comms/comms-view";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function CommsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = (params.q ?? "").toLowerCase();

  return <CommsView query={query} />;
}
