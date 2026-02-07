package router

import (
	"ai-agent-go/src/controller"

	"github.com/gin-gonic/gin"
)

func aiRouter(r *gin.RouterGroup) {
	r.GET(
		"/chat/get-user-sessions-by-username",
		controller.GetUserSessionsByUsername,
	)
	r.POST(
		"/chat/create-session-and-send-message",
		controller.CreateSessionAndSendMessage,
	)
	r.POST(
		"/chat/send-message-2-session",
		controller.SendMessage2session,
	)
	r.POST(
		"/chat/send-message-stream-2-session",
		controller.SendMessageStream2session,
	)
	r.POST(
		"/chat/get-chat-history-list",
		controller.GetChatHistoryList,
	)
	r.POST(
		"/chat/create-session-and-send-message-stream",
		controller.CreateStreamSessionAndSendMessageStream,
	)
}
