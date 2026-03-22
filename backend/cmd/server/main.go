package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/khang/random-episode/internal/config"
	"github.com/khang/random-episode/internal/database"
	"github.com/khang/random-episode/internal/handlers"
	"github.com/khang/random-episode/internal/middleware"
	"github.com/khang/random-episode/internal/tmdb"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()

	// Connect to database
	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Run migrations
	if err := database.Migrate(ctx, pool); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Database migrations completed")

	// Initialize TMDB client
	tmdbClient := tmdb.NewClient(cfg.TMDBAPIKey)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(pool)
	showHandler := handlers.NewShowHandler(pool, tmdbClient)
	episodeHandler := handlers.NewEpisodeHandler(pool)
	randomHandler := handlers.NewRandomHandler(pool)

	// Setup router
	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.CORSHandler().Handler)

	r.Route("/api", func(r chi.Router) {
		// Users
		r.Get("/users", userHandler.List)
		r.Post("/users", userHandler.Create)
		r.Get("/users/{userId}", userHandler.Get)
		r.Delete("/users/{userId}", userHandler.Delete)

		// Shows
		r.Get("/shows/search", showHandler.SearchTMDB)
		r.Get("/shows", showHandler.ListAllShows)
		r.Post("/shows/tmdb", showHandler.AddFromTMDB)
		r.Post("/shows/manual", showHandler.AddManual)
		r.Get("/shows/{showId}/episodes", episodeHandler.ListByShow)

		// User-specific show management
		r.Get("/users/{userId}/shows", showHandler.ListUserShows)
		r.Post("/users/{userId}/shows/{showId}", showHandler.AddShowToUser)
		r.Delete("/users/{userId}/shows/{showId}", showHandler.RemoveShowFromUser)

		// User-specific episode status
		r.Get("/users/{userId}/shows/{showId}/episodes", episodeHandler.ListByShowWithStatus)
		r.Post("/users/{userId}/episodes/{episodeId}/watched", episodeHandler.ToggleWatched)
		r.Delete("/users/{userId}/episodes/{episodeId}/watched", episodeHandler.ToggleWatched)
		r.Post("/users/{userId}/episodes/{episodeId}/blacklist", episodeHandler.ToggleBlacklist)
		r.Delete("/users/{userId}/episodes/{episodeId}/blacklist", episodeHandler.ToggleBlacklist)

		// Random episode
		r.Post("/users/{userId}/shows/{showId}/random", randomHandler.Generate)
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
