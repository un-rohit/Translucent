using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace InvisibleChat
{
    public class ChatService
    {
        private readonly HttpClient _httpClient;

        public ChatService()
        {
            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(90);
        }

        private bool IsGeminiApi(string apiUrl)
        {
            return apiUrl.Contains("googleapis.com", StringComparison.OrdinalIgnoreCase) ||
                   apiUrl.Contains("generativelanguage", StringComparison.OrdinalIgnoreCase);
        }

        // ──────────────────────────────────────────────────────────────────────
        // STREAMING API DISPATCHER
        // ──────────────────────────────────────────────────────────────────────
        public async IAsyncEnumerable<string> StreamMessageAsync(List<ChatMessage> conversationHistory, AppConfig config)
        {
            if (string.IsNullOrWhiteSpace(config.ApiKey))
            {
                yield return "Please enter your **Gemini API Key** in Settings (⚙️ icon) to start chatting!\n\n" +
                             "You can get a free key at **aistudio.google.com/apikey**.";
                yield break;
            }

            IAsyncEnumerable<string> stream;
            if (IsGeminiApi(config.ApiUrl))
            {
                stream = StreamGeminiAsync(conversationHistory, config);
            }
            else
            {
                stream = StreamOpenAIAsync(conversationHistory, config);
            }

            await foreach (var token in stream)
            {
                yield return token;
            }
        }

        // ──────────────────────────────────────────────────────────────────────
        // GEMINI STREAMING (streamGenerateContent?alt=sse)
        // ──────────────────────────────────────────────────────────────────────
        private async IAsyncEnumerable<string> StreamGeminiAsync(List<ChatMessage> history, AppConfig config)
        {
            string model = string.IsNullOrWhiteSpace(config.ModelName) ? "gemini-2.0-flash" : config.ModelName;
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={config.ApiKey}";

            var contents = new List<object>();
            foreach (var msg in history)
            {
                var parts = new List<object>();
                if (!string.IsNullOrEmpty(msg.Content))
                {
                    parts.Add(new { text = msg.Content });
                }
                if (!string.IsNullOrEmpty(msg.ImageBase64))
                {
                    parts.Add(new
                    {
                        inline_data = new
                        {
                            mime_type = "image/png",
                            data = msg.ImageBase64
                        }
                    });
                }
                if (parts.Count == 0)
                {
                    parts.Add(new { text = " " });
                }

                contents.Add(new
                {
                    role = msg.IsUser ? "user" : "model",
                    parts = parts
                });
            }

            object requestBody;
            if (!string.IsNullOrWhiteSpace(config.SystemPrompt))
            {
                requestBody = new
                {
                    system_instruction = new
                    {
                        parts = new[] { new { text = config.SystemPrompt } }
                    },
                    contents,
                    generationConfig = new
                    {
                        temperature = 0.7,
                        maxOutputTokens = 3072
                    }
                };
            }
            else
            {
                requestBody = new
                {
                    contents,
                    generationConfig = new
                    {
                        temperature = 0.7,
                        maxOutputTokens = 3072
                    }
                };
            }

            var json = JsonSerializer.Serialize(requestBody);
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            HttpResponseMessage? response = null;
            string? connError = null;
            try
            {
                response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            }
            catch (Exception ex)
            {
                connError = ex.Message;
            }

            if (connError != null || response == null)
            {
                yield return $"⚠️ Connection error: {connError ?? "Failed to connect"}";
                yield break;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();

                // If high demand / 503 / 429 on experimental model, automatically fallback to stable gemini-2.0-flash
                if ((response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
                     (int)response.StatusCode == 429 ||
                     errorText.Contains("high demand", StringComparison.OrdinalIgnoreCase)) &&
                    !model.Equals("gemini-2.0-flash", StringComparison.OrdinalIgnoreCase))
                {
                    yield return $"*[Note: {model} is experiencing high demand. Auto-switched to gemini-2.0-flash]*\n\n";

                    string fallbackUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key={config.ApiKey}";
                    using var fbRequest = new HttpRequestMessage(HttpMethod.Post, fallbackUrl)
                    {
                        Content = new StringContent(json, Encoding.UTF8, "application/json")
                    };

                    HttpResponseMessage? fbResponse = null;
                    try
                    {
                        fbResponse = await _httpClient.SendAsync(fbRequest, HttpCompletionOption.ResponseHeadersRead);
                    }
                    catch { }

                    if (fbResponse != null && fbResponse.IsSuccessStatusCode)
                    {
                        using var fbStream = await fbResponse.Content.ReadAsStreamAsync();
                        using var fbReader = new StreamReader(fbStream);
                        while (!fbReader.EndOfStream)
                        {
                            var fbLine = await fbReader.ReadLineAsync();
                            if (string.IsNullOrWhiteSpace(fbLine) || !fbLine.StartsWith("data: ")) continue;
                            var fbDataJson = fbLine.Substring(6).Trim();
                            if (string.IsNullOrWhiteSpace(fbDataJson)) continue;

                            string? token = null;
                            try
                            {
                                using var doc = JsonDocument.Parse(fbDataJson);
                                if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                                    candidates.GetArrayLength() > 0)
                                {
                                    var candidate = candidates[0];
                                    if (candidate.TryGetProperty("content", out var contentElem) &&
                                        contentElem.TryGetProperty("parts", out var partsElem) &&
                                        partsElem.GetArrayLength() > 0)
                                    {
                                        if (partsElem[0].TryGetProperty("text", out var textElem))
                                        {
                                            token = textElem.GetString();
                                        }
                                    }
                                }
                            }
                            catch { }

                            if (!string.IsNullOrEmpty(token))
                            {
                                yield return token;
                            }
                        }
                        yield break;
                    }
                }

                yield return $"⚠️ Gemini Error ({response.StatusCode}): {errorText}";
                yield break;
            }

            using var stream = await response.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;

                if (line.StartsWith("data: "))
                {
                    var dataJson = line.Substring(6).Trim();
                    if (string.IsNullOrWhiteSpace(dataJson)) continue;

                    string? token = null;
                    try
                    {
                        using var doc = JsonDocument.Parse(dataJson);
                        if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                            candidates.GetArrayLength() > 0)
                        {
                            var candidate = candidates[0];
                            if (candidate.TryGetProperty("content", out var contentElem) &&
                                contentElem.TryGetProperty("parts", out var partsElem) &&
                                partsElem.GetArrayLength() > 0)
                            {
                                if (partsElem[0].TryGetProperty("text", out var textElem))
                                {
                                    token = textElem.GetString();
                                }
                            }
                        }
                    }
                    catch { }

                    if (!string.IsNullOrEmpty(token))
                    {
                        yield return token;
                    }
                }
            }
        }

        // ──────────────────────────────────────────────────────────────────────
        // OPENAI STREAMING (stream: true)
        // ──────────────────────────────────────────────────────────────────────
        private async IAsyncEnumerable<string> StreamOpenAIAsync(List<ChatMessage> history, AppConfig config)
        {
            string url = $"{config.ApiUrl.TrimEnd('/')}/chat/completions";

            var messages = new List<object>();
            if (!string.IsNullOrWhiteSpace(config.SystemPrompt))
            {
                messages.Add(new { role = "system", content = config.SystemPrompt });
            }

            foreach (var msg in history)
            {
                if (!string.IsNullOrEmpty(msg.ImageBase64))
                {
                    messages.Add(new
                    {
                        role = msg.IsUser ? "user" : "assistant",
                        content = new object[]
                        {
                            new { type = "text", text = msg.Content ?? "" },
                            new { type = "image_url", image_url = new { url = $"data:image/png;base64,{msg.ImageBase64}" } }
                        }
                    });
                }
                else
                {
                    messages.Add(new
                    {
                        role = msg.IsUser ? "user" : "assistant",
                        content = msg.Content ?? ""
                    });
                }
            }

            var requestBody = new
            {
                model = config.ModelName,
                messages,
                temperature = 0.7,
                stream = true
            };

            var json = JsonSerializer.Serialize(requestBody);
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey);
            request.Headers.Add("User-Agent", "InvisibleChatApp");

            HttpResponseMessage? response = null;
            string? connError = null;
            try
            {
                response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            }
            catch (Exception ex)
            {
                connError = ex.Message;
            }

            if (connError != null || response == null)
            {
                yield return $"⚠️ Connection error: {connError ?? "Failed to connect"}";
                yield break;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                yield return $"⚠️ OpenAI Error ({response.StatusCode}): {errorText}";
                yield break;
            }

            using var stream = await response.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;

                if (line.StartsWith("data: "))
                {
                    var data = line.Substring(6).Trim();
                    if (data == "[DONE]") break;

                    string? token = null;
                    try
                    {
                        using var doc = JsonDocument.Parse(data);
                        if (doc.RootElement.TryGetProperty("choices", out var choices) &&
                            choices.GetArrayLength() > 0)
                        {
                            var choice = choices[0];
                            if (choice.TryGetProperty("delta", out var delta) &&
                                delta.TryGetProperty("content", out var contentElem))
                            {
                                token = contentElem.GetString();
                            }
                        }
                    }
                    catch { }

                    if (!string.IsNullOrEmpty(token))
                    {
                        yield return token;
                    }
                }
            }
        }

        // Backward compatibility fallback
        public async Task<string> SendMessageAsync(List<ChatMessage> conversationHistory, AppConfig config)
        {
            var sb = new StringBuilder();
            await foreach (var chunk in StreamMessageAsync(conversationHistory, config))
            {
                sb.Append(chunk);
            }
            return sb.ToString();
        }
    }
}
