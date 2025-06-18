package utils

import (
	"reflect"
	"testing"
)

func TestDetectYT(t *testing.T) {
	tests := []struct {
		name string
		text string
		want []string
	}{
		{
			name: "Single youtube.com link",
			text: "Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			want: []string{"https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
		},
		{
			name: "Single youtu.be link",
			text: "Here's a shorter link: https://youtu.be/dQw4w9WgXcQ",
			want: []string{"https://youtu.be/dQw4w9WgXcQ"},
		},
		{
			name: "Multiple links",
			text: "I found two cool videos: https://www.youtube.com/watch?v=video1 and http://youtu.be/video2",
			want: []string{"https://www.youtube.com/watch?v=video1", "http://youtu.be/video2"},
		},
		{
			name: "No links",
			text: "This is just a regular text without any links.",
			want: nil,
		},
		{
			name: "Link with extra parameters",
			text: "A video with timestamp: https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
			want: []string{"https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s"},
		},
		{
			name: "Embedded link",
			text: `Some text with an <a href="https://www.youtube.com/watch?v=xyz">embedded link</a>.
`,
			want: []string{"https://www.youtube.com/watch?v=xyz"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DetectYT(tt.text); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DetectYT() = %v, want %v", got, tt.want)
			}
		})
	}
}
