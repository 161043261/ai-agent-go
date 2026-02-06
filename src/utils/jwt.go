package utils

import (
	"ai-agent-go/src/config"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type Claims struct {
	Id       int64  `json:"id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func JwtToken(id int64, username string) (string, error) {
	jwtConfig := config.Get().JwtConfig
	claims := Claims{
		Id:       id,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(jwtConfig.ExpireDuration) * time.Hour)),
			Issuer:    jwtConfig.Issuer,
			Subject:   jwtConfig.Subject,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	return token.SignedString([]byte(jwtConfig.Key))
}

func ParseToken(token string) (string, bool) {
	claims := new(Claims)
	t, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		return []byte(config.Get().JwtConfig.Key), nil
	})
	if !t.Valid || err != nil || claims == nil {
		return "", false
	}
	return claims.Username, true
}
