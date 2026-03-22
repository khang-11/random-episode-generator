package models

import "time"

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateUserRequest struct {
	Name string `json:"name"`
}
