using System;
using System.Collections.Generic;
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
            _httpClient.Timeout = TimeSpan.FromSeconds(60);
        }

        // Detect if the configured endpoint is a Gemini API endpoint
        private bool IsGeminiApi(string apiUrl)
        {
            return apiUrl.Contains("googleapis.com", StringComparison.OrdinalIgnoreCase) ||
                   apiUrl.Contains("generativelanguage", StringComparison.OrdinalIgnoreCase);
        }

        public async Task<string> SendMessageAsync(List<ChatMessage> conversationHistory, AppConfig config)
        {
            if (string.IsNullOrWhiteSpace(config.ApiKey))
            {
                await Task.Delay(600);
                return "Please enter your **Gemini API Key** in Settings (⚙️ icon) to start chatting!\n\n" +
                       "You can get a free key at **aistudio.google.com/apikey**.\n\n" +
                       "Once you paste it in Settings, messages will be sent to **Gemini 2.0 Flash**.";
            }

            try
            {
                if (IsGeminiApi(config.ApiUrl))
                {
                    return await SendGeminiAsync(conversationHistory, config);
                }
                else
                {
                    return await SendOpenAIAsync(conversationHistory, config);
                }
            }
            catch (Exception ex)
            {
                return $"⚠️ Error connecting to AI API:\n{ex.Message}";
            }
        }

        // ──────────────────────────────────────────────────────────────────────
        // GEMINI API
        // Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
        // ──────────────────────────────────────────────────────────────────────
        private async Task<string> SendGeminiAsync(List<ChatMessage> history, AppConfig config)
        {
            string model = string.IsNullOrWhiteSpace(config.ModelName) ? "gemini-3.7-flash" : config.ModelName;
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={config.ApiKey}";

            var contents = new List<object>();

            // Map conversation history to Gemini format
            foreach (var msg in history)
            {
                contents.Add(new
                {
                    role = msg.IsUser ? "user" : "model",
                    parts = new[] { new { text = msg.Content } }
                });
            }

            object requestBody;

            // Include system instruction if present
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
                        maxOutputTokens = 2048
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
                        maxOutputTokens = 2048
                    }
                };
            }

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            var responseText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                // Try to extract a readable error message from Gemini's error format
                try
                {
                    using var doc = JsonDocument.Parse(responseText);
                    var errorMsg = doc.RootElement
                        .GetProperty("error")
                        .GetProperty("message")
                        .GetString();
                    return $"⚠️ Gemini API Error: {errorMsg}";
                }
                catch
                {
                    return $"⚠️ Gemini API Error ({response.StatusCode}): {responseText}";
                }
            }

            // Parse Gemini response
            using var resDoc = JsonDocument.Parse(responseText);
            return resDoc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "Empty response from Gemini.";
        }

        // ──────────────────────────────────────────────────────────────────────
        // OPENAI-COMPATIBLE API
        // Works with OpenAI, Groq, Together AI, Ollama (local), LM Studio, etc.
        // ──────────────────────────────────────────────────────────────────────
        private async Task<string> SendOpenAIAsync(List<ChatMessage> history, AppConfig config)
        {
            string url = $"{config.ApiUrl.TrimEnd('/')}/chat/completions";

            var messages = new List<object>();
            if (!string.IsNullOrWhiteSpace(config.SystemPrompt))
            {
                messages.Add(new { role = "system", content = config.SystemPrompt });
            }
            foreach (var msg in history)
            {
                messages.Add(new { role = msg.IsUser ? "user" : "assistant", content = msg.Content });
            }

            var requestBody = new
            {
                model = config.ModelName,
                messages,
                temperature = 0.7
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Content = content;
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey);
            request.Headers.Add("User-Agent", "InvisibleChatApp");

            var response = await _httpClient.SendAsync(request);
            var responseText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return $"⚠️ API Error ({response.StatusCode}): {responseText}";
            }

            using var resDoc = JsonDocument.Parse(responseText);
            return resDoc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "Empty response.";
        }
    }
}
