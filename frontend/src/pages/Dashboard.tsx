import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useUserShows,
  useSearchTMDB,
  useAddShowFromTMDB,
  useAddShowManual,
  useRemoveShowFromUser,
} from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Trash2,
  Tv,
  ArrowLeft,
  Film,
} from "lucide-react";

export default function Dashboard() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: shows, isLoading } = useUserShows(userId ?? null);
  const removeShow = useRemoveShowFromUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tmdb" | "manual">("tmdb");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">My Shows</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Show
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
            ))}
          </div>
        ) : shows && shows.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {shows.map((show) => (
              <Card
                key={show.id}
                className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all p-0"
              >
                <div
                  onClick={() =>
                    navigate(`/dashboard/${userId}/show/${show.id}`)
                  }
                >
                  {show.poster_url ? (
                    <img
                      src={show.poster_url}
                      alt={show.name}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                      <Film className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-1">
                    {show.name}
                  </h3>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {show.total_seasons} season{show.total_seasons !== 1 ? "s" : ""}
                  </Badge>
                </CardContent>
                <CardFooter className="p-3 pt-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(`Remove "${show.name}" from your list?`)
                      ) {
                        removeShow.mutate({
                          userId: userId!,
                          showId: show.id,
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tv className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No shows yet</h2>
            <p className="text-muted-foreground mb-4">
              Add your first TV show to get started
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Show
            </Button>
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a TV Show</DialogTitle>
            <DialogDescription>
              Search TMDB or add a show manually
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={activeTab === "tmdb" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tmdb")}
            >
              <Search className="h-3 w-3" />
              Search TMDB
            </Button>
            <Button
              variant={activeTab === "manual" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("manual")}
            >
              <Plus className="h-3 w-3" />
              Manual
            </Button>
          </div>

          {activeTab === "tmdb" ? (
            <TMDBSearch
              userId={userId!}
              onDone={() => setDialogOpen(false)}
            />
          ) : (
            <ManualAdd
              userId={userId!}
              onDone={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TMDBSearch({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useSearchTMDB(query);
  const addShow = useAddShowFromTMDB();

  if (addShow.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">
          Adding show and fetching episodes...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search for a TV show..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {isLoading && query.length >= 2 && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {results && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {results.map((show) => (
            <div
              key={show.tmdb_id}
              className="flex gap-3 p-2 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
              onClick={async () => {
                await addShow.mutateAsync({
                  tmdbId: show.tmdb_id,
                  userId,
                });
                onDone();
              }}
            >
              {show.poster_url ? (
                <img
                  src={show.poster_url}
                  alt={show.name}
                  className="w-12 h-18 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-18 rounded bg-muted flex items-center justify-center shrink-0">
                  <Film className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{show.name}</h4>
                {show.first_air_date && (
                  <p className="text-xs text-muted-foreground">
                    {show.first_air_date.slice(0, 4)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {show.overview}
                </p>
              </div>
            </div>
          ))}
          {results.length === 0 && query.length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No results found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ManualAdd({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const addManual = useAddShowManual();
  const [name, setName] = useState("");
  const [seasons, setSeasons] = useState("");
  const [episodesPerSeason, setEpisodesPerSeason] = useState("");

  const handleAdd = async () => {
    if (!name.trim() || !seasons || !episodesPerSeason) return;
    const totalSeasons = parseInt(seasons);
    const epsPerSeason = parseInt(episodesPerSeason);
    const episodes: { season_number: number; episode_number: number; title: string }[] = [];
    for (let s = 1; s <= totalSeasons; s++) {
      for (let e = 1; e <= epsPerSeason; e++) {
        episodes.push({
          season_number: s,
          episode_number: e,
          title: `Season ${s} Episode ${e}`,
        });
      }
    }
    await addManual.mutateAsync({
      userId,
      data: { name: name.trim(), total_seasons: totalSeasons, episodes },
    });
    onDone();
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="Show name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder="Number of seasons"
          min="1"
          value={seasons}
          onChange={(e) => setSeasons(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Episodes per season"
          min="1"
          value={episodesPerSeason}
          onChange={(e) => setEpisodesPerSeason(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        This will create episodes with default names. You can customize later.
      </p>
      <Button
        onClick={handleAdd}
        disabled={!name.trim() || !seasons || !episodesPerSeason || addManual.isPending}
        className="w-full"
      >
        {addManual.isPending ? "Adding..." : "Add Show"}
      </Button>
    </div>
  );
}
