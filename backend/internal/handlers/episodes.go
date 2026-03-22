package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khang/random-episode/internal/models"
)

type EpisodeHandler struct {
	db *pgxpool.Pool
}

func NewEpisodeHandler(db *pgxpool.Pool) *EpisodeHandler {
	return &EpisodeHandler{db: db}
}

func (h *EpisodeHandler) ListByShow(w http.ResponseWriter, r *http.Request) {
	showID := chi.URLParam(r, "showId")

	rows, err := h.db.Query(r.Context(),
		`SELECT id, show_id, season_number, episode_number, title, overview, still_url, air_date
		 FROM episodes WHERE show_id = $1
		 ORDER BY season_number, episode_number`, showID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var episodes []models.Episode
	for rows.Next() {
		var ep models.Episode
		if err := rows.Scan(&ep.ID, &ep.ShowID, &ep.SeasonNumber, &ep.EpisodeNumber, &ep.Title, &ep.Overview, &ep.StillURL, &ep.AirDate); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		episodes = append(episodes, ep)
	}
	if episodes == nil {
		episodes = []models.Episode{}
	}
	writeJSON(w, http.StatusOK, episodes)
}

func (h *EpisodeHandler) ListByShowWithStatus(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	showID := chi.URLParam(r, "showId")

	rows, err := h.db.Query(r.Context(),
		`SELECT e.id, e.show_id, e.season_number, e.episode_number, e.title, e.overview, e.still_url, e.air_date,
		        CASE WHEN w.user_id IS NOT NULL THEN true ELSE false END as watched,
		        CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END as blacklisted,
		        w.watched_at
		 FROM episodes e
		 LEFT JOIN watched_episodes w ON w.episode_id = e.id AND w.user_id = $1
		 LEFT JOIN blacklisted_episodes b ON b.episode_id = e.id AND b.user_id = $1
		 WHERE e.show_id = $2
		 ORDER BY e.season_number, e.episode_number`, userID, showID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var episodes []models.EpisodeWithStatus
	for rows.Next() {
		var ep models.EpisodeWithStatus
		if err := rows.Scan(&ep.ID, &ep.ShowID, &ep.SeasonNumber, &ep.EpisodeNumber,
			&ep.Title, &ep.Overview, &ep.StillURL, &ep.AirDate,
			&ep.Watched, &ep.Blacklisted, &ep.WatchedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		episodes = append(episodes, ep)
	}
	if episodes == nil {
		episodes = []models.EpisodeWithStatus{}
	}
	writeJSON(w, http.StatusOK, episodes)
}

func (h *EpisodeHandler) ToggleWatched(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	episodeID := chi.URLParam(r, "episodeId")

	if r.Method == http.MethodPost {
		_, err := h.db.Exec(r.Context(),
			"INSERT INTO watched_episodes (user_id, episode_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
			userID, episodeID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	} else {
		_, err := h.db.Exec(r.Context(),
			"DELETE FROM watched_episodes WHERE user_id = $1 AND episode_id = $2",
			userID, episodeID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func (h *EpisodeHandler) ToggleBlacklist(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	episodeID := chi.URLParam(r, "episodeId")

	if r.Method == http.MethodPost {
		_, err := h.db.Exec(r.Context(),
			"INSERT INTO blacklisted_episodes (user_id, episode_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
			userID, episodeID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	} else {
		_, err := h.db.Exec(r.Context(),
			"DELETE FROM blacklisted_episodes WHERE user_id = $1 AND episode_id = $2",
			userID, episodeID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
