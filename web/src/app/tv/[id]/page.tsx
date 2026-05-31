import TVClient from "./TVClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TVDetails({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  return <TVClient id={id} />;
}
