package tmdb

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

const baseURL = "https://api.themoviedb.org/3"
const imageBaseURL = "https://image.tmdb.org/t/p/"

type Client struct {
	apiKey     string
	httpClient *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type SearchResult struct {
	Results []TVShow `json:"results"`
}

type TVShow struct {
	ID           int     `json:"id"`
	Name         string  `json:"name"`
	Overview     string  `json:"overview"`
	PosterPath   *string `json:"poster_path"`
	BackdropPath *string `json:"backdrop_path"`
	FirstAirDate string  `json:"first_air_date"`
}

type TVShowDetail struct {
	ID             int      `json:"id"`
	Name           string   `json:"name"`
	Overview       string   `json:"overview"`
	PosterPath     *string  `json:"poster_path"`
	BackdropPath   *string  `json:"backdrop_path"`
	NumberOfSeasons int     `json:"number_of_seasons"`
	Seasons        []Season `json:"seasons"`
}

type Season struct {
	ID           int    `json:"id"`
	SeasonNumber int    `json:"season_number"`
	EpisodeCount int    `json:"episode_count"`
	Name         string `json:"name"`
}

type SeasonDetail struct {
	Episodes []EpisodeInfo `json:"episodes"`
}

type EpisodeInfo struct {
	EpisodeNumber int     `json:"episode_number"`
	SeasonNumber  int     `json:"season_number"`
	Name          string  `json:"name"`
	Overview      string  `json:"overview"`
	StillPath     *string `json:"still_path"`
	AirDate       string  `json:"air_date"`
}

func (c *Client) SearchTV(query string) ([]TVShow, error) {
	u := fmt.Sprintf("%s/search/tv?api_key=%s&query=%s", baseURL, c.apiKey, url.QueryEscape(query))
	resp, err := c.httpClient.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API error: %d", resp.StatusCode)
	}

	var result SearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Results, nil
}

func (c *Client) GetTVShow(id int) (*TVShowDetail, error) {
	u := fmt.Sprintf("%s/tv/%d?api_key=%s", baseURL, id, c.apiKey)
	resp, err := c.httpClient.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API error: %d", resp.StatusCode)
	}

	var show TVShowDetail
	if err := json.NewDecoder(resp.Body).Decode(&show); err != nil {
		return nil, err
	}
	return &show, nil
}

func (c *Client) GetSeasonEpisodes(showID, seasonNumber int) ([]EpisodeInfo, error) {
	u := fmt.Sprintf("%s/tv/%d/season/%d?api_key=%s", baseURL, showID, seasonNumber, c.apiKey)
	resp, err := c.httpClient.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API error: %d", resp.StatusCode)
	}

	var season SeasonDetail
	if err := json.NewDecoder(resp.Body).Decode(&season); err != nil {
		return nil, err
	}
	return season.Episodes, nil
}

func ImageURL(path string, size string) string {
	if path == "" {
		return ""
	}
	return imageBaseURL + size + path
}
