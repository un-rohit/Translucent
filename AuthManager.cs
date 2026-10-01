using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace InvisibleChat
{
    public class AuthManager
    {
        private static AuthManager? _instance;
        public static AuthManager Instance => _instance ??= new AuthManager();

        private readonly HttpClient _httpClient = new() { Timeout = TimeSpan.FromSeconds(10) };
        private HttpListener? _loopbackListener;
        private const int LoopbackPort = 58291;

        public event Action? AuthStateChanged;

        public bool IsAuthenticated => !string.IsNullOrEmpty(Config.AuthToken);
        public bool IsSubscribed { get; private set; } = false;
        public string LastSignOutReason { get; private set; } = string.Empty;
        private System.Threading.Timer? _heartbeatTimer;
        public string Status { get; private set; } = "unauthenticated"; // unauthenticated, pending, active, expired, suspended
        public string UserEmail { get; private set; } = string.Empty;
        public string UserName { get; private set; } = string.Empty;
        public string UserAvatarUrl { get; private set; } = string.Empty;
        public string Plan { get; private set; } = "pro";
        public string ExpiresAt { get; private set; } = string.Empty;

        public string PaymentUrl { get; private set; } = "https://buy.stripe.com/example";
        public string SupportContact { get; private set; } = "Telegram: @translucent_admin";
        public string TelegramBotUsername { get; private set; } = string.Empty;
        public int UserId { get; private set; } = 0;
        public string DeviceName => Environment.MachineName;
        public string DeviceId => Config.DeviceId;

        public AppConfig Config { get; private set; }

        private AuthManager()
        {
            Config = ConfigManager.Load();
            UserEmail = Config.UserEmail;
            UserName = Config.UserName;
            UserAvatarUrl = Config.UserAvatarUrl;
            IsSubscribed = Config.IsSubscribedCached;
            Status = string.IsNullOrEmpty(Config.AuthToken) ? "unauthenticated" : Config.SubscriptionStatus;
        }

        public async Task InitializeAsync()
        {
            await FetchPublicConfigAsync();

            if (IsAuthenticated)
            {
                await CheckSubscriptionStatusAsync();
            }
            else
            {
                Status = "unauthenticated";
                IsSubscribed = false;
                AuthStateChanged?.Invoke();
            }
        }

        public async Task FetchPublicConfigAsync()
        {
            try
            {
                string url = $"{Config.AuthServerUrl.TrimEnd('/')}/api/public/config";
                var response = await _httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    string json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("paymentUrl", out var pUrl) && !string.IsNullOrEmpty(pUrl.GetString()))
                    {
                        PaymentUrl = pUrl.GetString()!;
                    }
                    if (doc.RootElement.TryGetProperty("supportContact", out var sContact) && !string.IsNullOrEmpty(sContact.GetString()))
                    {
                        SupportContact = sContact.GetString()!;
                    }
                    if (doc.RootElement.TryGetProperty("telegramBotUsername", out var tBot) && !string.IsNullOrEmpty(tBot.GetString()))
                    {
                        TelegramBotUsername = tBot.GetString()!.Trim().TrimStart('@');
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Failed to fetch public config: {ex.Message}");
            }
        }

        private void StartHeartbeat()
        {
            if (_heartbeatTimer == null)
            {
                _heartbeatTimer = new System.Threading.Timer(async _ =>
                {
                    if (IsSubscribed && !string.IsNullOrEmpty(Config.AuthToken))
                    {
                        try
                        {
                            await CheckSubscriptionStatusAsync();
                        }
                        catch {}
                    }
                }, null, TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(15));
            }
        }

        private void StopHeartbeat()
        {
            try
            {
                _heartbeatTimer?.Dispose();
            }
            catch {}
            finally
            {
                _heartbeatTimer = null;
            }
        }

        public async Task<bool> CheckSubscriptionStatusAsync()
        {
            if (string.IsNullOrEmpty(Config.AuthToken))
            {
                Status = "unauthenticated";
                IsSubscribed = false;
                StopHeartbeat();
                AuthStateChanged?.Invoke();
                return false;
            }

            try
            {
                string url = $"{Config.AuthServerUrl.TrimEnd('/')}/api/subscription/status";
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Config.AuthToken);
                if (!string.IsNullOrEmpty(Config.DeviceId))
                {
                    request.Headers.Add("X-Device-Id", Config.DeviceId);
                }
                request.Headers.Add("X-Device-Name", Environment.MachineName);

                var response = await _httpClient.SendAsync(request);

                // Single-device conflict (409) or revoked session (401)
                if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Conflict)
                {
                    string conflictMsg = "⚠️ Logged out: Your subscription was activated on another device. Only 1 active device is permitted at a time.";
                    try
                    {
                        string errJson = await response.Content.ReadAsStringAsync();
                        using var errDoc = JsonDocument.Parse(errJson);
                        if (errDoc.RootElement.TryGetProperty("message", out var m))
                        {
                            conflictMsg = m.GetString() ?? conflictMsg;
                        }
                    }
                    catch {}

                    SignOut(conflictMsg);
                    return false;
                }

                if (response.IsSuccessStatusCode)
                {
                    string json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    IsSubscribed = root.GetProperty("isSubscribed").GetBoolean();
                    Status = root.GetProperty("status").GetString() ?? "pending";

                    if (root.TryGetProperty("user", out var user))
                    {
                        if (user.TryGetProperty("id", out var uid))
                        {
                            if (uid.ValueKind == JsonValueKind.Number) UserId = uid.GetInt32();
                            else if (int.TryParse(uid.GetString(), out var parsedId)) UserId = parsedId;
                        }
                        if (user.TryGetProperty("email", out var e)) UserEmail = e.GetString() ?? UserEmail;
                        if (user.TryGetProperty("name", out var n)) UserName = n.GetString() ?? UserName;
                        if (user.TryGetProperty("avatarUrl", out var a)) UserAvatarUrl = a.GetString() ?? UserAvatarUrl;
                        if (user.TryGetProperty("plan", out var p)) Plan = p.GetString() ?? Plan;
                        if (user.TryGetProperty("expiresAt", out var exp)) ExpiresAt = exp.GetString() ?? string.Empty;
                    }

                    // Save state
                    Config.IsSubscribedCached = IsSubscribed;
                    Config.SubscriptionStatus = Status;
                    Config.UserEmail = UserEmail;
                    Config.UserName = UserName;
                    Config.UserAvatarUrl = UserAvatarUrl;
                    ConfigManager.Save(Config);

                    if (IsSubscribed)
                    {
                        LastSignOutReason = string.Empty;
                        StartHeartbeat();
                    }
                    else
                    {
                        StopHeartbeat();
                    }

                    AuthStateChanged?.Invoke();
                    return IsSubscribed;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Failed to verify subscription status: {ex.Message}");
                IsSubscribed = Config.IsSubscribedCached;
                Status = Config.SubscriptionStatus;
                AuthStateChanged?.Invoke();
                return IsSubscribed;
            }

            return false;
        }

        public async Task StartGoogleSignInAsync()
        {
            try
            {
                // Stop any running loopback listener
                StopLoopbackListener();

                // Generate unique temporary session ID for cloud polling (VMware & cross-device friendly)
                string sessionId = Guid.NewGuid().ToString("N");

                // Start local loopback listener
                try
                {
                    _loopbackListener = new HttpListener();
                    _loopbackListener.Prefixes.Add($"http://127.0.0.1:{LoopbackPort}/callback/");
                    _loopbackListener.Start();
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Local loopback listener start failed (continuing with cloud session): {ex.Message}");
                }

                // Open default browser to the web login portal with deviceId, deviceName, and sessionId
                string loginUrl = $"{Config.AuthServerUrl.TrimEnd('/')}/login.html?port={LoopbackPort}&deviceId={Uri.EscapeDataString(Config.DeviceId)}&deviceName={Uri.EscapeDataString(Environment.MachineName)}&sessionId={sessionId}";
                Process.Start(new ProcessStartInfo
                {
                    FileName = loginUrl,
                    UseShellExecute = true
                });

                // 1. Cloud Session Polling (100% reliable for VMware, Hyper-V, WSL, and remote desktop)
                var pollCts = new CancellationTokenSource(TimeSpan.FromMinutes(5));
                _ = Task.Run(async () =>
                {
                    while (!pollCts.Token.IsCancellationRequested && !IsSubscribed && string.IsNullOrEmpty(Config.AuthToken))
                    {
                        try
                        {
                            await Task.Delay(1200, pollCts.Token);
                            string pollUrl = $"{Config.AuthServerUrl.TrimEnd('/')}/api/auth/session-check?sessionId={sessionId}";
                            var response = await _httpClient.GetAsync(pollUrl, pollCts.Token);
                            if (response.StatusCode == System.Net.HttpStatusCode.OK)
                            {
                                var content = await response.Content.ReadAsStringAsync(pollCts.Token);
                                using var doc = JsonDocument.Parse(content);
                                var root = doc.RootElement;
                                if (root.TryGetProperty("token", out var tokenProp))
                                {
                                    string? token = tokenProp.GetString();
                                    if (!string.IsNullOrEmpty(token))
                                    {
                                        string email = root.TryGetProperty("user", out var u) && u.TryGetProperty("email", out var e) ? e.GetString() ?? "" : "";
                                        string name = u.ValueKind != JsonValueKind.Undefined && u.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                                        string status = u.ValueKind != JsonValueKind.Undefined && u.TryGetProperty("status", out var s) ? s.GetString() ?? "pending" : "pending";

                                        Config.AuthToken = token;
                                        Config.UserEmail = email;
                                        Config.UserName = name;
                                        Config.SubscriptionStatus = status;
                                        ConfigManager.Save(Config);

                                        UserEmail = Config.UserEmail;
                                        UserName = Config.UserName;
                                        Status = Config.SubscriptionStatus;

                                        StopLoopbackListener();
                                        pollCts.Cancel();

                                        await CheckSubscriptionStatusAsync();
                                        break;
                                    }
                                }
                            }
                        }
                        catch { }
                    }
                });

                // 2. Local Loopback Receiver (instant 50ms callback if running on the same local Windows machine)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        while (_loopbackListener != null && _loopbackListener.IsListening)
                        {
                            var context = await _loopbackListener.GetContextAsync();
                            var req = context.Request;
                            var res = context.Response;

                            res.AddHeader("Access-Control-Allow-Origin", "*");
                            res.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                            res.AddHeader("Access-Control-Allow-Headers", "*");
                            res.AddHeader("Access-Control-Allow-Private-Network", "true");

                            if (req.HttpMethod == "OPTIONS")
                            {
                                res.StatusCode = 200;
                                res.Close();
                                continue;
                            }

                            string? token = req.QueryString["token"];
                            string? email = req.QueryString["email"];
                            string? name = req.QueryString["name"];
                            string? status = req.QueryString["status"];

                            // Send friendly HTML response to browser
                            string html = @"
                                <!DOCTYPE html>
                                <html>
                                <head><meta charset='utf-8'><title>Linked to Translucent</title></head>
                                <body style='background:#0F0F12;color:white;font-family:Segoe UI,sans-serif;text-align:center;padding-top:60px;'>
                                    <div style='display:inline-block;padding:24px 36px;border-radius:16px;background:#18181E;border:1px solid #333;'>
                                        <h2 style='color:#00E676;margin-bottom:8px;'>✓ Successfully Connected!</h2>
                                        <p style='color:#9E9EA4;margin:0;'>Your Google Account is linked to Translucent. You can close this tab and return to the app.</p>
                                    </div>
                                    <script>setTimeout(() => window.close(), 1500);</script>
                                </body>
                                </html>";

                            byte[] buffer = Encoding.UTF8.GetBytes(html);
                            res.ContentType = "text/html; charset=utf-8";
                            res.ContentLength64 = buffer.Length;
                            await res.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                            res.OutputStream.Close();

                            if (!string.IsNullOrEmpty(token))
                            {
                                Config.AuthToken = token;
                                Config.UserEmail = email ?? string.Empty;
                                Config.UserName = name ?? string.Empty;
                                Config.SubscriptionStatus = status ?? "pending";
                                ConfigManager.Save(Config);

                                UserEmail = Config.UserEmail;
                                UserName = Config.UserName;
                                Status = Config.SubscriptionStatus;

                                pollCts.Cancel();
                                StopLoopbackListener();

                                // Immediately query backend for full profile & subscription status
                                await CheckSubscriptionStatusAsync();
                                break;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"Loopback callback failed: {ex.Message}");
                    }
                });

                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Failed to start Google sign-in: {ex.Message}");
            }
        }

        public async Task<bool> ApplyManualTokenAsync(string rawInput)
        {
            if (string.IsNullOrWhiteSpace(rawInput)) return false;
            string input = rawInput.Trim();
            string token = input;

            // Handle full callback URL (e.g. http://127.0.0.1:58291/callback/?token=... or /callback?token=...)
            if (token.Contains("token="))
            {
                try
                {
                    int idx = token.IndexOf("token=");
                    string sub = token.Substring(idx + 6);
                    int amp = sub.IndexOf('&');
                    if (amp >= 0) sub = sub.Substring(0, amp);
                    token = Uri.UnescapeDataString(sub).Trim();

                    // Also extract email, name, status if present in the callback URL
                    if (input.Contains("email="))
                    {
                        int eIdx = input.IndexOf("email=");
                        string eSub = input.Substring(eIdx + 6);
                        int eAmp = eSub.IndexOf('&');
                        if (eAmp >= 0) eSub = eSub.Substring(0, eAmp);
                        Config.UserEmail = Uri.UnescapeDataString(eSub).Trim();
                        UserEmail = Config.UserEmail;
                    }

                    if (input.Contains("name="))
                    {
                        int nIdx = input.IndexOf("name=");
                        string nSub = input.Substring(nIdx + 5);
                        int nAmp = nSub.IndexOf('&');
                        if (nAmp >= 0) nSub = nSub.Substring(0, nAmp);
                        Config.UserName = Uri.UnescapeDataString(nSub).Trim();
                        UserName = Config.UserName;
                    }

                    if (input.Contains("status="))
                    {
                        int sIdx = input.IndexOf("status=");
                        string sSub = input.Substring(sIdx + 7);
                        int sAmp = sSub.IndexOf('&');
                        if (sAmp >= 0) sSub = sSub.Substring(0, sAmp);
                        Config.SubscriptionStatus = Uri.UnescapeDataString(sSub).Trim();
                        Status = Config.SubscriptionStatus;
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Failed to parse callback URL parameters: {ex.Message}");
                }
            }

            if (string.IsNullOrWhiteSpace(token)) return false;

            Config.AuthToken = token.Trim();
            ConfigManager.Save(Config);

            StopLoopbackListener();
            return await CheckSubscriptionStatusAsync();
        }

        public void StopLoopbackListener()
        {
            try
            {
                if (_loopbackListener != null && _loopbackListener.IsListening)
                {
                    _loopbackListener.Stop();
                    _loopbackListener.Close();
                }
            }
            catch {}
            finally
            {
                _loopbackListener = null;
            }
        }

        public void SignOut(string reason = "")
        {
            StopHeartbeat();
            LastSignOutReason = reason;

            Config.AuthToken = string.Empty;
            Config.UserEmail = string.Empty;
            Config.UserName = string.Empty;
            Config.UserAvatarUrl = string.Empty;
            Config.IsSubscribedCached = false;
            Config.SubscriptionStatus = "unauthenticated";
            ConfigManager.Save(Config);

            UserEmail = string.Empty;
            UserName = string.Empty;
            UserAvatarUrl = string.Empty;
            IsSubscribed = false;
            Status = "unauthenticated";

            AuthStateChanged?.Invoke();
        }
    }
}
