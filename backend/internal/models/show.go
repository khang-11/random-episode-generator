package models

import "time"

type Show struct {
	ID           string    `json:"id"`
	TMDBID       *int      `json:"tmdb_id"`
	Name         string    `json:"name"`
	PosterURL    *string   `json:"poster_url"`
	BackdropURL  *string   `json:"backdrop_url"`
	TotalSeasons int       `json:"total_seasons"`
	Overview     *string   `json:"overview"`
	CreatedAt    time.Time `json:"created_at"`
}

type AddShowFromTMDBRequest struct {
	TMDBID int `json:"tmdb_id"`
}

type AddShowManualRequest struct {
	Name         string `json:"name"`
	TotalSeasons int    `json:"total_seasons"`
	Episodes     []ManualEpisode `json:"episodes"`
}

type ManualEpisode struct {
	SeasonNumber  int    `json:"season_number"`
	EpisodeNumber int    `json:"episode_number"`
	Title         string `json:"title"`
}
