package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khang/random-episode/internal/models"
	"github.com/khang/random-episode/internal/tmdb"
)

type ShowHandler struct {
	db   *pgxpool.Pool
	tmdb *tmdb.Client
}

func NewShowHandler(db *pgxpool.Pool, tmdbClient *tmdb.Client) *ShowHandler {
	return &ShowHandler{db: db, tmdb: tmdbClient}
}

func (h *ShowHandler) SearchTMDB(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	results, err := h.tmdb.SearchTV(query)
	if err != nil {
		http.Error(w, fmt.Sprintf("TMDB search failed: %v", err), http.StatusInternalServerError)
		return
	}

	type searchResult struct {
		TMDBID       int     `json:"tmdb_id"`
		Name         string  `json:"name"`
		Overview     string  `json:"overview"`
		PosterURL    *string `json:"poster_url"`
		FirstAirDate string  `json:"first_air_date"`
	}

	var out []searchResult
	for _, s := range results {
		sr := searchResult{
			TMDBID:       s.ID,
			Name:         s.Name,
			Overview:     s.Overview,
			FirstAirDate: s.FirstAirDate,
		}
		if s.PosterPath != nil {
			url := tmdb.ImageURL(*s.PosterPath, "w500")
			sr.PosterURL = &url
		}
		out = append(out, sr)
	}
	if out == nil {
		out = []searchResult{}
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *ShowHandler) AddFromTMDB(w http.ResponseWriter, r *http.Request) {
	var req models.AddShowFromTMDBRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Check if show already exists
	var existingID string
	err := h.db.QueryRow(r.Context(),
		"SELECT id FROM shows WHERE tmdb_id = $1", req.TMDBID).Scan(&existingID)
	if err == nil {
		// Show already exists, return it
		var show models.Show
		h.db.QueryRow(r.Context(),
			"SELECT id, tmdb_id, name, poster_url, backdrop_url, total_seasons, overview, created_at FROM shows WHERE id = $1",
			existingID).Scan(&show.ID, &show.TMDBID, &show.Name, &show.PosterURL, &show.BackdropURL, &show.TotalSeasons, &show.Overview, &show.CreatedAt)
		writeJSON(w, http.StatusOK, show)
		return
	}

	// Fetch from TMDB
	detail, err := h.tmdb.GetTVShow(req.TMDBID)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to fetch show from TMDB: %v", err), http.StatusInternalServerError)
		return
	}

	var posterURL, backdropURL *string
	if detail.PosterPath != nil {
		url := tmdb.ImageURL(*detail.PosterPath, "w500")
		posterURL = &url
	}
	if detail.BackdropPath != nil {
		url := tmdb.ImageURL(*detail.BackdropPath, "w1280")
		backdropURL = &url
	}

	var show models.Show
	err = h.db.QueryRow(r.Context(),
		`INSERT INTO shows (tmdb_id, name, poster_url, backdrop_url, total_seasons, overview)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tmdb_id, name, poster_url, backdrop_url, total_seasons, overview, created_at`,
		detail.ID, detail.Name, posterURL, backdropURL, detail.NumberOfSeasons, detail.Overview).
		Scan(&show.ID, &show.TMDBID, &show.Name, &show.PosterURL, &show.BackdropURL, &show.TotalSeasons, &show.Overview, &show.CreatedAt)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to save show: %v", err), http.StatusInternalServerError)
		return
	}

	// Fetch and save episodes for each season (skip specials / season 0)
	for _, season := range detail.Seasons {
		if season.SeasonNumber == 0 {
			continue
		}
		episodes, err := h.tmdb.GetSeasonEpisodes(detail.ID, season.SeasonNumber)
		if err != nil {
			continue
		}
		for _, ep := range episodes {
			var stillURL *string
			if ep.StillPath != nil {
				url := tmdb.ImageURL(*ep.StillPath, "w500")
				stillURL = &url
			}
			var airDate *string
			if ep.AirDate != "" {
				airDate = &ep.AirDate
			}
			h.db.Exec(r.Context(),
				`INSERT INTO episodes (show_id, season_number, episode_number, title, overview, still_url, air_date)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT (show_id, season_number, episode_number) DO NOTHING`,
				show.ID, ep.SeasonNumber, ep.EpisodeNumber, ep.Name, ep.Overview, stillURL, airDate)
		}
	}

	writeJSON(w, http.StatusCreated, show)
}

