package permissions

import (
	"reflect"
	"testing"
)

func TestAddUser(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1], "allowed_chats": [10], "admins": [100]}`)
	defer cleanup()

	err := AddUser(2)
	if err != nil {
		t.Fatalf("AddUser() error = %v", err)
	}

	if !IsAllowedUser(2) {
		t.Errorf("User 2 should be allowed after AddUser")
	}

	// Test adding an existing user
	err = AddUser(1)
	if err != nil {
		t.Fatalf("AddUser() for existing user should not return an error, got %v", err)
	}
}

func TestRemoveUser(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1, 2], "allowed_chats": [10], "admins": [100]}`)
	defer cleanup()

	err := RemoveUser(2)
	if err != nil {
		t.Fatalf("RemoveUser() error = %v", err)
	}

	if IsAllowedUser(2) {
		t.Errorf("User 2 should not be allowed after RemoveUser")
	}
}

func TestAddChat(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1], "allowed_chats": [10], "admins": [100]}`)
	defer cleanup()

	err := AddChat(20)
	if err != nil {
		t.Fatalf("AddChat() error = %v", err)
	}

	if !IsAllowed(20) {
		t.Errorf("Chat 20 should be allowed after AddChat")
	}
}

func TestRemoveChat(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1], "allowed_chats": [10, 20], "admins": [100]}`)
	defer cleanup()

	err := RemoveChat(20)
	if err != nil {
		t.Fatalf("RemoveChat() error = %v", err)
	}

	if IsAllowed(20) {
		t.Errorf("Chat 20 should not be allowed after RemoveChat")
	}
}

func TestListUsers(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1, 2], "allowed_chats": [10], "admins": [100]}`)
	defer cleanup()

	expected := []int64{1, 2}
	actual := ListUsers()

	if !reflect.DeepEqual(expected, actual) {
		t.Errorf("ListUsers() = %v, want %v", actual, expected)
	}
}

func TestListChats(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1], "allowed_chats": [10, 20], "admins": [100]}`)
	defer cleanup()

	expected := []int64{10, 20}
	actual := ListChats()

	if !reflect.DeepEqual(expected, actual) {
		t.Errorf("ListChats() = %v, want %v", actual, expected)
	}
}
