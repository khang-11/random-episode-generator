import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/client";

// Users
export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: api.getUsers });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createUser(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// User shows
export function useUserShows(userId: string | null) {
  return useQuery({
    queryKey: ["userShows", userId],
    queryFn: () => api.getUserShows(userId!),
    enabled: !!userId,
  });
}

// TMDB search
export function useSearchTMDB(query: string) {
  return useQuery({
    queryKey: ["tmdbSearch", query],
    queryFn: () => api.searchTMDB(query),
    enabled: query.length >= 2,
  });
}

export function useAddShowFromTMDB() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tmdbId, userId }: { tmdbId: number; userId: string }) =>
      api.addShowFromTMDB(tmdbId).then((show) =>
        api.addShowToUser(userId, show.id).then(() => show)
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userShows"] }),
  });
}

export function useAddShowManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: Parameters<typeof api.addShowManual>[0];
    }) =>
      api.addShowManual(data).then((show) =>
        api.addShowToUser(userId, show.id).then(() => show)
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userShows"] }),
  });
}

export function useRemoveShowFromUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, showId }: { userId: string; showId: string }) =>
      api.removeShowFromUser(userId, showId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userShows"] }),
  });
}

// Episodes
export function useEpisodesWithStatus(
  userId: string | null,
  showId: string | null
) {
  return useQuery({
    queryKey: ["episodes", userId, showId],
    queryFn: () => api.getEpisodesWithStatus(userId!, showId!),
    enabled: !!userId && !!showId,
  });
}

export function useToggleWatched() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      episodeId,
      watched,
    }: {
      userId: string;
      episodeId: string;
      showId: string;
      watched: boolean;
    }) =>
      watched
        ? api.unmarkWatched(userId, episodeId)
        : api.markWatched(userId, episodeId),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["episodes", vars.userId, vars.showId] }),
  });
}

export function useToggleBlacklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      episodeId,
      blacklisted,
    }: {
      userId: string;
      episodeId: string;
      showId: string;
      blacklisted: boolean;
    }) =>
      blacklisted
        ? api.removeBlacklist(userId, episodeId)
        : api.addBlacklist(userId, episodeId),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["episodes", vars.userId, vars.showId] }),
  });
}

// Random
export function useGenerateRandom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, showId }: { userId: string; showId: string }) =>
      api.generateRandom(userId, showId),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["episodes", vars.userId, vars.showId] }),
  });
}
