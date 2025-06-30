package rag

import (
	"context"
	"fmt"
	"ket/backend"
	"log"
	"math"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
	
)

// Package rag implements a two-stage RAG (Retrieval-Augmented Generation) pipeline.
var (
	chatHistories = make(map[int64][]Document)
	initOnce      sync.Once
	rwMutex       sync.RWMutex
)

// Document represents a piece of information in the RAG system
type Document struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	ChatID    int64     `json:"chat_id"`
	UserID    int64     `json:"user_id"`
	Type      string    `json:"type"` // "message", "context", "summary"
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// SearchResult represents a document with relevance score
type SearchResult struct {
	Document Document
	Score    float64
}

// GetRagResponse implements a two-stage RAG pipeline with improved retrieval
func GetRagResponse(ctx context.Context, prompt string, chatID int64, userID int64) (string, error) {
	// Input validation
	if strings.TrimSpace(prompt) == "" {
		return "", fmt.Errorf("prompt cannot be empty")
	}

	log.Printf("RAG: Processing prompt for chat %d, user %d", chatID, userID)

	// Stage 1: Enhanced Retrieval - get relevant documents with better scoring
	retrievedDocs := retrieve(prompt, chatID, 8) // Increased limit for better context

	// Stage 2: Context preparation and generation
	contextStr := prepareContext(retrievedDocs)
	
	// Enhanced prompt with context
	finalPrompt := buildRAGPrompt(prompt, contextStr)

	// Add current interaction to history before generating response
	currentDoc := Document{
		ID:        fmt.Sprintf("%d_%d_%d", chatID, userID, time.Now().Unix()),
		Content:   prompt,
		Timestamp: time.Now(),
		ChatID:    chatID,
		UserID:    userID,
		Type:      "message",
		Metadata:  map[string]interface{}{"role": "user"},
	}
	
	if err := AddToCollection(ctx, chatID, currentDoc); err != nil {
		log.Printf("Failed to add user message to RAG collection: %v", err)
		// Don't fail the request if we can't save to history
	}

	// Get response from backend using RAG-enhanced prompt
	response, err := backend.GetResponseWithRAG(ctx, prompt, finalPrompt)
	if err != nil {
		return "", fmt.Errorf("failed to get response: %w", err)
	}

	// Add bot response to history
	responseDoc := Document{
		ID:        fmt.Sprintf("%d_bot_%d", chatID, time.Now().Unix()),
		Content:   response,
		Timestamp: time.Now(),
		ChatID:    chatID,
		UserID:    0, // Bot user ID
		Type:      "message",
		Metadata:  map[string]interface{}{"role": "assistant"},
	}
	
	if err := AddToCollection(ctx, chatID, responseDoc); err != nil {
		log.Printf("Failed to add bot response to RAG collection: %v", err)
		// Don't fail the request if we can't save to history
	}

	log.Printf("RAG: Successfully processed prompt with %d retrieved documents", len(retrievedDocs))
	return response, nil
}

// retrieve implements enhanced semantic search over chat history
func retrieve(query string, chatID int64, limit int) []SearchResult {
	rwMutex.RLock()
	history, exists := chatHistories[chatID]
	rwMutex.RUnlock()
	
	if !exists || len(history) == 0 {
		return []SearchResult{}
	}

	var results []SearchResult
	queryLower := strings.ToLower(query)
	queryWords := extractKeywords(queryLower)

	// Enhanced filtering: only consider documents from last 7 days for better relevance
	cutoffTime := time.Now().AddDate(0, 0, -7)
	
	for _, doc := range history {
		// Skip very old documents unless they're context type
		if doc.Type != "context" && doc.Timestamp.Before(cutoffTime) {
			continue
		}
		
		score := calculateEnhancedRelevanceScore(queryWords, doc, queryLower)
		if score > 0.05 { // Lowered threshold for better recall
			results = append(results, SearchResult{
				Document: doc,
				Score:    score,
			})
		}
	}

	// Sort by relevance score (descending)
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	// Return top results with diversity (avoid too many similar messages)
	return diversifyResults(results, limit)
}

// extractKeywords extracts meaningful keywords from query
func extractKeywords(query string) []string {
	// Remove common Turkish stop words
	stopWords := map[string]bool{
		"bir": true, "bu": true, "şu": true, "o": true, "de": true, "da": true,
		"ve": true, "ile": true, "için": true, "gibi": true, "var": true, "yok": true,
		"mi": true, "mı": true, "mu": true, "mü": true, "ki": true, "ne": true,
		"nasıl": true, "nerede": true, "kim": true, "hangi": true, "çok": true,
		"daha": true, "en": true, "her": true, "hiç": true, "böyle": true, "şöyle": true,
	}
	
	// Clean and split query
	reg := regexp.MustCompile(`[^\p{L}\p{N}\s]+`)
	cleaned := reg.ReplaceAllString(query, " ")
	words := strings.Fields(cleaned)
	
	var keywords []string
	for _, word := range words {
		word = strings.TrimSpace(word)
		if len(word) >= 3 && !stopWords[word] {
			keywords = append(keywords, word)
		}
	}
	
	return keywords
}

