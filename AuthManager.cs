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
        public string Status { get; private set; } = "unauthenticated"; // unauthenticated, pending, active, expired, suspended
        public string UserEmail { get; private set; } = string.Empty;
        public string UserName { get; private set; } = string.Empty;
        public string UserAvatarUrl { get; private set; } = string.Empty;
        public string Plan { get; private set; } = "pro";
        public string ExpiresAt { get; private set; } = string.Empty;

        public string PaymentUrl { get; private set; } = "https://buy.stripe.com/example";
        public string SupportContact { get; private set; } = "Telegram: @translucent_admin";

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
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Failed to fetch public config: {ex.Message}");
            }
        }

        public async Task<bool> CheckSubscriptionStatusAsync()
        {
            if (string.IsNullOrEmpty(Config.AuthToken))
            {
                Status = "unauthenticated";
                IsSubscribed = false;
                AuthStateChanged?.Invoke();
                return false;
            }

            try
            {
                string url = $"{Config.AuthServerUrl.TrimEnd('/')}/api/subscription/status";
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Config.AuthToken);

                var response = await _httpClient.SendAsync(request);

                if (response.StatusCode == HttpStatusCode.Unauthorized)
                {
                    // Token expired or invalidated
                    SignOut();
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

                    AuthStateChanged?.Invoke();
                    return IsSubscribed;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Failed to verify subscription status: {ex.Message}");
                // Fallback to cached state on temporary network disconnection
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

                // Start local loopback listener
                _loopbackListener = new HttpListener();
                _loopbackListener.Prefixes.Add($"http://127.0.0.1:{LoopbackPort}/callback/");
                _loopbackListener.Start();

                // Open default browser to the web login portal
                string loginUrl = $"{Config.AuthServerUrl.TrimEnd('/')}/login.html?port={LoopbackPort}";
                Process.Start(new ProcessStartInfo
                {
                    FileName = loginUrl,
                    UseShellExecute = true
                });

                // Await incoming callback from browser
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var context = await _loopbackListener.GetContextAsync();
                        var req = context.Request;
                        var res = context.Response;

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
                                <script>setTimeout(() => window.close(), 2500);</script>
                            </body>
                            </html>";

                        byte[] buffer = Encoding.UTF8.GetBytes(html);
                        res.ContentType = "text/html; charset=utf-8";
                        res.ContentLength64 = buffer.Length;
                        await res.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                        res.OutputStream.Close();

                        StopLoopbackListener();

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

                            // Immediately query backend for full profile & subscription status
                            await CheckSubscriptionStatusAsync();
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

        public void SignOut()
        {
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
