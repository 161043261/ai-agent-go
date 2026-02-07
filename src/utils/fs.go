package utils

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
)

// unlink 删除文件
// rmdir 删除空目录
// rm 删除文件/目录, 可以递归, 强制

func RmShallow(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			fpath := filepath.Join(dir, entry.Name())
			if err := os.Remove(fpath); err != nil {
				return err
			}
		}
	}
	return nil
}

func ValidateFile(file *multipart.FileHeader) error {
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".md" && ext != ".txt" {
		return fmt.Errorf("file type %s not supported, only .md or .txt files are supported\n", ext)
	}
	return nil
}
