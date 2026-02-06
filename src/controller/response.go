package controller

import (
	"ai-agent-go/src/constants"
)

type Response struct {
	Code    constants.Code `json:"code"`
	Message string         `json:"message,omitempty"`
}

func (r *Response) CodeOf(code constants.Code) Response {
	if r == nil {
		r = new(Response)
	}
	r.Code = code
	r.Message = code.Message()
	return *r
}

func (r *Response) Success() {
	r.CodeOf(constants.OK)
}