// calculateEnhancedRelevanceScore computes improved relevance between query and document
func calculateEnhancedRelevanceScore(queryWords []string, doc Document, fullQuery string) float64 {
	content := strings.ToLower(doc.Content)
	
	// 1. Exact phrase match (highest priority)
	exactMatchScore := 0.0
	if strings.Contains(content, fullQuery) {
		exactMatchScore = 3.0
	}
	
	// 2. Enhanced word overlap with TF-IDF-like scoring
	wordScore := 0.0
	contentWords := extractKeywords(content)
	contentWordMap := make(map[string]int)
	for _, word := range contentWords {
		contentWordMap[word]++
	}
	
	for _, qWord := range queryWords {
		if count, exists := contentWordMap[qWord]; exists {
			// Boost score based on word frequency and inverse length
			wordScore += float64(count) * (1.0 + 1.0/float64(len(qWord)))
		}
		
		// Partial matches for Turkish language flexibility
		for cWord := range contentWordMap {
			if strings.Contains(cWord, qWord) || strings.Contains(qWord, cWord) {
				if cWord != qWord { // Avoid double counting exact matches
					wordScore += 0.5
				}
			}
		}
	}
	
	// Normalize by document length (prevent long documents from dominating)
	if len(contentWords) > 0 {
		wordScore = wordScore / math.Log(1.0+float64(len(contentWords)))
	}
	
	// 3. Enhanced recency scoring with exponential decay
	recencyScore := 0.0
	age := time.Since(doc.Timestamp).Hours()
	if age < 168 { // Within last week
		recencyScore = 1.0 * math.Exp(-age/48.0) // Exponential decay with 48h half-life
	}
	
	// 4. Type-based scoring with better weights
	typeScore := 0.0
	switch doc.Type {
	case "context":
		typeScore = 1.0 // Context documents are very valuable
	case "summary":
		typeScore = 0.8 // Summaries provide good overview
	case "message":
		typeScore = 0.3 // Regular messages
	}
	
	// 5. User interaction bonus (prefer messages from the same user)
	userScore := 0.0
	if role, ok := doc.Metadata["role"].(string); ok && role == "user" {
		userScore = 0.2
	}
	
	// 6. Content quality scoring (prefer longer, more informative content)
	qualityScore := 0.0
	if len(doc.Content) > 20 && len(doc.Content) < 500 {
		qualityScore = 0.3
	}
	
	totalScore := exactMatchScore + wordScore + recencyScore + typeScore + userScore + qualityScore
	
	return totalScore
}

// diversifyResults ensures result diversity to avoid redundant context
func diversifyResults(results []SearchResult, limit int) []SearchResult {
	if len(results) <= limit {
		return results
	}
	
	var diversified []SearchResult
	usedContent := make(map[string]bool)
	
	for _, result := range results {
		if len(diversified) >= limit {
			break
		}
		
		// Simple similarity check to avoid near-duplicate content
		contentKey := strings.ToLower(result.Document.Content)
		if len(contentKey) > 50 {
			contentKey = contentKey[:50]
		}
		
		if !usedContent[contentKey] {
			diversified = append(diversified, result)
			usedContent[contentKey] = true
		}
	}
	
	return diversified
}

// Legacy function kept for compatibility
func calculateRelevanceScore(queryWords []string, doc Document, fullQuery string) float64 {
	return calculateEnhancedRelevanceScore(queryWords, doc, fullQuery)
}

// prepareContext formats retrieved documents into enhanced context string
func prepareContext(results []SearchResult) string {
	if len(results) == 0 {
		return ""
	}
	
	var contextParts []string
	
	// Group by conversation threads if possible
	for i, result := range results {
		timestamp := result.Document.Timestamp.Format("02.01 15:04")
		
		// Add role indicator
		roleIcon := "💬"
		if result.Document.Type == "context" {
			roleIcon = "📝"
		} else if result.Document.UserID == 0 {
			roleIcon = "🤖"
		} else {
			roleIcon = "👤"
		}
		
		// Truncate very long content but preserve important parts
		content := result.Document.Content
		if len(content) > 200 {
			// Try to keep the beginning and end
			content = content[:100] + "..." + content[len(content)-50:]
		}
		
		// Add relevance score for debugging (can be removed in production)
		contextParts = append(contextParts, 
			fmt.Sprintf("%s [%d] (%s) [Score: %.2f]\n%s", 
				roleIcon, i+1, timestamp, result.Score, content))
	}
	
	return strings.Join(contextParts, "\n\n")
}

