package controller

import "GopherAI/common/code"

type Response struct {
	StatusCode code.Code `json:"code"`
	StatusMsg  string    `json:"message,omitempty"`
}

func (r *Response) CodeOf(code code.Code) Response {
	if nil == r {
		r = new(Response)
	}
	r.StatusCode = code
	r.StatusMsg = code.Msg()
	return *r
}

func (r *Response) Success() {
	r.CodeOf(code.CodeSuccess)
}
