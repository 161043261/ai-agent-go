import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsBar } from "@/components/SettingsBar";

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
  const { t } = useTranslation();
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

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await api.get<SessionsResponse>("/AI/chat/sessions");
      if (
        response.data &&
        response.data.code === 1000 &&
        Array.isArray(response.data.sessions)
      ) {
        const sessionMap: Record<string, Session> = {};
        response.data.sessions.forEach((s) => {
          const sid = String(s.sessionId);
          sessionMap[sid] = {
            id: sid,
            name: s.name || `${t("chat.session")} ${sid}`,
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
          response.data.code === 1000 &&
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
      toast.warning(t("chat.selectSession"));
      return;
    }
    try {
      const response = await api.post<HistoryResponse>("/AI/chat/history", {
        sessionId: currentSessionId,
      });
      if (
        response.data &&
        response.data.code === 1000 &&
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
        toast.error(t("chat.noHistory"));
      }
    } catch (err) {
      console.error("Sync history error:", err);
      toast.error(t("chat.historyFailed"));
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) {
      toast.warning(t("chat.messageRequired"));
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
      toast.error(t("chat.sendFailed"));
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
                        name: t("chat.newSession"),
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
      toast.error(t("chat.streamError"));
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
        },
      );

      if (response.data && response.data.code === 1000) {
        const sessionId = String(response.data.sessionId);
        const aiMessage: Message = {
          role: "assistant",
          content: response.data.Information || "",
        };

        setSessions((prev) => ({
          ...prev,
          [sessionId]: {
            id: sessionId,
            name: t("chat.newSession"),
            messages: [{ role: "user", content: question }, aiMessage],
          },
        }));
        setCurrentSessionId(sessionId);
        setTempSession(false);
        setCurrentMessages([{ role: "user", content: question }, aiMessage]);
      } else {
        toast.error(response.data?.message || t("chat.sendFailed"));
        setCurrentMessages((prev) => prev.slice(0, -1));
      }
    } else {
      const response = await api.post<ChatResponse>("/AI/chat/send", {
        question,
        modelType: selectedModel,
        sessionId: currentSessionId,
      });

      if (response.data && response.data.code === 1000) {
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
        toast.error(response.data?.message || t("chat.sendFailed"));
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
        createResponse.data.code === 1000 &&
        createResponse.data.task_id
      ) {
        const taskId = createResponse.data.task_id;
        toast.info(t("chat.ttsGenerating"));

        await new Promise((resolve) => setTimeout(resolve, 5000));

        const maxAttempts = 30;
        const pollInterval = 2000;
        let attempts = 0;

        const pollResult = async (): Promise<boolean> => {
          const queryResponse = await api.get<TTSResponse>(
            "/AI/chat/tts/query",
            {
              params: { task_id: taskId },
            },
          );

          if (queryResponse.data && queryResponse.data.code === 1000) {
            const taskStatus = queryResponse.data.task_status;

            if (taskStatus === "Success" && queryResponse.data.task_result) {
              const audio = new Audio(queryResponse.data.task_result);
              audio.play();
              return true;
            } else if (taskStatus === "Running" || taskStatus === "Created") {
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise((resolve) =>
                  setTimeout(resolve, pollInterval),
                );
                return await pollResult();
              } else {
                toast.error(t("chat.ttsTimeout"));
                return true;
              }
            } else {
              toast.error(t("chat.ttsFailed"));
              return true;
            }
          }

          attempts++;
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            return await pollResult();
          } else {
            toast.error(t("chat.ttsTimeout"));
            return true;
          }
        };

        await pollResult();
      } else {
        toast.error(t("chat.ttsFailed"));
      }
    } catch (error) {
      console.error("TTS error:", error);
      toast.error(t("chat.ttsRequestFailed"));
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
      toast.error(t("chat.fileTypeError"));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post<{
        code: number;
        message?: string;
      }>("/file/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.code === 1000) {
        toast.success(t("chat.uploadSuccess"));
      } else {
        toast.error(response.data?.message || t("chat.uploadFailed"));
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(t("chat.uploadFailed"));
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
      .replace(
        /`(.*?)`/g,
        "<code class='bg-muted px-1.5 py-0.5 rounded text-sm'>$1</code>",
      )
      .replace(/\n/g, "<br>");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Session Sidebar */}
      <aside className="w-72 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Button
            onClick={createNewSession}
            className="w-full h-10 bg-card hover:bg-muted text-foreground border border-border rounded-full shadow-sm gap-2"
          >
            <Plus className="w-5 h-5 text-primary" />
            {t("chat.newChat")}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {Object.values(sessions).map((session) => (
              <button
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={`w-full text-left px-4 py-3 rounded-full mb-1 text-sm transition-colors ${
                  currentSessionId === session.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {session.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/menu")}
            className="gap-2 text-muted-foreground hover:bg-muted rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </Button>

          <div className="h-6 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={syncHistory}
            disabled={!currentSessionId || tempSession}
            className="gap-2 text-muted-foreground hover:bg-muted rounded-full"
          >
            <RefreshCw className="w-4 h-4" />
            {t("chat.syncHistory")}
          </Button>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-muted-foreground">
              {t("chat.model")}:
            </span>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-36 h-9 rounded-md border-input text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("chat.alibailian")}</SelectItem>
                <SelectItem value="2">{t("chat.alibailianRAG")}</SelectItem>
                <SelectItem value="3">{t("chat.alibailianMCP")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Checkbox
              id="streaming"
              checked={isStreaming}
              onCheckedChange={(checked) => setIsStreaming(!!checked)}
              className="border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label
              htmlFor="streaming"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {t("chat.streaming")}
            </label>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={triggerFileUpload}
            disabled={uploading}
            className="gap-2 text-muted-foreground hover:bg-muted rounded-full ml-auto"
          >
            <Paperclip className="w-4 h-4" />
            {t("chat.uploadDoc")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="h-6 w-px bg-border" />
          <SettingsBar />
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {currentMessages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-normal text-foreground mb-3">
                {t("chat.emptyTitle")}
              </h2>
              <p className="text-muted-foreground max-w-md">
                {t("chat.emptyDesc")}
              </p>
            </div>
          ) : (
            /* Messages List */
            <div className="max-w-3xl mx-auto py-6 px-4">
              {currentMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 mb-6 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === "user" ? "bg-primary" : "bg-accent"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-5 h-5 text-primary-foreground" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-primary" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`flex-1 ${
                      message.role === "user" ? "text-right" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-medium ${
                          message.role === "user"
                            ? "text-primary ml-auto"
                            : "text-foreground"
                        }`}
                      >
                        {message.role === "user" ? t("chat.you") : t("chat.ai")}
                      </span>
                      {message.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-muted rounded-full"
                          onClick={() => playTTS(message.content)}
                        >
                          <Volume2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                      {message.meta?.status === "streaming" && (
                        <span className="text-xs text-primary">
                          {t("chat.typing")}
                        </span>
                      )}
                    </div>
                    <div
                      className={`inline-block rounded-2xl px-4 py-3 max-w-full ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground text-left"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <div
                        className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(message.content),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-card border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-muted rounded-full border border-transparent focus-within:border-primary focus-within:bg-background transition-all">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.inputPlaceholder")}
                disabled={loading}
                rows={1}
                className="flex-1 bg-transparent px-6 py-3 resize-none focus:outline-none text-foreground placeholder-muted-foreground disabled:opacity-50"
                style={{ maxHeight: "120px" }}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || loading}
                size="sm"
                className="mr-2 w-10 h-10 p-0 rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:opacity-100"
              >
                <Send className="w-5 h-5 text-primary-foreground" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t("chat.sendHint")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
