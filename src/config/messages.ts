export const MESSAGES = {
	unauthorized_group_reply:
		"I don't have permission to talk in this group, I'm out! Contact my owner to add me.",
	private_chat_unauthorized:
		"Hey I only chat in groups approved by my owner. You can contact my owner to add me to your own group.",
	empty_reply_fallback: "I didn't know what to say.",
	error_reply_fallback: "My mind went blank, let's talk later.",
	empty_image_fallback: "Nice picture, but I didn't know what to say about it.",
	error_image_fallback:
		"Couldn't check the photo, must have gotten something in my eye.",
	image_processing_failed:
		"Got confused while looking at the photo, try again later.",
	not_authorized_command: "Only group admins or my owner can use this command!",
} as const;

export type Messages = { [K in keyof typeof MESSAGES]: string };
