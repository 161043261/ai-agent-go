package service

import (
	"ai-agent-go/src/rag"
	"ai-agent-go/src/utils"
	"context"
	"encoding/hex"
	"fmt"
	"hash/crc32"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
)

func UploadFile4rag(username string, fileHeader *multipart.FileHeader) (string, error) {
	if err := utils.ValidateFile(fileHeader); err != nil {
		log.Printf("File validation error: %v\n", err)
		return "", err
	}
	userDir := filepath.Join("uploads", username)
	// if err := os.MkdirAll(userDir, 0755); err != nil {
	// 	log.Printf("Create user directory error: %v\n", err)
	// 	return "", err
	// }
	// // Remove all
	// files, err := os.ReadDir(userDir)
	// if err != nil {
	// 	for _, f := range files {
	// 		if !f.IsDir() {
	// 			if err := rag.DeleteIndex(context.Background(), f.Name()); err != nil {
	// 				log.Printf("Delete index for %s error: %v\n", f.Name(), err)
	// 			}
	// 		}
	// 	}
	// }
	// if err := utils.RmShallow(userDir); err != nil {
	// 	log.Printf("Remove shallow %s error: %v\n", userDir, err)
	// 	return "", err
	// }
	extName := filepath.Ext(fileHeader.Filename)
	srcFile, err := fileHeader.Open()
	if err != nil {
		log.Printf("Open uploaded file error: %v\n", err)
		return "", err
	}
	defer srcFile.Close()
	filename, err := getCrc32filename(srcFile)
	if err != nil {
		log.Printf("Get filename error: %v\n", err)
		return "", err
	}
	dstPath := filepath.Join(userDir, filename+extName)
	dstFile, err := os.Create(dstPath)
	if err != nil {
		log.Printf("Create output file error: %v\n", err)
		return "", err
	}
	defer dstFile.Close()
	if _, err := io.Copy(dstFile, srcFile); err != nil {
		log.Printf("Copy file content error: %v\n", err)
		return "", err
	}
	log.Printf("File uploaded successfully: %s\n", dstPath)
	indexer, err := rag.NewRagIndexer(dstPath)
	if err != nil {
		log.Printf("Create RAG indexer error: %v\n", err)
		os.Remove(dstPath)
		return "", err
	}
	if err := indexer.IndexFile(context.Background(), filename, dstPath); err != nil {
		log.Printf("Index file error: %v\n", err)
		os.Remove(dstPath)
		rag.DeleteIndex(context.Background(), filename)
		return "", err
	}
	log.Printf("File indexed successfully: %s\n", filename)
	return dstPath, nil
}

func getCrc32filename(file multipart.File) (filename string, err error) {
	if _, err = file.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("file pointer reset error: %v\n", err)
	}
	hash := crc32.NewIEEE()
	if _, err = io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("read file and calculate crc32 error: %v\n", err)
	}
	crc32 := hash.Sum32()
	filename = hex.EncodeToString([]byte{
		byte(crc32 >> 24),
		byte(crc32 >> 16),
		byte(crc32 >> 8),
		byte(crc32),
	})
	return filename, nil
}
