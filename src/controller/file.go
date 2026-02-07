package controller

import (
	"ai-agent-go/src/code"
	"ai-agent-go/src/service"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UploadFileResponse struct {
	Filepath string `json:"filepath,omitempty"`
	Response
}

func UploadFile4rag(c *gin.Context) {
	res := new(UploadFileResponse)
	uploadedFile, err := c.FormFile("file")
	if err != nil {
		log.Println("Uploaded file not found")
		c.JSON(http.StatusOK, res.CodeOf(code.ParamsInvalid))
		return
	}
	// username is decrypted from jwt
	username := c.GetString("username")
	if username == "" {
		log.Println("Username is empty")
		c.JSON(http.StatusOK, res.CodeOf(code.TokenInvalid))
		return
	}
	fpath, err := service.UploadFile4rag(username, uploadedFile)
	if err != nil {
		log.Printf("Upload file error: %v\n", err)
		c.JSON(http.StatusOK, res.CodeOf(code.ServerError))
		return
	}
	res.Success()
	res.Filepath = fpath
	c.JSON(http.StatusOK, res)
}
