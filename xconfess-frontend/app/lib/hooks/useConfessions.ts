import { useEffect, useState } from "react";

interface Confession {
  id: string;
  content: string;
  createdAt: string;
  reactions: { like: number; love: number };
}

export const useConfessions = () => {
  const [data, setData] = useState<Confession[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfessions = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error before fetching
        const res = await fetch(`/api/confessions?page=${page}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json.confessions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchConfessions();
  }, [page]);

  return { data, loading, error, setPage };
};
