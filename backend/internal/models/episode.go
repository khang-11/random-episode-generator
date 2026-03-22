package models

import "time"

type Episode struct {
	ID            string     `json:"id"`
	ShowID        string     `json:"show_id"`
	SeasonNumber  int        `json:"season_number"`
	EpisodeNumber int        `json:"episode_number"`
	Title         *string    `json:"title"`
	Overview      *string    `json:"overview"`
	StillURL      *string    `json:"still_url"`
	AirDate       *time.Time `json:"air_date"`
}

type EpisodeWithStatus struct {
	Episode
	Watched     bool       `json:"watched"`
	Blacklisted bool       `json:"blacklisted"`
	WatchedAt   *time.Time `json:"watched_at,omitempty"`
}
