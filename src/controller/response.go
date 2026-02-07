package controller

import (
	"ai-agent-go/src/code"
)

type Response struct {
	Code    code.Code `json:"code"`
	Message string    `json:"message,omitempty"`
}

func (this *Response) CodeOf(code code.Code) Response {
	if this == nil {
		this = new(Response)
	}
	this.Code = code
	this.Message = code.Message()
	return *this
}

func (this *Response) Success() {
	this.CodeOf(code.OK)
}
