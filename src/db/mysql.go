package db

import (
	"ai-agent-go/src/config"
	"ai-agent-go/src/model"
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var Mysql *gorm.DB

func InitMysql() error {
	cfg := config.Get().MysqlConfig

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=true&loc=Local", cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Db, cfg.Charset)
	log.Println("Mysql dsn:", dsn)

	var gormLogger logger.Interface
	if gin.Mode() == "debug" {
		gormLogger = logger.Default.LogMode(logger.Info)
	} else {
		gormLogger = logger.Default
	}

	db, err := gorm.Open(mysql.New(mysql.Config{
		DSN:                       dsn,
		DefaultStringSize:         256,
		DisableDatetimePrecision:  true,
		DontSupportRenameIndex:    true,
		DontSupportRenameColumn:   true,
		SkipInitializeWithVersion: false,
	}), &gorm.Config{
		Logger: gormLogger,
	})

	if err != nil {
		return err
	}

	// Go standard library database/sql
	standardDb, err := db.DB()
	if err != nil {
		return err
	}

	standardDb.SetMaxIdleConns(10)
	standardDb.SetMaxOpenConns(100)
	standardDb.SetConnMaxLifetime(time.Hour)

	Mysql = db

	return Mysql.AutoMigrate(
		new(model.User),
		new(model.Session),
		new(model.Message),
	)
}
