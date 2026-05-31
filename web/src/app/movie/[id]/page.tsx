import MovieClient from "./MovieClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MovieDetails({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  return <MovieClient id={id} />;
}
