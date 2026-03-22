package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

const migrationSQL = `
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shows (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id        INT UNIQUE,
    name           TEXT NOT NULL,
    poster_url     TEXT,
    backdrop_url   TEXT,
    total_seasons  INT NOT NULL DEFAULT 0,
    overview       TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS episodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    season_number   INT NOT NULL,
    episode_number  INT NOT NULL,
    title           TEXT,
    overview        TEXT,
    still_url       TEXT,
    air_date        DATE,
    UNIQUE(show_id, season_number, episode_number)
);

CREATE TABLE IF NOT EXISTS user_shows (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id    UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, show_id)
);

CREATE TABLE IF NOT EXISTS watched_episodes (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id  UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    watched_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, episode_id)
);

CREATE TABLE IF NOT EXISTS blacklisted_episodes (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id  UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, episode_id)
);

CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_user_shows_user_id ON user_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_episodes_user_id ON watched_episodes(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_episodes_user_id ON blacklisted_episodes(user_id);
`

func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, migrationSQL)
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}
	return nil
}
