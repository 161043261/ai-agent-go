package utils

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
)

func GetRandStrBase64(length int) (string, error) {
	b := make([]byte, (length*3+3)/4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	str := base64.URLEncoding.EncodeToString(b)
	return str[:length], nil
}

func GetRandStrHex(length int) (string, error) {
	b := make([]byte, (length+1)/2)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b)[:length], nil
}
