package middleware

import (
	"os"
	"strings"

	"github.com/go-chi/cors"
)

func CORSHandler() *cors.Cors {
	origins := []string{"http://localhost:5173", "http://localhost:3000"}
	if extra := os.Getenv("CORS_ORIGINS"); extra != "" {
		origins = append(origins, strings.Split(extra, ",")...)
	}
	return cors.New(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
