package handlers

import (
	"math/rand"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khang/random-episode/internal/models"
)

type RandomHandler struct {
	db *pgxpool.Pool
}

func NewRandomHandler(db *pgxpool.Pool) *RandomHandler {
	return &RandomHandler{db: db}
}

func (h *RandomHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	showID := chi.URLParam(r, "showId")
	ctx := r.Context()

	// Get all non-blacklisted episode IDs for this show
	rows, err := h.db.Query(ctx,
		`SELECT e.id FROM episodes e
		 WHERE e.show_id = $1
		 AND e.id NOT IN (
		     SELECT episode_id FROM blacklisted_episodes WHERE user_id = $2
		 )`, showID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allEpisodeIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		allEpisodeIDs = append(allEpisodeIDs, id)
	}

	if len(allEpisodeIDs) == 0 {
		http.Error(w, "no episodes available (all may be blacklisted)", http.StatusNotFound)
		return
	}

	// Get unwatched from the non-blacklisted pool
	unwatchedRows, err := h.db.Query(ctx,
		`SELECT e.id FROM episodes e
		 WHERE e.show_id = $1
		 AND e.id NOT IN (
		     SELECT episode_id FROM blacklisted_episodes WHERE user_id = $2
		 )
		 AND e.id NOT IN (
		     SELECT episode_id FROM watched_episodes WHERE user_id = $2
		 )`, showID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer unwatchedRows.Close()

	var unwatchedIDs []string
	for unwatchedRows.Next() {
		var id string
		if err := unwatchedRows.Scan(&id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		unwatchedIDs = append(unwatchedIDs, id)
	}

	// If all non-blacklisted episodes are watched, reset the cycle
	if len(unwatchedIDs) == 0 {
		_, err := h.db.Exec(ctx,
			`DELETE FROM watched_episodes
			 WHERE user_id = $1 AND episode_id IN (
			     SELECT id FROM episodes WHERE show_id = $2
			 )`, userID, showID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		unwatchedIDs = allEpisodeIDs
	}

	// Pick a random episode
	chosenID := unwatchedIDs[rand.Intn(len(unwatchedIDs))]

	// Mark as watched
	_, err = h.db.Exec(ctx,
		"INSERT INTO watched_episodes (user_id, episode_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
		userID, chosenID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch full episode data
	var ep models.EpisodeWithStatus
	err = h.db.QueryRow(ctx,
		`SELECT e.id, e.show_id, e.season_number, e.episode_number, e.title, e.overview, e.still_url, e.air_date,
		        true as watched, false as blacklisted, w.watched_at
		 FROM episodes e
		 LEFT JOIN watched_episodes w ON w.episode_id = e.id AND w.user_id = $1
		 WHERE e.id = $2`, userID, chosenID).
		Scan(&ep.ID, &ep.ShowID, &ep.SeasonNumber, &ep.EpisodeNumber,
			&ep.Title, &ep.Overview, &ep.StillURL, &ep.AirDate,
			&ep.Watched, &ep.Blacklisted, &ep.WatchedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Also return show info
	type RandomResult struct {
		Episode  models.EpisodeWithStatus `json:"episode"`
		ShowName string                   `json:"show_name"`
		CycleInfo struct {
			Watched int `json:"watched"`
			Total   int `json:"total"`
		} `json:"cycle_info"`
	}

	var result RandomResult
	result.Episode = ep

	h.db.QueryRow(ctx, "SELECT name FROM shows WHERE id = $1", showID).Scan(&result.ShowName)

	// Count watched and total non-blacklisted
	h.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM watched_episodes w
		 JOIN episodes e ON e.id = w.episode_id
		 WHERE w.user_id = $1 AND e.show_id = $2`, userID, showID).Scan(&result.CycleInfo.Watched)
	result.CycleInfo.Total = len(allEpisodeIDs)

	writeJSON(w, http.StatusOK, result)
}
