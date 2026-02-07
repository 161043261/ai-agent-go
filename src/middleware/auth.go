package middleware

import (
	"ai-agent-go/src/code"
	"ai-agent-go/src/controller"
	"ai-agent-go/src/utils"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func Auth() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		res := new(controller.Response)
		var token string
		authHeader := ctx.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			token = ctx.Query("token")
		}

		if token == "" {
			ctx.JSON(http.StatusOK, res.CodeOf(code.TokenInvalid))
			ctx.Abort()
			return
		}

		log.Println("Auth middleware, token:", token)
		username, ok := utils.ParseToken(token)
		if !ok {
			ctx.JSON(http.StatusOK, res.CodeOf(code.TokenInvalid))
			ctx.Abort()
			return
		}

		ctx.Set("username", username)
		ctx.Next()
	}
}