// buildRAGPrompt creates the enhanced final prompt with context
func buildRAGPrompt(userPrompt, context string) string {
	if context == "" {
		return userPrompt
	}
	
	return fmt.Sprintf(`🧠 BAĞLAM BİLGİLERİ (RAG Sistemi):

%s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 GÖREV: Yukarıdaki bağlam bilgilerini kullanarak aşağıdaki soruyu yanıtla. 

📋 TALİMATLAR:
- Bağlam bilgileri alakalıysa bunları kullan ve referans ver
- Bağlam bilgileri alakasızsa normal şekilde yanıtla
- Önceki konuşmalarda bahsedilen kişi/olay/konulara atıfta bulunabilirsin
- Kısa ve özlü yanıtlar ver, gereksiz tekrar yapma

❓ KULLANICI SORUSU:
%s`, context, userPrompt)
}

// AddToCollection adds a document to the specified chat's collection with improved management
func AddToCollection(ctx context.Context, chatID int64, document Document) error {
	rwMutex.Lock()
	defer rwMutex.Unlock()
	
	const maxHistory = 1000 // Increased for better context retention
	const maxContextDocs = 50 // Separate limit for context documents
	
	// Initialize chat history if not exists
	if chatHistories[chatID] == nil {
		chatHistories[chatID] = make([]Document, 0)
	}
	
	// Add document
	chatHistories[chatID] = append(chatHistories[chatID], document)
	
	// Smart trimming: preserve context documents and recent important messages
	if len(chatHistories[chatID]) > maxHistory {
		// Separate context docs from regular messages
		var contextDocs, regularDocs []Document
		
		for _, doc := range chatHistories[chatID] {
			if doc.Type == "context" {
				contextDocs = append(contextDocs, doc)
			} else {
				regularDocs = append(regularDocs, doc)
			}
		}
		
		// Keep all context docs (up to limit) and most recent regular docs
		if len(contextDocs) > maxContextDocs {
			// Keep most recent context docs
			contextDocs = contextDocs[len(contextDocs)-maxContextDocs:]
		}
		
		regularDocsToKeep := maxHistory - len(contextDocs)
		if len(regularDocs) > regularDocsToKeep {
			regularDocs = regularDocs[len(regularDocs)-regularDocsToKeep:]
		}
		
		// Combine and sort by timestamp
		chatHistories[chatID] = append(contextDocs, regularDocs...)
		sort.Slice(chatHistories[chatID], func(i, j int) bool {
			return chatHistories[chatID][i].Timestamp.Before(chatHistories[chatID][j].Timestamp)
		})
	}
	
	// Persist to disk asynchronously to avoid blocking
	go func() {
		if err := SaveChatHistories(chatHistories); err != nil {
			log.Printf("Failed to persist RAG data: %v", err)
		}
	}()
	
	return nil
}

// AddContextDocument adds important context that should be preserved
func AddContextDocument(ctx context.Context, chatID int64, content string, metadata map[string]interface{}) error {
	doc := Document{
		ID:        fmt.Sprintf("%d_context_%d", chatID, time.Now().Unix()),
		Content:   content,
		Timestamp: time.Now(),
		ChatID:    chatID,
		UserID:    0,
		Type:      "context",
		Metadata:  metadata,
	}
	
	return AddToCollection(ctx, chatID, doc)
}

// GetChatHistory returns the conversation history for a chat
func GetChatHistory(chatID int64, limit int) []Document {
	rwMutex.RLock()
	defer rwMutex.RUnlock()
	
	history, exists := chatHistories[chatID]
	if !exists {
		return []Document{}
	}
	
	if limit > 0 && len(history) > limit {
		return history[len(history)-limit:]
	}
	
	return history
}

// ClearChatHistory removes all history for a specific chat
func ClearChatHistory(chatID int64) error {
	rwMutex.Lock()
	defer rwMutex.Unlock()
	
	delete(chatHistories, chatID)
	return SaveChatHistories(chatHistories)
}

