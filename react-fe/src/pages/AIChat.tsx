import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import type {
  SessionsResponse,
  HistoryResponse,
  ChatResponse,
  TTSResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Paperclip,
  Volume2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  meta?: {
    status?: "streaming" | "done" | "error";
  };
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
}

export default function AIChat() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [tempSession, setTempSession] = useState(false);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("1");
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, scrollToBottom]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await api.get<SessionsResponse>("/AI/chat/sessions");
      if (
        response.data &&
        response.data.status_code === 1000 &&
        Array.isArray(response.data.sessions)
      ) {
        const sessionMap: Record<string, Session> = {};
        response.data.sessions.forEach((s) => {
          const sid = String(s.sessionId);
          sessionMap[sid] = {
            id: sid,
            name: s.name || `会话 ${sid}`,
            messages: [],
          };
        });
        setSessions(sessionMap);
      }
    } catch (error) {
      console.error("Load sessions error:", error);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId("temp");
    setTempSession(true);
    setCurrentMessages([]);
    textareaRef.current?.focus();
  };

  const switchSession = async (sessionId: string) => {
    if (!sessionId) return;
    setCurrentSessionId(sessionId);
    setTempSession(false);

    // Lazy load history if not present
    if (
      !sessions[sessionId]?.messages ||
      sessions[sessionId].messages.length === 0
    ) {
      try {
        const response = await api.post<HistoryResponse>("/AI/chat/history", {
          sessionId,
        });
        if (
          response.data &&
          response.data.status_code === 1000 &&
          Array.isArray(response.data.history)
        ) {
          const messages: Message[] = response.data.history.map((item) => ({
            role: item.is_user ? "user" : "assistant",
            content: item.content,
          }));
          setSessions((prev) => ({
            ...prev,
            [sessionId]: { ...prev[sessionId], messages },
          }));
          setCurrentMessages(messages);
          return;
        }
      } catch (err) {
        console.error("Load history error:", err);
      }
    }

    setCurrentMessages([...(sessions[sessionId]?.messages || [])]);
  };

  const syncHistory = async () => {
    if (!currentSessionId || tempSession) {
      toast.warning("请选择已有会话进行同步");
      return;
    }
    try {
      const response = await api.post<HistoryResponse>("/AI/chat/history", {
        sessionId: currentSessionId,
      });
      if (
        response.data &&
        response.data.status_code === 1000 &&
        Array.isArray(response.data.history)
      ) {
        const messages: Message[] = response.data.history.map((item) => ({
          role: item.is_user ? "user" : "assistant",
          content: item.content,
        }));
        setSessions((prev) => ({
          ...prev,
          [currentSessionId]: { ...prev[currentSessionId], messages },
        }));
        setCurrentMessages(messages);
      } else {
        toast.error("无法获取历史数据");
      }
    } catch (err) {
      console.error("Sync history error:", err);
      toast.error("请求历史数据失败");
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) {
      toast.warning("请输入消息内容");
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
    };
    const currentInput = inputMessage;
    setInputMessage("");

    setCurrentMessages((prev) => [...prev, userMessage]);

    try {
      setLoading(true);
      if (isStreaming) {
        await handleStreaming(currentInput);
      } else {
        await handleNormal(currentInput);
      }
    } catch (err) {
      console.error("Send message error:", err);
      toast.error("发送失败，请重试");
      setCurrentMessages((prev) => prev.slice(0, -1));
    } finally {
      if (!isStreaming) {
        setLoading(false);
      }
    }
  };

  const handleStreaming = async (question: string) => {
    const aiMessage: Message = {
      role: "assistant",
      content: "",
      meta: { status: "streaming" },
    };

    setCurrentMessages((prev) => [...prev, aiMessage]);

    const url = tempSession
      ? "/api/AI/chat/send-stream-new-session"
      : "/api/AI/chat/send-stream";

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    };

    const body = tempSession
      ? { question, modelType: selectedModel }
      : { question, modelType: selectedModel, sessionId: currentSessionId };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setLoading(false);
        throw new Error("Network response was not ok");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("data:")) {
            const data = trimmedLine.slice(5).trim();

            if (data === "[DONE]") {
              setLoading(false);
              setCurrentMessages((prev) => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (newMessages[lastIdx]?.role === "assistant") {
                  newMessages[lastIdx] = {
                    ...newMessages[lastIdx],
                    meta: { status: "done" },
                  };
                }
                return newMessages;
              });
            } else if (data.startsWith("{")) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.sessionId) {
                  const newSid = String(parsed.sessionId);
                  if (tempSession) {
                    setSessions((prev) => ({
                      ...prev,
                      [newSid]: {
                        id: newSid,
                        name: "新会话",
                        messages: [],
                      },
                    }));
                    setCurrentSessionId(newSid);
                    setTempSession(false);
                  }
                }
              } catch {
                accumulatedContent += data;
                updateStreamingMessage(accumulatedContent);
              }
            } else {
              accumulatedContent += data;
              updateStreamingMessage(accumulatedContent);
            }
          }
        }
      }

      setLoading(false);
      setCurrentMessages((prev) => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        if (newMessages[lastIdx]?.role === "assistant") {
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            meta: { status: "done" },
          };
        }
        return newMessages;
      });
    } catch (err) {
      console.error("Stream error:", err);
      setLoading(false);
      setCurrentMessages((prev) => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        if (newMessages[lastIdx]?.role === "assistant") {
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            meta: { status: "error" },
          };
        }
        return newMessages;
      });
      toast.error("流式传输出错");
    }
  };

  const updateStreamingMessage = (content: string) => {
    setCurrentMessages((prev) => {
      const newMessages = [...prev];
      const lastIdx = newMessages.length - 1;
      if (newMessages[lastIdx]?.role === "assistant") {
        newMessages[lastIdx] = {
          ...newMessages[lastIdx],
          content,
        };
      }
      return newMessages;
    });
  };

  const handleNormal = async (question: string) => {
    if (tempSession) {
      const response = await api.post<ChatResponse>(
        "/AI/chat/send-new-session",
        {
          question,
          modelType: selectedModel,
        }
      );

      if (response.data && response.data.status_code === 1000) {
        const sessionId = String(response.data.sessionId);
        const aiMessage: Message = {
          role: "assistant",
          content: response.data.Information || "",
        };

        setSessions((prev) => ({
          ...prev,
          [sessionId]: {
            id: sessionId,
            name: "新会话",
            messages: [{ role: "user", content: question }, aiMessage],
          },
        }));
        setCurrentSessionId(sessionId);
        setTempSession(false);
        setCurrentMessages([{ role: "user", content: question }, aiMessage]);
      } else {
        toast.error(response.data?.status_msg || "发送失败");
        setCurrentMessages((prev) => prev.slice(0, -1));
      }
    } else {
      const response = await api.post<ChatResponse>("/AI/chat/send", {
        question,
        modelType: selectedModel,
        sessionId: currentSessionId,
      });

      if (response.data && response.data.status_code === 1000) {
        const aiMessage: Message = {
          role: "assistant",
          content: response.data.Information || "",
        };
        setCurrentMessages((prev) => [...prev, aiMessage]);

        if (currentSessionId) {
          setSessions((prev) => ({
            ...prev,
            [currentSessionId]: {
              ...prev[currentSessionId],
              messages: [
                ...prev[currentSessionId].messages,
                { role: "user", content: question },
                aiMessage,
              ],
            },
          }));
        }
      } else {
        toast.error(response.data?.status_msg || "发送失败");
        setCurrentMessages((prev) => prev.slice(0, -1));
      }
    }
  };

  const playTTS = async (text: string) => {
    try {
      const createResponse = await api.post<TTSResponse>("/AI/chat/tts", {
        text,
      });
      if (
        createResponse.data &&
        createResponse.data.status_code === 1000 &&
        createResponse.data.task_id
      ) {
        const taskId = createResponse.data.task_id;
        toast.info("正在生成语音...");

        // Wait 5 seconds before polling
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const maxAttempts = 30;
        const pollInterval = 2000;
        let attempts = 0;

        const pollResult = async (): Promise<boolean> => {
          const queryResponse = await api.get<TTSResponse>(
            "/AI/chat/tts/query",
            {
              params: { task_id: taskId },
            }
          );

          if (
            queryResponse.data &&
            queryResponse.data.status_code === 1000
          ) {
            const taskStatus = queryResponse.data.task_status;

            if (
              taskStatus === "Success" &&
              queryResponse.data.task_result
            ) {
              const audio = new Audio(queryResponse.data.task_result);
              audio.play();
              return true;
            } else if (taskStatus === "Running" || taskStatus === "Created") {
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise((resolve) =>
                  setTimeout(resolve, pollInterval)
                );
                return await pollResult();
              } else {
                toast.error("语音合成超时");
                return true;
              }
            } else {
              toast.error("语音合成失败");
              return true;
            }
          }

          attempts++;
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            return await pollResult();
          } else {
            toast.error("语音合成超时");
            return true;
          }
        };

        await pollResult();
      } else {
        toast.error("无法创建语音合成任务");
      }
    } catch (error) {
      console.error("TTS error:", error);
      toast.error("请求语音接口失败");
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".md") && !fileName.endsWith(".txt")) {
      toast.error("只允许上传 .md 或 .txt 文件");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post<{ status_code: number; status_msg?: string }>(
        "/file/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && response.data.status_code === 1000) {
        toast.success("文件上传成功");
      } else {
        toast.error(response.data?.status_msg || "上传失败");
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("文件上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code class='bg-gray-100 px-1 rounded'>$1</code>")
      .replace(/\n/g, "<br>");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Session List */}
      <aside className="w-72 bg-white/95 backdrop-blur-xl border-r border-gray-100 flex flex-col relative z-10">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <span className="font-semibold text-gray-700">会话列表</span>
          <Button
            onClick={createNewSession}
            className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新聊天
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {Object.values(sessions).map((session) => (
              <button
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all ${
                  currentSessionId === session.id
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                {session.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Chat Section */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Top Bar */}
        <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 px-6 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/menu")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={syncHistory}
            disabled={!currentSessionId || tempSession}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            同步历史
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">选择模型：</span>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">阿里百炼</SelectItem>
                <SelectItem value="2">阿里百炼 RAG</SelectItem>
                <SelectItem value="3">阿里百炼 MCP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="streaming"
              checked={isStreaming}
              onCheckedChange={(checked) => setIsStreaming(!!checked)}
            />
            <label htmlFor="streaming" className="text-sm text-gray-600 cursor-pointer">
              流式响应
            </label>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileUpload}
            disabled={uploading}
            className="gap-2 ml-auto"
          >
            <Paperclip className="w-4 h-4" />
            上传文档
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {currentMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "bg-white/95 backdrop-blur text-gray-800 shadow-md border border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {message.role === "user" ? "你" : "AI"}
                    </span>
                    {message.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => playTTS(message.content)}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    )}
                    {message.meta?.status === "streaming" && (
                      <span className="text-xs opacity-60">输入中...</span>
                    )}
                  </div>
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(message.content),
                    }}
                  />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 p-6">
          <div className="max-w-4xl mx-auto relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入你的问题..."
              disabled={loading}
              rows={1}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || loading}
              className="absolute right-2 bottom-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {loading ? (
                "发送中..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  发送
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
