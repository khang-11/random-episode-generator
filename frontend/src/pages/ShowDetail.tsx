import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useUserShows,
  useEpisodesWithStatus,
  useToggleWatched,
  useToggleBlacklist,
  useGenerateRandom,
} from "@/hooks/useApi";
import type { EpisodeWithStatus, RandomResult } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Dices,
  Eye,
  EyeOff,
  Ban,
  ChevronDown,
  ChevronRight,
  Film,
  Sparkles,
} from "lucide-react";

export default function ShowDetail() {
  const { userId, showId } = useParams<{
    userId: string;
    showId: string;
  }>();
  const { data: shows } = useUserShows(userId ?? null);
  const { data: episodes, isLoading } = useEpisodesWithStatus(
    userId ?? null,
    showId ?? null
  );
  const toggleWatched = useToggleWatched();
  const toggleBlacklist = useToggleBlacklist();
  const generateRandom = useGenerateRandom();
  const [randomResult, setRandomResult] = useState<RandomResult | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(
    new Set()
  );

  const show = shows?.find((s) => s.id === showId);

  const seasonGroups = useMemo(() => {
    if (!episodes) return new Map<number, EpisodeWithStatus[]>();
    const groups = new Map<number, EpisodeWithStatus[]>();
    for (const ep of episodes) {
      const arr = groups.get(ep.season_number) || [];
      arr.push(ep);
      groups.set(ep.season_number, arr);
    }
    return groups;
  }, [episodes]);

  const stats = useMemo(() => {
    if (!episodes) return { watched: 0, total: 0, blacklisted: 0 };
    return {
      watched: episodes.filter((e) => e.watched && !e.blacklisted).length,
      total: episodes.length,
      blacklisted: episodes.filter((e) => e.blacklisted).length,
    };
  }, [episodes]);

  const toggleSeason = (s: number) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const handleRandom = async () => {
    if (!userId || !showId) return;
    try {
      const result = await generateRandom.mutateAsync({
        userId,
        showId,
      });
      setRandomResult(result);
      setRevealOpen(true);
    } catch {
      // handled by mutation
    }
  };

  const handleSkip = async () => {
    if (!userId || !randomResult) return;
    // Unmark the current episode as watched, then pick another
    toggleWatched.mutate({
      userId,
      episodeId: randomResult.episode.id,
      showId: showId!,
      watched: true,
    });
    await handleRandom();
  };

  const handleBlacklistAndNext = async () => {
    if (!userId || !randomResult) return;
    // Blacklist the current episode, then pick another
    toggleBlacklist.mutate({
      userId,
      episodeId: randomResult.episode.id,
      showId: showId!,
      blacklisted: false,
    });
    await handleRandom();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="relative border-b sticky top-0 z-10 overflow-hidden">
        {show?.backdrop_url && (
          <>
            <img
              src={show.backdrop_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          </>
        )}
        <div className="relative container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/dashboard/${userId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{show?.name ?? "Show"}</h1>
          </div>
        </div>
      </header>

      <main className="relative z-0 container mx-auto px-4 py-8 space-y-6">
        {/* Random button - always visible at top */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-sm">
          <div className="space-y-1 w-full sm:w-auto">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                {stats.watched} watched
              </span>
              {stats.blacklisted > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                  {stats.blacklisted} blocked
                </span>
              )}
              <span className="text-muted-foreground">
                / {stats.total} total
              </span>
            </div>
            <div className="relative h-2 w-64 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-500 rounded-l-full"
                style={{
                  width: stats.total > 0
                    ? `${(stats.watched / stats.total) * 100}%`
                    : "0%",
                }}
              />
              <div
                className="absolute inset-y-0 bg-red-500 transition-all duration-500 rounded-r-full"
                style={{
                  left: stats.total > 0
                    ? `${((stats.total - stats.blacklisted) / stats.total) * 100}%`
                    : "0%",
                  width: stats.total > 0
                    ? `${(stats.blacklisted / stats.total) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
          <Button
            size="lg"
            onClick={handleRandom}
            disabled={generateRandom.isPending || stats.total === 0}
            className="gap-2 shrink-0"
          >
            <Dices className="h-5 w-5" />
            {generateRandom.isPending
              ? "Picking..."
              : "Pick Random Episode"}
          </Button>
        </div>

        {/* Show info */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {show?.poster_url ? (
            <img
              src={show.poster_url}
              alt={show.name}
              className="w-40 rounded-xl shadow-lg shrink-0"
            />
          ) : (
            <div className="w-40 aspect-[2/3] rounded-xl bg-muted flex items-center justify-center shadow-lg shrink-0">
              <Film className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            {show?.overview && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {show.overview}
              </p>
            )}
          </div>
        </div>

        {/* Episode list by season */}
        <div className="space-y-3">
          {Array.from(seasonGroups.entries())
            .sort(([a], [b]) => a - b)
            .map(([seasonNum, eps]) => {
              const isExpanded = expandedSeasons.has(seasonNum);
              const seasonWatched = eps.filter(
                (e) => e.watched && !e.blacklisted
              ).length;
              const seasonTotal = eps.filter((e) => !e.blacklisted).length;

              return (
                <Card key={seasonNum} className="overflow-hidden">
                  <button
                    onClick={() => toggleSeason(seasonNum)}
                    className="w-full cursor-pointer"
                  >
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <CardTitle className="text-base">
                          Season {seasonNum}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {seasonWatched}/{seasonTotal}
                        </Badge>
                      </div>
                    </CardHeader>
                  </button>
                  {isExpanded && (
                    <CardContent className="pt-0 pb-3">
                      <div className="space-y-1">
                        {eps.map((ep) => (
                          <EpisodeRow
                            key={ep.id}
                            episode={ep}
                            userId={userId!}
                            onToggleWatched={() =>
                              toggleWatched.mutate({
                                userId: userId!,
                                episodeId: ep.id,
                                showId: showId!,
                                watched: ep.watched,
                              })
                            }
                            onToggleBlacklist={() =>
                              toggleBlacklist.mutate({
                                userId: userId!,
                                episodeId: ep.id,
                                showId: showId!,
                                blacklisted: ep.blacklisted,
                              })
                            }
                          />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
        </div>
      </main>

      {/* Random Episode Reveal Dialog */}
      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden h-[min(85vh,600px)] flex flex-col">
          {randomResult && (
            <RandomReveal
              result={randomResult}
              onAnother={handleRandom}
              onSkip={handleSkip}
              onBlacklist={handleBlacklistAndNext}
              onClose={() => setRevealOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EpisodeRow({
  episode,
  onToggleWatched,
  onToggleBlacklist,
}: {
  episode: EpisodeWithStatus;
  userId: string;
  onToggleWatched: () => void;
  onToggleBlacklist: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        episode.blacklisted
          ? "bg-red-100 dark:bg-red-950/40"
          : episode.watched
          ? "bg-muted/60"
          : "hover:bg-accent"
      }`}
    >
      <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">
        E{String(episode.episode_number).padStart(2, "0")}
      </span>
      <span
        className={`flex-1 text-sm truncate ${
          episode.blacklisted ? "line-through text-muted-foreground" : ""
        }`}
      >
        {episode.title || `Episode ${episode.episode_number}`}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {!episode.blacklisted && (
          <Button
            variant={episode.watched ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-[5.5rem] gap-1 px-2 text-xs justify-center"
            onClick={onToggleWatched}
            title={episode.watched ? "Mark unwatched" : "Mark watched"}
          >
            {episode.watched ? (
              <Eye className="h-3.5 w-3.5 text-primary" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {episode.watched ? "Watched" : "Watch"}
          </Button>
        )}
        <Button
          variant={episode.blacklisted ? "destructive" : "outline"}
          size="sm"
          className="h-7 w-[5.5rem] gap-1 px-2 text-xs justify-center"
          onClick={onToggleBlacklist}
          title={
            episode.blacklisted
              ? "Remove from blacklist"
              : "Blacklist episode"
          }
        >
          <Ban className="h-3.5 w-3.5" />
          {episode.blacklisted ? "Blocked" : "Block"}
        </Button>
      </div>
    </div>
  );
}

function RandomReveal({
  result,
  onAnother,
  onSkip,
  onBlacklist,
  onClose,
}: {
  result: RandomResult;
  onAnother: () => void;
  onSkip: () => void;
  onBlacklist: () => void;
  onClose: () => void;
}) {
  const ep = result.episode;

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
      {/* Fixed image/header area */}
      {ep.still_url ? (
        <div className="relative shrink-0">
          <img
            src={ep.still_url}
            alt={ep.title || "Episode"}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-xs uppercase tracking-wider font-medium opacity-80">
                Your random pick
              </span>
            </div>
            <h2 className="text-2xl font-bold">
              {ep.title || `Episode ${ep.episode_number}`}
            </h2>
            <p className="text-sm opacity-80">
              Season {ep.season_number}, Episode {ep.episode_number}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 pb-0 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Your random pick
            </span>
          </div>
          <h2 className="text-2xl font-bold">
            {ep.title || `Episode ${ep.episode_number}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            Season {ep.season_number}, Episode {ep.episode_number}
          </p>
        </div>
      )}

      {/* Scrollable description area */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        {ep.overview && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {ep.overview}
          </p>
        )}
      </div>

      {/* Fixed bottom actions */}
      <div className="shrink-0 border-t p-4 space-y-3 bg-background">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Cycle: {result.cycle_info.watched} / {result.cycle_info.total} watched
          </span>
          <Progress
            value={
              result.cycle_info.total > 0
                ? (result.cycle_info.watched / result.cycle_info.total) * 100
                : 0
            }
            className="w-32"
          />
        </div>
        <Button size="lg" onClick={onAnother} className="w-full gap-2">
          <Dices className="h-5 w-5" />
          Pick Another
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onSkip} className="flex-1 gap-1">
            <EyeOff className="h-3.5 w-3.5" />
            Skip
          </Button>
          <Button variant="destructive" size="sm" onClick={onBlacklist} className="flex-1 gap-1">
            <Ban className="h-3.5 w-3.5" />
            Block
          </Button>
          <Button variant="secondary" onClick={onSkip} className="flex-1 gap-2">
            <EyeOff className="h-4 w-4" />
            Skip
          </Button>
          <Button variant="destructive" onClick={onBlacklist} className="gap-2">
            <Ban className="h-4 w-4" />
            Block
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
