package router

import (
	"ai-agent-go/src/controller"

	"github.com/gin-gonic/gin"
)

func fileRouter(r *gin.RouterGroup) {
	r.POST("/upload", controller.UploadFile4rag)
}
