package code

type Code int

const (
	OK                Code = 1000
	ParamsInvalid     Code = 2001
	UserExist         Code = 2002
	UserNotExist      Code = 2003
	PasswordError     Code = 2004
	PasswordNotMatch  Code = 2005
	TokenInvalid      Code = 2006
	NotLogin          Code = 2007
	CaptchaInvalid    Code = 2008
	RecordNotFound    Code = 2009
	PasswordIllegal   Code = 2010
	Forbidden         Code = 3001
	ServerError       Code = 4001
	ModelNotFound     Code = 5001
	ModelNoPermission Code = 5002
	ModelError        Code = 5003
)

var phases = map[Code]string{
	OK:                "OK",
	ParamsInvalid:     "Params Invalid",
	UserExist:         "User Exist",
	UserNotExist:      "User Not Exist",
	PasswordError:     "Password Error",
	PasswordNotMatch:  "Password Not Match",
	TokenInvalid:      "Token Invalid",
	NotLogin:          "Not Login",
	CaptchaInvalid:    "Captcha Invalid",
	RecordNotFound:    "Record Not Found",
	PasswordIllegal:   "Password Illegal",
	Forbidden:         "Forbidden",
	ServerError:       "Server Error",
	ModelNotFound:     "Model Not Found",
	ModelNoPermission: "Model No Permission",
	ModelError:        "Model Error",
}

func (code Code) Message() string {
	if m, ok := phases[code]; ok {
		return m
	}
	return phases[ServerError]
}