// GetStats returns enhanced statistics about the RAG system
func GetStats() map[string]interface{} {
	rwMutex.RLock()
	defer rwMutex.RUnlock()
	
	totalDocs := 0
	chatsWithHistory := 0
	contextDocs := 0
	messagesByDay := make(map[string]int)
	
	for _, history := range chatHistories {
		if len(history) > 0 {
			chatsWithHistory++
			totalDocs += len(history)
			
			for _, doc := range history {
				if doc.Type == "context" {
					contextDocs++
				}
				
				// Count messages by day for activity tracking
				dayKey := doc.Timestamp.Format("2006-01-02")
				messagesByDay[dayKey]++
			}
		}
	}
	
	// Calculate average documents per chat
	avgDocsPerChat := 0.0
	if chatsWithHistory > 0 {
		avgDocsPerChat = float64(totalDocs) / float64(chatsWithHistory)
	}
	
	return map[string]interface{}{
		"total_documents":      totalDocs,
		"chats_with_history":   chatsWithHistory,
		"total_chats_tracked":  len(chatHistories),
		"context_documents":    contextDocs,
		"avg_docs_per_chat":    avgDocsPerChat,
		"activity_by_day":      messagesByDay,
	}
}

// CreateConversationSummary creates a summary of recent conversation for context
func CreateConversationSummary(chatID int64, hours int) error {
	rwMutex.RLock()
	history, exists := chatHistories[chatID]
	rwMutex.RUnlock()
	
	if !exists || len(history) == 0 {
		return fmt.Errorf("no history found for chat %d", chatID)
	}
	
	// Get messages from last N hours
	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)
	var recentMessages []Document
	
	for _, doc := range history {
		if doc.Timestamp.After(cutoff) && doc.Type == "message" {
			recentMessages = append(recentMessages, doc)
		}
	}
	
	if len(recentMessages) < 3 {
		return fmt.Errorf("not enough recent messages to summarize")
	}
	
	// Create summary content
	var summary strings.Builder
	summary.WriteString(fmt.Sprintf("Son %d saatin konuşma özeti:\n", hours))
	
	userMessages := 0
	botMessages := 0
	for _, msg := range recentMessages {
		if msg.UserID == 0 {
			botMessages++
		} else {
			userMessages++
		}
	}
	
	summary.WriteString(fmt.Sprintf("- %d kullanıcı mesajı, %d bot yanıtı\n", userMessages, botMessages))
	summary.WriteString("- Ana konular: ")
	
	// Simple keyword extraction for topics
	allText := ""
	for _, msg := range recentMessages {
		allText += " " + msg.Content
	}
	
	keywords := extractKeywords(strings.ToLower(allText))
	if len(keywords) > 5 {
		keywords = keywords[:5]
	}
	summary.WriteString(strings.Join(keywords, ", "))
	
	// Add as context document
	metadata := map[string]interface{}{
		"type":           "auto_summary",
		"hours_covered":  hours,
		"message_count":  len(recentMessages),
		"generated_at":   time.Now(),
	}
	
	return AddContextDocument(context.Background(), chatID, summary.String(), metadata)
}

// SearchSimilarQuestions finds similar questions asked before
func SearchSimilarQuestions(query string, chatID int64) []SearchResult {
	rwMutex.RLock()
	history, exists := chatHistories[chatID]
	rwMutex.RUnlock()
	
	if !exists {
		return []SearchResult{}
	}
	
	var results []SearchResult
	queryWords := extractKeywords(strings.ToLower(query))
	
	for _, doc := range history {
		// Only look at user messages (questions)
		if doc.UserID != 0 && doc.Type == "message" {
			score := calculateEnhancedRelevanceScore(queryWords, doc, strings.ToLower(query))
			if score > 0.5 { // Higher threshold for similar questions
				results = append(results, SearchResult{
					Document: doc,
					Score:    score,
				})
			}
		}
	}
	
	// Sort by relevance
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})
	
	// Return top 3 similar questions
	if len(results) > 3 {
		results = results[:3]
	}
	
	return results
}

// CleanupOldDocuments removes very old documents to keep storage manageable
func CleanupOldDocuments(olderThanDays int) error {
	rwMutex.Lock()
	defer rwMutex.Unlock()
	
	cutoff := time.Now().AddDate(0, 0, -olderThanDays)
	cleaned := 0
	
	for chatID, history := range chatHistories {
		var newHistory []Document
		
		for _, doc := range history {
			// Keep context documents and recent messages
			if doc.Type == "context" || doc.Timestamp.After(cutoff) {
				newHistory = append(newHistory, doc)
			} else {
				cleaned++
			}
		}
		
		chatHistories[chatID] = newHistory
		
		// Remove empty chat histories
		if len(newHistory) == 0 {
			delete(chatHistories, chatID)
		}
	}
	
	log.Printf("RAG: Cleaned up %d old documents", cleaned)
	
	// Persist changes
	return SaveChatHistories(chatHistories)
}

// Initialize RAG system - load existing data
func init() {
	initOnce.Do(func() {
		if data, err := LoadChatHistories(); err == nil {
			chatHistories = data
			log.Printf("RAG: Loaded chat histories for %d chats", len(chatHistories))
		} else {
			log.Printf("RAG: Failed to load chat histories: %v", err)
		}
	})
}