func (h *ShowHandler) AddManual(w http.ResponseWriter, r *http.Request) {
	var req models.AddShowManualRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	var show models.Show
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO shows (name, total_seasons)
		 VALUES ($1, $2)
		 RETURNING id, tmdb_id, name, poster_url, backdrop_url, total_seasons, overview, created_at`,
		req.Name, req.TotalSeasons).
		Scan(&show.ID, &show.TMDBID, &show.Name, &show.PosterURL, &show.BackdropURL, &show.TotalSeasons, &show.Overview, &show.CreatedAt)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to save show: %v", err), http.StatusInternalServerError)
		return
	}

	for _, ep := range req.Episodes {
		h.db.Exec(r.Context(),
			`INSERT INTO episodes (show_id, season_number, episode_number, title)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (show_id, season_number, episode_number) DO NOTHING`,
			show.ID, ep.SeasonNumber, ep.EpisodeNumber, ep.Title)
	}

	writeJSON(w, http.StatusCreated, show)
}

func (h *ShowHandler) ListUserShows(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")

	rows, err := h.db.Query(r.Context(),
		`SELECT s.id, s.tmdb_id, s.name, s.poster_url, s.backdrop_url, s.total_seasons, s.overview, s.created_at
		 FROM shows s
		 JOIN user_shows us ON us.show_id = s.id
		 WHERE us.user_id = $1
		 ORDER BY us.added_at DESC`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var shows []models.Show
	for rows.Next() {
		var s models.Show
		if err := rows.Scan(&s.ID, &s.TMDBID, &s.Name, &s.PosterURL, &s.BackdropURL, &s.TotalSeasons, &s.Overview, &s.CreatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		shows = append(shows, s)
	}
	if shows == nil {
		shows = []models.Show{}
	}
	writeJSON(w, http.StatusOK, shows)
}

func (h *ShowHandler) AddShowToUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	showID := chi.URLParam(r, "showId")

	_, err := h.db.Exec(r.Context(),
		"INSERT INTO user_shows (user_id, show_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
		userID, showID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *ShowHandler) RemoveShowFromUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	showID := chi.URLParam(r, "showId")

	// Also clear watched and blacklisted episodes for this user+show
	h.db.Exec(r.Context(),
		`DELETE FROM watched_episodes WHERE user_id = $1 AND episode_id IN
		 (SELECT id FROM episodes WHERE show_id = $2)`, userID, showID)
	h.db.Exec(r.Context(),
		`DELETE FROM blacklisted_episodes WHERE user_id = $1 AND episode_id IN
		 (SELECT id FROM episodes WHERE show_id = $2)`, userID, showID)

	_, err := h.db.Exec(r.Context(),
		"DELETE FROM user_shows WHERE user_id = $1 AND show_id = $2", userID, showID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ShowHandler) ListAllShows(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(),
		"SELECT id, tmdb_id, name, poster_url, backdrop_url, total_seasons, overview, created_at FROM shows ORDER BY name")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var shows []models.Show
	for rows.Next() {
		var s models.Show
		if err := rows.Scan(&s.ID, &s.TMDBID, &s.Name, &s.PosterURL, &s.BackdropURL, &s.TotalSeasons, &s.Overview, &s.CreatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		shows = append(shows, s)
	}
	if shows == nil {
		shows = []models.Show{}
	}
	writeJSON(w, http.StatusOK, shows)
}
