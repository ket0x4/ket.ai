package chatcontext

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

const (
	dbFile = "history.db"
)

// Message represents a chat message.
type Message struct {
	Role      string
	Name      string
	Content   string
	CreatedAt time.Time
}

// InitDB initializes the SQLite database and creates necessary tables.
func InitDB() (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbFile)
	if err != nil {
		return nil, err
	}

	if err := createTables(db); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

func createTables(db *sql.DB) error {
	// Table for chat summaries and metadata
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS chat_metadata (
			chat_id INTEGER PRIMARY KEY,
			summary TEXT,
			message_counter INTEGER DEFAULT 0
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create chat_metadata table: %w", err)
	}

	// Table for messages with role and sender_name
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chat_id INTEGER,
			user_id INTEGER,
			role TEXT,
			sender_name TEXT,
			content TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(chat_id) REFERENCES chat_metadata(chat_id)
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create messages table: %w", err)
	}

	// Index for faster retrieval by chat_id
	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`)
	if err != nil {
		return fmt.Errorf("failed to create index on messages: %w", err)
	}

	return nil
}

// AddMessage adds a new message to the database.
func AddMessage(db *sql.DB, chatID int64, userID int64, role, name, content string) error {
	// Ensure chat metadata exists
	_, err := db.Exec(`INSERT OR IGNORE INTO chat_metadata (chat_id, summary, message_counter) VALUES (?, '', 0)`, chatID)
	if err != nil {
		return fmt.Errorf("failed to init chat metadata: %w", err)
	}

	_, err = db.Exec(`INSERT INTO messages (chat_id, user_id, role, sender_name, content) VALUES (?, ?, ?, ?, ?)`, chatID, userID, role, name, content)
	if err != nil {
		return fmt.Errorf("failed to insert message: %w", err)
	}

	// Increment message counter
	_, err = db.Exec(`UPDATE chat_metadata SET message_counter = message_counter + 1 WHERE chat_id = ?`, chatID)
	return err
}

// GetRecentMessages retrieves the last N messages for a chat.
func GetRecentMessages(db *sql.DB, chatID int64, limit int) ([]Message, error) {
	rows, err := db.Query(`
		SELECT role, sender_name, content, created_at FROM (
			SELECT role, sender_name, content, created_at FROM messages 
			WHERE chat_id = ? 
			ORDER BY created_at DESC 
			LIMIT ?
		) ORDER BY created_at ASC
	`, chatID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.Role, &msg.Name, &msg.Content, &msg.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, nil
}

// GetChatMetadata retrieves summary and message counter for a chat.
func GetChatMetadata(db *sql.DB, chatID int64) (string, int, error) {
	var summary string
	var counter int
	err := db.QueryRow(`SELECT summary, message_counter FROM chat_metadata WHERE chat_id = ?`, chatID).Scan(&summary, &counter)
	if err == sql.ErrNoRows {
		return "", 0, nil
	}
	if err != nil {
		return "", 0, err
	}
	return summary, counter, nil
}

// UpdateSummary updates the summary and resets the message counter.
func UpdateSummary(db *sql.DB, chatID int64, summary string) error {
	_, err := db.Exec(`UPDATE chat_metadata SET summary = ?, message_counter = 0 WHERE chat_id = ?`, summary, chatID)
	return err
}

// ClearHistory removes all messages and metadata for a chat.
func ClearHistory(db *sql.DB, chatID int64) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}

	if _, err := tx.Exec(`DELETE FROM messages WHERE chat_id = ?`, chatID); err != nil {
		tx.Rollback()
		return err
	}

	if _, err := tx.Exec(`DELETE FROM chat_metadata WHERE chat_id = ?`, chatID); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// CloseDB closes the database connection.
func CloseDB(db *sql.DB) {
	if db != nil {
		log.Println("ChatContext: Closing database connection...")
		db.Close()
	}
}
