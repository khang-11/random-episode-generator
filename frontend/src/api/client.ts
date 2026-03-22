const API_BASE = (import.meta.env.VITE_API_URL || "") + "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204 || res.status === 201) {
    // Try to parse body, but return undefined if empty
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text);
  }
  return res.json();
}

// Types
export interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Show {
  id: string;
  tmdb_id: number | null;
  name: string;
  poster_url: string | null;
  backdrop_url: string | null;
  total_seasons: number;
  overview: string | null;
  created_at: string;
}

export interface Episode {
  id: string;
  show_id: string;
  season_number: number;
  episode_number: number;
  title: string | null;
  overview: string | null;
  still_url: string | null;
  air_date: string | null;
}

export interface EpisodeWithStatus extends Episode {
  watched: boolean;
  blacklisted: boolean;
  watched_at?: string;
}

export interface TMDBSearchResult {
  tmdb_id: number;
  name: string;
  overview: string;
  poster_url: string | null;
  first_air_date: string;
}

export interface RandomResult {
  episode: EpisodeWithStatus;
  show_name: string;
  cycle_info: {
    watched: number;
    total: number;
  };
}

// Users
export const getUsers = () => request<User[]>("/users");
export const createUser = (name: string) =>
  request<User>("/users", { method: "POST", body: JSON.stringify({ name }) });
export const deleteUser = (id: string) =>
  request<void>(`/users/${id}`, { method: "DELETE" });

// Shows
export const searchTMDB = (q: string) =>
  request<TMDBSearchResult[]>(`/shows/search?q=${encodeURIComponent(q)}`);
export const addShowFromTMDB = (tmdb_id: number) =>
  request<Show>("/shows/tmdb", { method: "POST", body: JSON.stringify({ tmdb_id }) });
export const addShowManual = (data: {
  name: string;
  total_seasons: number;
  episodes: { season_number: number; episode_number: number; title: string }[];
}) => request<Show>("/shows/manual", { method: "POST", body: JSON.stringify(data) });

// User shows
export const getUserShows = (userId: string) =>
  request<Show[]>(`/users/${userId}/shows`);
export const addShowToUser = (userId: string, showId: string) =>
  request<void>(`/users/${userId}/shows/${showId}`, { method: "POST" });
export const removeShowFromUser = (userId: string, showId: string) =>
  request<void>(`/users/${userId}/shows/${showId}`, { method: "DELETE" });

// Episodes
export const getEpisodesWithStatus = (userId: string, showId: string) =>
  request<EpisodeWithStatus[]>(`/users/${userId}/shows/${showId}/episodes`);
export const markWatched = (userId: string, episodeId: string) =>
  request<void>(`/users/${userId}/episodes/${episodeId}/watched`, { method: "POST" });
export const unmarkWatched = (userId: string, episodeId: string) =>
  request<void>(`/users/${userId}/episodes/${episodeId}/watched`, { method: "DELETE" });
export const addBlacklist = (userId: string, episodeId: string) =>
  request<void>(`/users/${userId}/episodes/${episodeId}/blacklist`, { method: "POST" });
export const removeBlacklist = (userId: string, episodeId: string) =>
  request<void>(`/users/${userId}/episodes/${episodeId}/blacklist`, { method: "DELETE" });

// Random
export const generateRandom = (userId: string, showId: string) =>
  request<RandomResult>(`/users/${userId}/shows/${showId}/random`, { method: "POST" });
