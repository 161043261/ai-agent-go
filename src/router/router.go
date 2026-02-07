package router

import (
	"ai-agent-go/src/middleware"

	"github.com/gin-gonic/gin"
)

func Init() *gin.Engine {
	r := gin.Default()
	routerGroup := r.Group("/api/v1")

	userRouter(routerGroup.Group("/user"))

	aiGroup := routerGroup.Group("/ai")
	aiGroup.Use(middleware.Auth())
	aiRouter(aiGroup)

	fileGroup := routerGroup.Group("/file")
	fileGroup.Use(middleware.Auth())
	fileRouter(fileGroup)

	return r
}
