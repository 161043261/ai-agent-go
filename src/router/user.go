package router

import (
	"ai-agent-go/src/controller"

	"github.com/gin-gonic/gin"
)

func userRouter(r *gin.RouterGroup) {
	r.POST("/login", controller.Login)
	r.POST("/register", controller.Register)
}
