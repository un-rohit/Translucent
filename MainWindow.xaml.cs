using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace InvisibleChat
{
    public partial class MainWindow : Window
    {
        private HotkeyHelper? _hotkeyHelper;
        private System.Windows.Forms.NotifyIcon? _notifyIcon;

        private bool _isChatTabActive = true;
        private CoreWebView2Environment? _webViewEnv;
        private Dictionary<string, Dictionary<Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind, Microsoft.Web.WebView2.Core.CoreWebView2PermissionState>> _sitePermissions = new();
        private bool _isSettingPermissions;
        
        // Multi-tab browser collections
        private ObservableCollection<BrowserTab> _browserTabs = new();
        private Dictionary<BrowserTab, WebView2> _webViews = new();
        private BrowserTab? _activeTab;

        // Remember chat-mode size vs browser-mode size
        private double _chatWidth  = 480;
        private double _chatHeight = 640;
        private double _browserWidth  = 900;
        private double _browserHeight = 680;

        public MainWindow()
        {
            InitializeComponent();

            var viewModel = new MainViewModel();
            DataContext = viewModel;

            ApplyLayoutMode(false);

            viewModel.CurrentMessages.CollectionChanged += CurrentMessages_CollectionChanged;
            viewModel.PropertyChanged += ViewModel_PropertyChanged;

            viewModel.RequestSnipScreen += OnRequestSnipScreen;
            viewModel.GhostModeChanged += OnGhostModeChanged;
            viewModel.SplitViewChanged += OnSplitViewChanged;
            viewModel.RequestSwitchToChat += () =>
            {
                if (!_isChatTabActive && !viewModel.IsSplitView)
                {
                    ChatTabBtn_Click(this, new RoutedEventArgs());
                }
            };

            SourceInitialized += MainWindow_SourceInitialized;
            StateChanged      += MainWindow_StateChanged;
            Loaded            += MainWindow_Loaded;

            // Bind tabs list to UI
            BrowserTabsList.ItemsSource = _browserTabs;
        }

        // ─────────────────────────────────────────────────────────────────
        // LOADED — Restore browser session or initialize default tab
        // ─────────────────────────────────────────────────────────────────
        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            var config = ConfigManager.Load();

            // 1. Immediately apply saved layout mode so UI renders cleanly on first frame
            if (config.IsSplitView && DataContext is MainViewModel vm)
            {
                vm.IsSplitView = true;
                ApplyLayoutMode(true);
            }
            else if (!config.IsChatTabActive)
            {
                _isChatTabActive = false;
                _chatWidth = Width;
                _chatHeight = Height;
                Width = _browserWidth;
                Height = _browserHeight;
                ApplyLayoutMode(false);
            }
            else
            {
                _isChatTabActive = true;
                ApplyLayoutMode(false);
            }

            // 2. Restore tabs in background
            if (config.OpenTabsUrls != null && config.OpenTabsUrls.Count > 0)
            {
                // Create all saved tabs
                for (int i = 0; i < config.OpenTabsUrls.Count; i++)
                {
                    await CreateNewTabAsync(config.OpenTabsUrls[i]);
                }

                // Select the correct saved tab
                int selectIndex = 0;
                if (config.SelectedTabIndex >= 0 && config.SelectedTabIndex < _browserTabs.Count)
                {
                    selectIndex = config.SelectedTabIndex;
                }
                await SelectTabAsync(_browserTabs[selectIndex]);
            }
            else
            {
                // Fallback: Start with one tab pointing to google.com if no saved session
                await CreateNewTabAsync("https://www.google.com");
            }
        }

        private async System.Threading.Tasks.Task EnsureWebViewEnvAsync()
        {
            if (_webViewEnv != null) return;
            try
            {
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "InvisibleChat", "BrowserProfile");

                _webViewEnv = await CoreWebView2Environment.CreateAsync(
                    browserExecutableFolder: null,
                    userDataFolder: userDataFolder);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"WebView2 Env creation failed: {ex.Message}");
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TAB MANAGEMENT (Create, Select, Close)
        // ─────────────────────────────────────────────────────────────────
        private async System.Threading.Tasks.Task CreateNewTabAsync(string url)
        {
            await EnsureWebViewEnvAsync();

            var newTab = new BrowserTab
            {
                Title = "Loading...",
                Url = url,
                IsActive = false
            };

            var webView = new WebView2
            {
                Cursor = System.Windows.Input.Cursors.Arrow, // Maintain Arrow cursor
                Visibility = Visibility.Collapsed,
                DefaultBackgroundColor = System.Drawing.Color.Transparent
            };

            _browserTabs.Add(newTab);
            _webViews[newTab] = webView;
            BrowserTabsContainer.Children.Add(webView);
            SaveBrowserSession();

            // Select it
            await SelectTabAsync(newTab);

            try
            {
                if (_webViewEnv != null)
                {
                    await webView.EnsureCoreWebView2Async(_webViewEnv);

                    // Suppress status bar and wire events
                    webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                    webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                    webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                    webView.CoreWebView2.PermissionRequested += WebView_PermissionRequested;

                    webView.CoreWebView2.NavigationStarting += (s, ev) =>
                    {
                        Dispatcher.Invoke(() =>
                        {
                            newTab.Url = ev.Uri;
                            if (newTab == _activeTab)
                            {
                                BrowserUrlBar.Text = ev.Uri;
                                BrowserRefreshBtn.ToolTip = "Loading...";
                                UpdateBookmarksBarVisibility(ev.Uri);
                            }
                        });
                    };

                    webView.CoreWebView2.DOMContentLoaded += (s, ev) =>
                    {
                        Dispatcher.Invoke(() =>
                        {
                            if (DataContext is MainViewModel vm)
                            {
                                string script = GetOpacityScript(vm.WindowOpacity);
                                webView.CoreWebView2.ExecuteScriptAsync(script);
                            }
                        });
                    };

                    webView.CoreWebView2.NavigationCompleted += (s, ev) =>
                    {
                        Dispatcher.Invoke(() =>
                        {
                            if (webView.Source != null)
                            {
                                newTab.Url = webView.Source.ToString();
                                if (newTab == _activeTab)
                                {
                                    BrowserUrlBar.Text = webView.Source.ToString();
                                    UpdateBookmarksBarVisibility(webView.Source.ToString());
                                }
                            }
                            UpdateNavButtonsState();

                            // Inject current window opacity
                            if (DataContext is MainViewModel vm)
                            {
                                string script = GetOpacityScript(vm.WindowOpacity);
                                webView.CoreWebView2.ExecuteScriptAsync(script);
                            }

                            SaveBrowserSession();
                        });
                    };

                    webView.CoreWebView2.DocumentTitleChanged += (s, ev) =>
                    {
                        Dispatcher.Invoke(() =>
                        {
                            string title = webView.CoreWebView2.DocumentTitle;
                            newTab.Title = string.IsNullOrWhiteSpace(title) ? "New Tab" : title;
                            if (newTab == _activeTab && !_isChatTabActive)
                                Title = $"Browser — {newTab.Title}";
                        });
                    };

                    webView.CoreWebView2.Navigate(url);
                }
            }
            catch (Exception ex)
            {
                newTab.Title = "Init Failed";
                System.Diagnostics.Debug.WriteLine($"Browser Tab init error: {ex.Message}");
            }
        }

        private async System.Threading.Tasks.Task SelectTabAsync(BrowserTab tab)
        {
            if (tab == null) return;

            // Set inactive
            if (_activeTab != null)
            {
                _activeTab.IsActive = false;
                if (_webViews.ContainsKey(_activeTab))
                    _webViews[_activeTab].Visibility = Visibility.Collapsed;
            }

            _activeTab = tab;
            _activeTab.IsActive = true;
            BrowserTabsList.SelectedItem = _activeTab;

            // Show active WebView
            if (_webViews.ContainsKey(_activeTab))
            {
                var activeWebView = _webViews[_activeTab];
                activeWebView.Visibility = Visibility.Visible;
                
                // Update address bar
                BrowserUrlBar.Text = _activeTab.Url;
                
                if (activeWebView.CoreWebView2 != null)
                {
                    Title = $"Browser — {activeWebView.CoreWebView2.DocumentTitle}";
                }
                else
                {
                    Title = "Browser — Loading...";
                }
            }

            UpdateNavButtonsState();
            if (_activeTab != null)
            {
                UpdateBookmarksBarVisibility(_activeTab.Url);
            }
            SaveBrowserSession();
            await System.Threading.Tasks.Task.CompletedTask;
        }

        private async void CloseTabBtn_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button btn && btn.Tag is BrowserTab tab)
            {
                await CloseTabAsync(tab);
            }
        }

        private async System.Threading.Tasks.Task CloseTabAsync(BrowserTab tab)
        {
            if (tab == null) return;

            // Don't close if it is the only tab left (instead reset it to google.com)
            if (_browserTabs.Count == 1)
            {
                if (_webViews.ContainsKey(tab))
                {
                    _webViews[tab].CoreWebView2?.Navigate("https://www.google.com");
                }
                return;
            }

            int index = _browserTabs.IndexOf(tab);
            _browserTabs.Remove(tab);

            if (_webViews.ContainsKey(tab))
            {
                var webView = _webViews[tab];
                BrowserTabsContainer.Children.Remove(webView);
                webView.Dispose();
                _webViews.Remove(tab);
            }

            // If we closed the active tab, select a new one
            if (_activeTab == tab)
            {
                int newIndex = Math.Min(index, _browserTabs.Count - 1);
                await SelectTabAsync(_browserTabs[newIndex]);
            }
            else
            {
                // SelectTabAsync saves the session, but if we closed a background tab, we need to save here
                SaveBrowserSession();
            }
        }

        private void TabContextMenu_Opened(object sender, RoutedEventArgs e)
        {
            if (sender is ContextMenu menu && menu.DataContext is BrowserTab tab)
            {
                if (menu.Items.Count > 0 && menu.Items[0] is MenuItem muteItem)
                {
                    bool isMuted = false;
                    if (_webViews.TryGetValue(tab, out var webView) && webView.CoreWebView2 != null)
                    {
                        isMuted = webView.CoreWebView2.IsMuted;
                    }
                    muteItem.Header = isMuted ? "Unmute site" : "Mute site";
                }
            }
        }

        private void MuteSite_Click(object sender, RoutedEventArgs e)
        {
            if (sender is MenuItem menuItem && menuItem.DataContext is BrowserTab tab)
            {
                if (_webViews.TryGetValue(tab, out var webView) && webView.CoreWebView2 != null)
                {
                    webView.CoreWebView2.IsMuted = !webView.CoreWebView2.IsMuted;
                }
            }
        }

        private async void DuplicateTab_Click(object sender, RoutedEventArgs e)
        {
            if (sender is MenuItem menuItem && menuItem.DataContext is BrowserTab tab)
            {
                string url = tab.Url;
                if (_webViews.TryGetValue(tab, out var webView) && webView.Source != null)
                {
                    url = webView.Source.ToString();
                }
                await CreateNewTabAsync(url);
            }
        }

        private async void ExitTab_Click(object sender, RoutedEventArgs e)
        {
            if (sender is MenuItem menuItem && menuItem.DataContext is BrowserTab tab)
            {
                await CloseTabAsync(tab);
            }
        }

        [System.Runtime.InteropServices.DllImport("gdi32.dll")]
        [return: System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.Bool)]
        private static extern bool DeleteObject(IntPtr hObject);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        private const byte VK_CONTROL = 0x11;
        private const byte VK_V = 0x56;
        private const byte VK_RETURN = 0x0D;
        private const uint KEYEVENTF_KEYUP = 0x0002;

        private async void BrowserPasteBtn_Click(object sender, RoutedEventArgs e)
        {
            if (_activeTab == null || !_webViews.TryGetValue(_activeTab, out var webView)) return;

            var btn = sender as System.Windows.Controls.Button;
            string originalTip = btn?.ToolTip as string ?? "Paste Clipboard";

            try
            {
                // 1. Focus the WebView control to receive keyboard input
                webView.Focus();

                // Also request inner document focus via script to be extra robust
                if (webView.CoreWebView2 != null)
                {
                    await webView.CoreWebView2.ExecuteScriptAsync("window.focus();");
                }

                // Tiny delay to ensure focus is completed
                await System.Threading.Tasks.Task.Delay(50);

                // 2. Simulate pressing Ctrl+V
                // Press Control
                keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
                // Press V
                keybd_event(VK_V, 0, 0, UIntPtr.Zero);

                // Release V
                keybd_event(VK_V, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                // Release Control
                keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

                // 3. Show success visual feedback
                if (btn != null)
                {
                    btn.ToolTip = "✓ Pasted!";
                    btn.Opacity = 0.5;
                    await System.Threading.Tasks.Task.Delay(1000);
                    btn.ToolTip = originalTip;
                    btn.Opacity = 1.0;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Paste simulation failed: {ex.Message}");
            }
        }

        private async void BrowserEnterBtn_Click(object sender, RoutedEventArgs e)
        {
            if (_activeTab == null || !_webViews.TryGetValue(_activeTab, out var webView)) return;

            var btn = sender as System.Windows.Controls.Button;
            string originalTip = btn?.ToolTip as string ?? "Send/Enter";

            try
            {
                // 1. Focus the WebView control to receive keyboard input
                webView.Focus();

                // Also request inner document focus via script to be extra robust
                if (webView.CoreWebView2 != null)
                {
                    await webView.CoreWebView2.ExecuteScriptAsync("window.focus();");
                }

                // Tiny delay to ensure focus is completed
                await System.Threading.Tasks.Task.Delay(50);

                // 2. Simulate pressing Enter
                // Press Enter
                keybd_event(VK_RETURN, 0, 0, UIntPtr.Zero);

                // Release Enter
                keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

                // 3. Show success visual feedback
                if (btn != null)
                {
                    btn.ToolTip = "✓ Sent!";
                    btn.Opacity = 0.5;
                    await System.Threading.Tasks.Task.Delay(1000);
                    btn.ToolTip = originalTip;
                    btn.Opacity = 1.0;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Enter key simulation failed: {ex.Message}");
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // PREDEFINED INTERVIEW PROMPTS — 1-Click Paste into Current Tab
        // ─────────────────────────────────────────────────────────────────
        private void BrowserPromptsMenuBtn_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button btn && btn.ContextMenu != null)
            {
                btn.ContextMenu.PlacementTarget = btn;
                btn.ContextMenu.Placement = System.Windows.Controls.Primitives.PlacementMode.Top;
                btn.ContextMenu.IsOpen = true;
            }
        }

        private async void QuickPromptChip_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button btn && btn.Tag is string tag)
            {
                switch (tag)
                {
                    case "1":
                        await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt1, "Fast & Precise");
                        break;
                    case "2":
                        await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt2, "Human-Like Answer");
                        break;
                    case "3":
                        await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt3, "Technical Interview");
                        break;
                    case "4":
                        await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt4, "Ultra-Low-Latency");
                        break;
                    case "5":
                        await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt5, "Adaptive Assistant");
                        break;
                }
            }
        }

        private async void Prompt1_Click(object sender, RoutedEventArgs e) =>
            await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt1, "Fast & Precise");

        private async void Prompt2_Click(object sender, RoutedEventArgs e) =>
            await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt2, "Human-Like Answer");

        private async void Prompt3_Click(object sender, RoutedEventArgs e) =>
            await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt3, "Technical Interview");

        private async void Prompt4_Click(object sender, RoutedEventArgs e) =>
            await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt4, "Ultra-Low-Latency");

        private async void Prompt5_Click(object sender, RoutedEventArgs e) =>
            await PastePromptIntoActiveTabAsync(PredefinedPrompts.Prompt5, "Adaptive Assistant");

        private async System.Threading.Tasks.Task PastePromptIntoActiveTabAsync(string promptText, string promptTitle)
        {
            if (_activeTab == null || !_webViews.TryGetValue(_activeTab, out var webView)) return;

            try
            {
                // 1. Copy the predefined prompt text to clipboard
                System.Windows.Clipboard.SetText(promptText);

                // 2. Focus the WebView2 control
                webView.Focus();

                // 3. Find and focus active or target input element inside WebView2
                if (webView.CoreWebView2 != null)
                {
                    string script = @"
                        (function() {
                            window.focus();
                            let el = document.activeElement;
                            if (!el || el === document.body || (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT' && !el.isContentEditable)) {
                                let candidate = document.querySelector('textarea, div[contenteditable=""true""], input[type=""text""], [role=""textbox""], p[data-placeholder]');
                                if (candidate) {
                                    candidate.focus();
                                }
                            }
                        })();
                    ";
                    await webView.CoreWebView2.ExecuteScriptAsync(script);
                }

                await System.Threading.Tasks.Task.Delay(80);

                // 4. Simulate Ctrl+V to paste with full event dispatch in React/Vue/standard DOM
                keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
                keybd_event(VK_V, 0, 0, UIntPtr.Zero);
                keybd_event(VK_V, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

                // 5. Show visual banner feedback in bottom bar
                ShowPromptPastedFeedback(promptTitle);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to paste prompt: {ex.Message}");
            }
        }

        private async void ShowPromptPastedFeedback(string promptTitle)
        {
            if (PromptPastedBanner != null && PromptPastedText != null)
            {
                PromptPastedText.Text = $"✓ Pasted: {promptTitle}";
                PromptPastedBanner.Visibility = Visibility.Visible;
                await System.Threading.Tasks.Task.Delay(2200);
                PromptPastedBanner.Visibility = Visibility.Collapsed;
            }
        }

        private async void BrowserScreenshotBtn_Click(object sender, RoutedEventArgs e)
        {
            var btn = sender as System.Windows.Controls.Button;
            if (btn == null) return;

            string originalTip = btn.ToolTip as string ?? "Take Screenshot";

            try
            {
                // Temporarily hide our window to take a screenshot of what's behind it
                double oldOpacity = this.Opacity;
                this.Opacity = 0;

                // Small delay to allow the window to disappear from screen rendering
                await System.Threading.Tasks.Task.Delay(150);

                // Determine screen dimensions
                int screenLeft = (int)System.Windows.SystemParameters.VirtualScreenLeft;
                int screenTop = (int)System.Windows.SystemParameters.VirtualScreenTop;
                int screenWidth = (int)System.Windows.SystemParameters.VirtualScreenWidth;
                int screenHeight = (int)System.Windows.SystemParameters.VirtualScreenHeight;

                using (var bmp = new System.Drawing.Bitmap(screenWidth, screenHeight))
                {
                    using (var g = System.Drawing.Graphics.FromImage(bmp))
                    {
                        g.CopyFromScreen(screenLeft, screenTop, 0, 0, bmp.Size);
                    }

                    // Convert Bitmap to BitmapSource and copy to clipboard
                    var hBitmap = bmp.GetHbitmap();
                    try
                    {
                        var bitmapSource = System.Windows.Interop.Imaging.CreateBitmapSourceFromHBitmap(
                            hBitmap,
                            IntPtr.Zero,
                            System.Windows.Int32Rect.Empty,
                            System.Windows.Media.Imaging.BitmapSizeOptions.FromEmptyOptions());

                        System.Windows.Clipboard.SetImage(bitmapSource);
                    }
                    finally
                    {
                        // Clean up GDI handle to prevent memory leak
                        DeleteObject(hBitmap);
                    }
                }

                // Restore opacity
                this.Opacity = oldOpacity;

                // Show success visual feedback on the button tooltip
                btn.ToolTip = "✓ Copied to Clipboard!";
                btn.Opacity = 0.5;

                await System.Threading.Tasks.Task.Delay(1200);

                btn.ToolTip = originalTip;
                btn.Opacity = 1.0;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Screenshot capture failed: {ex.Message}");
                // Restore opacity in case of error
                this.Opacity = 1.0;
            }
        }

        private void SiteInfoBtn_Click(object sender, RoutedEventArgs e)
        {
            if (_activeTab == null) return;
            try
            {
                Uri uri = new Uri(_activeTab.Url);
                string host = uri.Host;
                PopupDomainText.Text = host;

                bool isHttps = uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase);
                if (isHttps)
                {
                    PopupSecurityText.Text = "Connection is secure";
                    PopupSecurityIcon.Data = System.Windows.Media.Geometry.Parse("M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z");
                    PopupSecurityIcon.Fill = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0x44, 0xFF, 0x44));
                }
                else
                {
                    PopupSecurityText.Text = "Connection is not secure";
                    PopupSecurityIcon.Data = System.Windows.Media.Geometry.Parse("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z");
                    PopupSecurityIcon.Fill = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0xFF, 0x44, 0x44));
                }

                string cleanHost = host.ToLower();
                bool locAllowed = false;
                bool micAllowed = false;

                if (_sitePermissions.TryGetValue(cleanHost, out var permissions))
                {
                    if (permissions.TryGetValue(Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind.Geolocation, out var locState))
                        locAllowed = locState == Microsoft.Web.WebView2.Core.CoreWebView2PermissionState.Allow;

                    if (permissions.TryGetValue(Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind.Microphone, out var micState))
                        micAllowed = micState == Microsoft.Web.WebView2.Core.CoreWebView2PermissionState.Allow;
                }

                _isSettingPermissions = true;
                LocationPermissionToggle.IsChecked = locAllowed;
                MicrophonePermissionToggle.IsChecked = micAllowed;
                _isSettingPermissions = false;

                SiteInfoPopup.IsOpen = true;
            }
            catch
            {
                PopupDomainText.Text = "Unknown Site";
                PopupSecurityText.Text = "Connection is not secure";
                SiteInfoPopup.IsOpen = true;
            }
        }

        private void CloseSiteInfo_Click(object sender, RoutedEventArgs e)
        {
            SiteInfoPopup.IsOpen = false;
        }

        private void PermissionToggle_Changed(object sender, RoutedEventArgs e)
        {
            if (_isSettingPermissions || _activeTab == null) return;
            try
            {
                string host = new Uri(_activeTab.Url).Host.ToLower();
                var toggle = sender as System.Windows.Controls.Primitives.ToggleButton;
                if (toggle == null) return;

                Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind kind = 
                    toggle.Name == "LocationPermissionToggle" 
                    ? Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind.Geolocation 
                    : Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind.Microphone;

                Microsoft.Web.WebView2.Core.CoreWebView2PermissionState state = 
                    toggle.IsChecked == true 
                    ? Microsoft.Web.WebView2.Core.CoreWebView2PermissionState.Allow 
                    : Microsoft.Web.WebView2.Core.CoreWebView2PermissionState.Deny;

                SavePermission(host, kind, state);

                // Reload the active WebView to apply permissions
                if (_webViews.TryGetValue(_activeTab, out var webView))
                {
                    webView.Reload();
                }
            }
            catch {}
        }

        private void SavePermission(string host, Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind kind, Microsoft.Web.WebView2.Core.CoreWebView2PermissionState state)
        {
            host = host.ToLower();
            if (!_sitePermissions.TryGetValue(host, out var permissions))
            {
                permissions = new Dictionary<Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind, Microsoft.Web.WebView2.Core.CoreWebView2PermissionState>();
                _sitePermissions[host] = permissions;
            }
            permissions[kind] = state;
        }

        private void ResetPermissions_Click(object sender, RoutedEventArgs e)
        {
            if (_activeTab == null) return;
            try
            {
                string host = new Uri(_activeTab.Url).Host.ToLower();
                _sitePermissions.Remove(host);

                _isSettingPermissions = true;
                LocationPermissionToggle.IsChecked = false;
                MicrophonePermissionToggle.IsChecked = false;
                _isSettingPermissions = false;

                if (_webViews.TryGetValue(_activeTab, out var webView))
                {
                    webView.Reload();
                }
            }
            catch {}
        }

        private void ClearSiteData_Click(object sender, RoutedEventArgs e)
        {
            if (_activeTab == null) return;
            try
            {
                if (_webViews.TryGetValue(_activeTab, out var webView) && webView.CoreWebView2 != null)
                {
                    webView.CoreWebView2.CookieManager.DeleteAllCookies();
                    System.Windows.MessageBox.Show("Cookies and site data cleared.", "Browser Info", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Information);
                    SiteInfoPopup.IsOpen = false;
                    webView.Reload();
                }
            }
            catch {}
        }

        private void WebView_PermissionRequested(object? sender, Microsoft.Web.WebView2.Core.CoreWebView2PermissionRequestedEventArgs e)
        {
            try
            {
                string host = new Uri(e.Uri).Host.ToLower();
                if (_sitePermissions.TryGetValue(host, out var permissions) && 
                    permissions.TryGetValue(e.PermissionKind, out var state))
                {
                    e.State = state;
                    e.Handled = true;
                }
            }
            catch {}
        }

        private void UpdateNavButtonsState()
        {
            if (_activeTab != null && _webViews.ContainsKey(_activeTab))
            {
                var webView = _webViews[_activeTab];
                BrowserBackBtn.IsEnabled = webView.CoreWebView2?.CanGoBack ?? false;
                BrowserForwardBtn.IsEnabled = webView.CoreWebView2?.CanGoForward ?? false;
                BrowserRefreshBtn.ToolTip = "Refresh";
            }
        }

        private void SaveBrowserSession()
        {
            try
            {
                var config = ConfigManager.Load();

                config.IsChatTabActive = _isChatTabActive;

                config.OpenTabsUrls.Clear();
                foreach (var tab in _browserTabs)
                {
                    string url = tab.Url;
                    if (_webViews.TryGetValue(tab, out var webView) && webView.Source != null)
                    {
                        url = webView.Source.ToString();
                    }
                    config.OpenTabsUrls.Add(url);
                }

                config.SelectedTabIndex = _activeTab != null ? _browserTabs.IndexOf(_activeTab) : -1;

                ConfigManager.Save(config);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to save browser session: {ex.Message}");
            }
        }

        private void UpdateBookmarksBarVisibility(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                BookmarksBar.Visibility = Visibility.Visible;
                return;
            }

            string cleanUrl = url.Trim().ToLower();
            if (cleanUrl == "https://www.google.com" || 
                cleanUrl == "https://www.google.com/" || 
                cleanUrl == "about:blank" || 
                cleanUrl == "about:blank/")
            {
                BookmarksBar.Visibility = Visibility.Visible;
            }
            else
            {
                BookmarksBar.Visibility = Visibility.Collapsed;
            }
        }

        private async void NewTabBtn_Click(object sender, RoutedEventArgs e)
        {
            await CreateNewTabAsync("https://www.google.com");
        }

        private async void BrowserTabsList_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (BrowserTabsList.SelectedItem is BrowserTab tab)
            {
                await SelectTabAsync(tab);
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // NATIVE INITIALISATION (screen hider, hotkey, tray icon)
        // ─────────────────────────────────────────────────────────────────
        private void MainWindow_SourceInitialized(object? sender, EventArgs e)
        {
            var helper = new System.Windows.Interop.WindowInteropHelper(this);
            IntPtr handle = helper.Handle;

            WindowHider.HideFromCapture(handle);

            try
            {
                _hotkeyHelper = new HotkeyHelper(handle);
                // Ctrl+Shift+G: Toggle Visibility
                _hotkeyHelper.Register(9001, HotkeyHelper.MOD_CONTROL | HotkeyHelper.MOD_SHIFT, 0x47, ToggleVisibility);
                // Ctrl+Shift+S: Stealth Screen Snip to AI
                _hotkeyHelper.Register(9002, HotkeyHelper.MOD_CONTROL | HotkeyHelper.MOD_SHIFT, 0x53, OnRequestSnipScreen);
                // Ctrl+Shift+T: Ghost Click-Through Mode
                _hotkeyHelper.Register(9003, HotkeyHelper.MOD_CONTROL | HotkeyHelper.MOD_SHIFT, 0x54, ToggleGhostMode);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Hotkey registration failed: {ex.Message}");
            }

            InitializeTrayIcon();
        }

        private void OnRequestSnipScreen()
        {
            try
            {
                var snipWin = new SnipWindow();
                if (IsVisible)
                {
                    snipWin.Owner = this;
                }

                if (snipWin.ShowDialog() == true && snipWin.SelectedWidth > 10 && snipWin.SelectedHeight > 10)
                {
                    var base64 = ScreenCaptureHelper.CaptureRegionToBase64(
                        snipWin.SelectedX,
                        snipWin.SelectedY,
                        snipWin.SelectedWidth,
                        snipWin.SelectedHeight);

                    // Ensure MainWindow is visible, unminimized, and active
                    Show();
                    if (WindowState == WindowState.Minimized)
                    {
                        WindowState = WindowState.Normal;
                    }
                    Activate();

                    if (!string.IsNullOrEmpty(base64) && DataContext is MainViewModel vm)
                    {
                        _ = vm.SendVisionPromptAsync(base64, "Please analyze this screenshot and provide a direct, concise solution / explanation.");
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Snip failed: {ex.Message}");
            }
        }

        private void ToggleGhostMode()
        {
            if (DataContext is MainViewModel vm)
            {
                vm.IsGhostMode = !vm.IsGhostMode;
            }
        }

        private void OnGhostModeChanged(bool isGhost)
        {
            var helper = new System.Windows.Interop.WindowInteropHelper(this);
            WindowHider.SetClickThrough(helper.Handle, isGhost);
        }

        private void OnSplitViewChanged(bool isSplit)
        {
            ApplyLayoutMode(isSplit);
        }

        private void ApplyLayoutMode(bool isSplit)
        {
            if (isSplit)
            {
                _chatWidth = Width;
                _chatHeight = Height;
                if (Width < 950) Width = 1050;
                if (Height < 660) Height = 660;

                BrowserPanel.Visibility = Visibility.Visible;
                ChatPanel.Visibility = Visibility.Visible;
                SplitViewSplitter.Visibility = Visibility.Visible;

                Grid.SetColumn(BrowserPanel, 0);
                Grid.SetColumnSpan(BrowserPanel, 1);
                Grid.SetColumn(ChatPanel, 2);
                Grid.SetColumnSpan(ChatPanel, 1);

                BrowserColDef.Width = new GridLength(1.1, GridUnitType.Star);
                ChatColDef.Width = new GridLength(1.0, GridUnitType.Star);

                TitlePanel.Visibility = Visibility.Visible;
                TitleTabsPanel.Visibility = Visibility.Visible;
                SidebarToggleBtn.Visibility = Visibility.Visible;
                Title = "Translucent — Split View";
            }
            else
            {
                SplitViewSplitter.Visibility = Visibility.Collapsed;
                if (_isChatTabActive)
                {
                    BrowserColDef.Width = new GridLength(0);
                    ChatColDef.Width = new GridLength(1.0, GridUnitType.Star);

                    Grid.SetColumn(ChatPanel, 0);
                    Grid.SetColumnSpan(ChatPanel, 3);
                    ChatPanel.Visibility = Visibility.Visible;
                    BrowserPanel.Visibility = Visibility.Collapsed;

                    ChatMenuItem.IsChecked = true;
                    BrowserMenuItem.IsChecked = false;
                    SidebarToggleBtn.Visibility = Visibility.Visible;
                    TitlePanel.Visibility = Visibility.Visible;
                    TitleTabsPanel.Visibility = Visibility.Collapsed;
                    Title = "Invisible Chat";
                }
                else
                {
                    BrowserColDef.Width = new GridLength(1.0, GridUnitType.Star);
                    ChatColDef.Width = new GridLength(0);

                    Grid.SetColumn(BrowserPanel, 0);
                    Grid.SetColumnSpan(BrowserPanel, 3);
                    BrowserPanel.Visibility = Visibility.Visible;
                    ChatPanel.Visibility = Visibility.Collapsed;

                    ChatMenuItem.IsChecked = false;
                    BrowserMenuItem.IsChecked = true;
                    SidebarToggleBtn.Visibility = Visibility.Collapsed;
                    TitlePanel.Visibility = Visibility.Collapsed;
                    TitleTabsPanel.Visibility = Visibility.Visible;
                    if (_activeTab != null) Title = $"Browser — {_activeTab.Title}";
                }
            }
        }

        protected override void OnPreviewKeyDown(System.Windows.Input.KeyEventArgs e)
        {
            base.OnPreviewKeyDown(e);
            if (e.Key == System.Windows.Input.Key.Escape && !InputTextBox.IsFocused && (BrowserUrlBar == null || !BrowserUrlBar.IsFocused))
            {
                // Panic key: instantly hide window
                Hide();
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TAB SWITCHING — Chat ↔ Browser via Title Hamburger Menu
        // ─────────────────────────────────────────────────────────────────
        private void HamburgerBtn_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button btn && btn.ContextMenu != null)
            {
                btn.ContextMenu.PlacementTarget = btn;
                btn.ContextMenu.Placement = System.Windows.Controls.Primitives.PlacementMode.Bottom;
                btn.ContextMenu.IsOpen = true;
            }
        }

        private void ChatTabBtn_Click(object sender, RoutedEventArgs e)
        {
            bool wasSplit = false;
            if (DataContext is MainViewModel vm && vm.IsSplitView)
            {
                vm.IsSplitView = false;
                wasSplit = true;
            }

            if (_isChatTabActive && !wasSplit) return;
            _isChatTabActive = true;

            _browserWidth  = Width;
            _browserHeight = Height;
            Width  = _chatWidth;
            Height = _chatHeight;

            ApplyLayoutMode(false);
            SaveBrowserSession();
        }

        private void BrowserTabBtn_Click(object sender, RoutedEventArgs e)
        {
            bool wasSplit = false;
            if (DataContext is MainViewModel vm && vm.IsSplitView)
            {
                vm.IsSplitView = false;
                wasSplit = true;
            }

            if (!_isChatTabActive && !wasSplit) return;
            _isChatTabActive = false;

            _chatWidth  = Width;
            _chatHeight = Height;
            Width  = _browserWidth;
            Height = _browserHeight;

            ApplyLayoutMode(false);

            if (_activeTab != null)
            {
                Title = $"Browser — {_activeTab.Title}";
                UpdateBookmarksBarVisibility(_activeTab.Url);
            }

            BrowserUrlBar.Focus();
            BrowserUrlBar.SelectAll();
            SaveBrowserSession();
        }

        // ─────────────────────────────────────────────────────────────────
        // BROWSER NAVIGATION & ACTIONS
        // ─────────────────────────────────────────────────────────────────
        private void BrowserGoBtn_Click(object sender, RoutedEventArgs e)
            => NavigateActiveBrowser(BrowserUrlBar.Text);

        private void BrowserUrlBar_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                e.Handled = true;
                NavigateActiveBrowser(BrowserUrlBar.Text);
            }
        }

        private void BrowserBackBtn_Click(object sender, RoutedEventArgs e)
        {
            if (_activeTab != null && _webViews.ContainsKey(_activeTab))
            {
                var webView = _webViews[_activeTab];
                if (webView.CoreWebView2?.CanGoBack == true)
                    webView.CoreWebView2.GoBack();
            }
        }

        private void BrowserForwardBtn_Click(object sender, RoutedEventArgs e)
        {
            if (_activeTab != null && _webViews.ContainsKey(_activeTab))
            {
                var webView = _webViews[_activeTab];
                if (webView.CoreWebView2?.CanGoForward == true)
                    webView.CoreWebView2.GoForward();
            }
        }

        private void BrowserRefreshBtn_Click(object sender, RoutedEventArgs e)
        {
            if (_activeTab != null && _webViews.ContainsKey(_activeTab))
                _webViews[_activeTab].CoreWebView2?.Reload();
        }

        private void BrowserHomeBtn_Click(object sender, RoutedEventArgs e)
            => NavigateActiveBrowser("https://www.google.com");

        private void ShortcutBtn_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button btn && btn.Tag is string url)
            {
                NavigateActiveBrowser(url);
            }
        }

        private void NavigateActiveBrowser(string input)
        {
            if (string.IsNullOrWhiteSpace(input) || _activeTab == null || !_webViews.ContainsKey(_activeTab)) return;

            var webView = _webViews[_activeTab];
            if (webView.CoreWebView2 == null) return;

            string url = input.Trim();

            bool hasScheme = url.StartsWith("http://",  StringComparison.OrdinalIgnoreCase) ||
                             url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
                             url.StartsWith("file://",  StringComparison.OrdinalIgnoreCase);

            bool looksLikeUrl = hasScheme ||
                                (url.Contains('.') && !url.Contains(' ') && url.Length > 3);

            if (!looksLikeUrl)
                url = "https://www.google.com/search?q=" + Uri.EscapeDataString(url);
            else if (!hasScheme)
                url = "https://" + url;

            try
            {
                webView.CoreWebView2.Navigate(url);
            }
            catch
            {
                webView.CoreWebView2.Navigate(
                    "https://www.google.com/search?q=" + Uri.EscapeDataString(input.Trim()));
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // CHAT AUTO-SCROLL
        // ─────────────────────────────────────────────────────────────────
        private void CurrentMessages_CollectionChanged(object? sender, NotifyCollectionChangedEventArgs e)
        {
            if (e.Action == NotifyCollectionChangedAction.Add)
                Dispatcher.BeginInvoke(
                    System.Windows.Threading.DispatcherPriority.Background,
                    new Action(() => MessagesScrollViewer.ScrollToBottom()));
        }

        private void MainWindow_StateChanged(object? sender, EventArgs e)
        {
            if (WindowState == WindowState.Maximized)
                WindowState = WindowState.Normal;
        }

        // ─────────────────────────────────────────────────────────────────
        // VISIBILITY TOGGLE (Ctrl+Shift+G)
        // ─────────────────────────────────────────────────────────────────
        private void ToggleVisibility()
        {
            if (IsVisible)
            {
                Hide();
            }
            else
            {
                Show();
                WindowState = WindowState.Normal;
                Activate();
                if (_isChatTabActive) InputTextBox.Focus();
                else BrowserUrlBar.Focus();
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // SYSTEM TRAY
        // ─────────────────────────────────────────────────────────────────
        private void InitializeTrayIcon()
        {
            try
            {
                _notifyIcon = new System.Windows.Forms.NotifyIcon
                {
                    Icon    = CreateDynamicIcon(),
                    Visible = true,
                    Text    = "Invisible Chat  •  Ctrl+Shift+G"
                };
                _notifyIcon.DoubleClick += (s, e) => ToggleVisibility();

                var menu = new System.Windows.Forms.ContextMenuStrip();
                menu.Items.Add("Show / Hide",   null, (s, e) => ToggleVisibility());
                menu.Items.Add("Settings",       null, (s, e) =>
                {
                    Show(); WindowState = WindowState.Normal; Activate();
                    if (DataContext is MainViewModel vm) vm.IsSettingsOpen = true;
                });
                menu.Items.Add(new System.Windows.Forms.ToolStripSeparator());
                menu.Items.Add("Exit", null, (s, e) => ExitApplication());
                _notifyIcon.ContextMenuStrip = menu;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Tray icon failed: {ex.Message}");
            }
        }

        private System.Drawing.Icon CreateDynamicIcon()
        {
            using var bmp = new System.Drawing.Bitmap(16, 16);
            using (var g = System.Drawing.Graphics.FromImage(bmp))
            {
                g.Clear(System.Drawing.Color.Transparent);
                using var brush = new System.Drawing.SolidBrush(System.Drawing.Color.FromArgb(142, 45, 226));
                g.FillEllipse(brush, 0, 0, 16, 16);
                using var dot = new System.Drawing.SolidBrush(System.Drawing.Color.White);
                g.FillEllipse(dot, 5, 5, 6, 6);
            }
            return System.Drawing.Icon.FromHandle(bmp.GetHicon());
        }

        // ─────────────────────────────────────────────────────────────────
        // WINDOW CONTROLS & CLEANUP
        // ─────────────────────────────────────────────────────────────────
        private void CloseBtn_Click(object sender, RoutedEventArgs e)    => ExitApplication();
        private void MinimizeBtn_Click(object sender, RoutedEventArgs e) => Hide();

        private void ExitApplication()
        {
            if (_notifyIcon != null) { _notifyIcon.Visible = false; _notifyIcon.Dispose(); }
            _hotkeyHelper?.Dispose();

            // Cleanup WebViews
            foreach (var webView in _webViews.Values)
            {
                webView.Dispose();
            }
            _webViews.Clear();

            System.Windows.Application.Current.Shutdown();
        }

        protected override void OnClosed(EventArgs e)
        {
            if (_notifyIcon != null) { _notifyIcon.Visible = false; _notifyIcon.Dispose(); }
            _hotkeyHelper?.Dispose();
            base.OnClosed(e);
        }

        // ─────────────────────────────────────────────────────────────────
        // CHAT KEY DOWN
        // ─────────────────────────────────────────────────────────────────
        private void InputTextBox_PreviewKeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == Key.Enter && Keyboard.Modifiers == ModifierKeys.None)
            {
                e.Handled = true;
                if (DataContext is MainViewModel vm && vm.SendMessageCommand.CanExecute(null))
                    vm.SendMessageCommand.Execute(null);
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // COPY MESSAGE
        // ─────────────────────────────────────────────────────────────────
        private async void CopyMessageBtn_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button btn)
            {
                string text = btn.Tag as string ?? string.Empty;
                if (string.IsNullOrEmpty(text)) return;

                try
                {
                    System.Windows.Clipboard.SetText(text);
                }
                catch
                {
                    return;
                }

                string originalTip = btn.ToolTip as string ?? "Copy message";
                btn.ToolTip = "✓ Copied!";
                btn.Opacity = 0.5;

                await System.Threading.Tasks.Task.Delay(1500);

                if (btn.IsLoaded)
                {
                    btn.ToolTip = originalTip;
                    btn.Opacity = 1.0;
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // LIVE CAPTIONS SPEECH RECOGNITION (OFFLINE)
        // ─────────────────────────────────────────────────────────────────
        private System.Speech.Recognition.SpeechRecognitionEngine? _speechEngine;
        private System.Windows.Threading.DispatcherTimer? _simTimer;
        private int _simStep = 0;

        private void ToggleCaptionsBtn_Click(object sender, RoutedEventArgs e)
        {
            if (DataContext is not MainViewModel vm) return;

            vm.IsCaptionsListening = !vm.IsCaptionsListening;

            if (vm.IsCaptionsListening)
            {
                ToggleSpeechBtnState(true);
                StartSpeechRecognition();
            }
            else
            {
                ToggleSpeechBtnState(false);
                StopSpeechRecognition();
            }
        }

        private void ToggleSpeechBtnState(bool listening)
        {
            if (listening)
            {
                ToggleCaptionsBtnText.Text = "Turn Off";
                ToggleCaptionsBtn.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(200, 50, 50));
            }
            else
            {
                ToggleCaptionsBtnText.Text = "Turn On";
                ToggleCaptionsBtn.ClearValue(System.Windows.Controls.Control.BackgroundProperty);
            }
        }

        private NAudio.Wave.WasapiLoopbackCapture? _audioCapture;
        private NAudio.Wave.WaveInEvent? _micCapture;
        private LoopbackResamplerStream? _audioStream;

        private System.Speech.Recognition.SpeechRecognitionEngine CreateSpeechEngine()
        {
            var recognizers = System.Speech.Recognition.SpeechRecognitionEngine.InstalledRecognizers();
            System.Speech.Recognition.RecognizerInfo? best = null;

            foreach (var rec in recognizers)
            {
                if (rec.Culture.Name.Equals("en-US", StringComparison.OrdinalIgnoreCase))
                {
                    best = rec;
                    break;
                }
            }

            if (best == null)
            {
                foreach (var rec in recognizers)
                {
                    if (rec.Culture.Name.StartsWith("en", StringComparison.OrdinalIgnoreCase))
                    {
                        best = rec;
                        break;
                    }
                }
            }

            if (best == null && recognizers.Count > 0)
            {
                best = recognizers[0];
            }

            var engine = best != null 
                ? new System.Speech.Recognition.SpeechRecognitionEngine(best.Id) 
                : new System.Speech.Recognition.SpeechRecognitionEngine();

            engine.LoadGrammar(new System.Speech.Recognition.DictationGrammar());
            engine.SpeechRecognized += SpeechEngine_SpeechRecognized;
            engine.AudioSignalProblemOccurred += SpeechEngine_AudioSignalProblemOccurred;

            try
            {
                engine.UpdateRecognizerSetting("BackgroundSpeechSensitivity", 100);
            }
            catch { }

            return engine;
        }

        private void StartSpeechRecognition()
        {
            try
            {
                if (_speechEngine == null)
                {
                    _speechEngine = CreateSpeechEngine();
                }

                _audioStream = new LoopbackResamplerStream();

                var audioFormat = new System.Speech.AudioFormat.SpeechAudioFormatInfo(
                    16000, 
                    System.Speech.AudioFormat.AudioBitsPerSample.Sixteen, 
                    System.Speech.AudioFormat.AudioChannel.Mono);

                _speechEngine.SetInputToAudioStream(_audioStream, audioFormat);

                if (DataContext is MainViewModel vm && vm.AudioSourceMic)
                {
                    _micCapture = new NAudio.Wave.WaveInEvent
                    {
                        WaveFormat = new NAudio.Wave.WaveFormat(16000, 16, 1)
                    };
                    _micCapture.DataAvailable += (s, e) =>
                    {
                        _audioStream.WriteData(e.Buffer, 0, e.BytesRecorded, _micCapture.WaveFormat);
                    };
                    _micCapture.RecordingStopped += (s, e) =>
                    {
                        _audioStream?.Dispose();
                    };
                    _micCapture.StartRecording();
                    _speechEngine.RecognizeAsync(System.Speech.Recognition.RecognizeMode.Multiple);
                    AddCaptionItem("🎙️ System: Started microphone capture.", true);
                }
                else
                {
                    _audioCapture = new NAudio.Wave.WasapiLoopbackCapture();
                    _audioCapture.DataAvailable += (s, e) =>
                    {
                        _audioStream.WriteData(e.Buffer, 0, e.BytesRecorded, _audioCapture.WaveFormat);
                    };
                    _audioCapture.RecordingStopped += (s, e) =>
                    {
                        _audioStream?.Dispose();
                    };
                    _audioCapture.StartRecording();
                    _speechEngine.RecognizeAsync(System.Speech.Recognition.RecognizeMode.Multiple);
                    AddCaptionItem("🔊 System: Started system audio loopback capture.", true);
                }
            }
            catch (Exception ex)
            {
                AddCaptionItem($"⚠️ Speech recognition start failed: {ex.Message}", true);
                AddCaptionItem("💡 System: Starting fallback simulation for demonstration...", true);
                StartSimulation();
            }
        }

        private void StopSpeechRecognition()
        {
            try { _audioCapture?.StopRecording(); } catch { }
            try { _micCapture?.StopRecording(); } catch { }
            try { _speechEngine?.RecognizeAsyncStop(); } catch { }

            _audioCapture?.Dispose();
            _audioCapture = null;

            _micCapture?.Dispose();
            _micCapture = null;

            _audioStream?.Dispose();
            _audioStream = null;

            StopSimulation();
            AddCaptionItem("🔇 System: Speech recognition stopped.", true);
        }

        private void SpeechEngine_SpeechRecognized(object? sender, System.Speech.Recognition.SpeechRecognizedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(e.Result.Text)) return;
            string text = e.Result.Text;
            Dispatcher.Invoke(() =>
            {
                AddCaptionItem(text, false);

                if (DataContext is MainViewModel vm && vm.AutoCopilot)
                {
                    string lower = text.ToLowerInvariant().Trim();
                    bool isQuestion = lower.EndsWith("?") ||
                                      lower.StartsWith("what") ||
                                      lower.StartsWith("how") ||
                                      lower.StartsWith("why") ||
                                      lower.StartsWith("can you") ||
                                      lower.StartsWith("could you") ||
                                      lower.StartsWith("explain") ||
                                      lower.StartsWith("describe") ||
                                      lower.StartsWith("who") ||
                                      lower.StartsWith("where") ||
                                      lower.StartsWith("when");

                    if (isQuestion && text.Length > 8)
                    {
                        _ = vm.HandleAskAiFromCaptionAsync(text);
                    }
                }
            });
        }

        private void SpeechEngine_AudioSignalProblemOccurred(object? sender, System.Speech.Recognition.AudioSignalProblemOccurredEventArgs e)
        {
            Dispatcher.Invoke(() =>
            {
                System.Diagnostics.Debug.WriteLine($"SAPI Audio Signal Problem: {e.AudioSignalProblem}");
                if (e.AudioSignalProblem == System.Speech.Recognition.AudioSignalProblem.TooSoft)
                {
                    AddCaptionItem("⚠️ System: The audio volume is too quiet for recognition.", true);
                }
                else if (e.AudioSignalProblem == System.Speech.Recognition.AudioSignalProblem.TooLoud)
                {
                    AddCaptionItem("⚠️ System: The audio volume is too loud (clipping).", true);
                }
            });
        }

        private void AddCaptionItem(string text, bool isSystem)
        {
            if (DataContext is not MainViewModel vm) return;

            vm.Captions.Add(new CaptionItem
            {
                Text = text,
                Timestamp = DateTime.Now.ToString("HH:mm:ss"),
                IsSystem = isSystem
            });

            // Auto-scroll scrollviewer
            Dispatcher.BeginInvoke(
                System.Windows.Threading.DispatcherPriority.Background,
                new Action(() => CaptionsScrollViewer.ScrollToBottom()));
        }

        private void CopyCaptionBtn_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button btn)
            {
                string text = btn.Tag as string ?? string.Empty;
                if (string.IsNullOrEmpty(text)) return;

                try
                {
                    System.Windows.Clipboard.SetText(text);
                }
                catch
                {
                    return;
                }

                string originalTip = btn.ToolTip as string ?? "Copy Caption";
                btn.ToolTip = "✓ Copied!";
                btn.Opacity = 0.5;

                System.Threading.Tasks.Task.Delay(1200).ContinueWith(t =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        if (btn.IsLoaded)
                        {
                            btn.ToolTip = originalTip;
                            btn.Opacity = 1.0;
                        }
                    });
                });
            }
        }

        // Simulated speech captions loop
        private void StartSimulation()
        {
            StopSimulation();
            _simStep = 0;
            _simTimer = new System.Windows.Threading.DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(5)
            };
            _simTimer.Tick += (s, e) =>
            {
                string[] sentences = {
                    "Hello! This is a live caption simulation.",
                    "The app uses Windows built-in SAPI speech recognition engine.",
                    "If you connect a microphone, Windows transcribes your voice offline.",
                    "You can copy any of these caption cards by clicking the copy button.",
                    "Feel free to turn captions on and off anytime."
                };
                AddCaptionItem(sentences[_simStep % sentences.Length], false);
                _simStep++;
            };
            _simTimer.Start();
        }

        private void StopSimulation()
        {
            if (_simTimer != null)
            {
                _simTimer.Stop();
                _simTimer = null;
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // SETTINGS OVERLAY COMPATIBILITY (Hides HWND WebViews to prevent airspace overlap)
        // ─────────────────────────────────────────────────────────────────
        private void ViewModel_PropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(MainViewModel.IsSettingsOpen))
            {
                if (sender is MainViewModel vm)
                {
                    if (vm.IsSettingsOpen)
                    {
                        // Collapse panels when settings are open to ensure Settings Overlay displays on top
                        BrowserPanel.Visibility = Visibility.Collapsed;
                        ChatPanel.Visibility = Visibility.Collapsed;
                    }
                    else
                    {
                        // Restore visible panels based on active tab
                        if (_isChatTabActive)
                        {
                            ChatPanel.Visibility = Visibility.Visible;
                            BrowserPanel.Visibility = Visibility.Collapsed;
                        }
                        else
                        {
                            ChatPanel.Visibility = Visibility.Collapsed;
                            BrowserPanel.Visibility = Visibility.Visible;
                        }
                    }
                }
            }
            else if (e.PropertyName == nameof(MainViewModel.WindowOpacity))
            {
                if (sender is MainViewModel vm)
                {
                    UpdateWebViewsOpacity(vm.WindowOpacity);
                }
            }
        }

        private string GetOpacityScript(double opacity)
        {
            string opStr = opacity.ToString(System.Globalization.CultureInfo.InvariantCulture);
            return @"(function() {
                var styleId = 'webview-opacity-style';
                var style = document.getElementById(styleId);
                if (!style) {
                    style = document.createElement('style');
                    style.id = styleId;
                    document.documentElement.appendChild(style);
                }
                style.textContent = 'html { opacity: " + opStr + @" !important; }';
            })();";
        }

        private void UpdateWebViewsOpacity(double opacity)
        {
            string script = GetOpacityScript(opacity);
            foreach (var webView in _webViews.Values)
            {
                if (webView.CoreWebView2 != null)
                {
                    webView.CoreWebView2.ExecuteScriptAsync(script);
                }
            }
        }
    }
}