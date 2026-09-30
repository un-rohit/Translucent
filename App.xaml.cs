using System;
using System.Diagnostics;
using System.IO;
using System.Windows;

namespace InvisibleChat
{
    public partial class App : System.Windows.Application
    {
        private static readonly string FolderPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "InvisibleChat"
        );
        private static FileStream? _lockStream;

        private static System.Threading.EventWaitHandle? _showAppEvent;

        protected override void OnStartup(StartupEventArgs e)
        {
            LogInfo("OnStartup started");

            // Fallback to Software rendering in Virtual Machines (VMware SVGA / VirtualBox)
            // to prevent vm3dum64.dll privileged instruction crash (0xc0000096)
            try
            {
                string sysDir = Environment.GetFolderPath(Environment.SpecialFolder.System);
                if (File.Exists(Path.Combine(sysDir, "vm3dum64.dll")) || 
                    File.Exists(Path.Combine(sysDir, "vm3dgl64.dll")) ||
                    File.Exists(Path.Combine(sysDir, "VBoxOGL.dll")))
                {
                    System.Windows.Media.RenderOptions.ProcessRenderMode = System.Windows.Interop.RenderMode.SoftwareOnly;
                    LogInfo("Software rendering enabled for VM environment");
                }
            }
            catch { }

            // Set up global crash logging to capture any startup exceptions
            AppDomain.CurrentDomain.UnhandledException += (s, ev) => 
                LogError("Unhandled Domain Exception", ev.ExceptionObject as Exception);
            
            DispatcherUnhandledException += (s, ev) => {
                LogError("Dispatcher Unhandled Exception", ev.Exception);
                // Only mark handled if MainWindow has already been successfully loaded
                if (MainWindow == null)
                {
                    ev.Handled = false;
                }
                else
                {
                    ev.Handled = true;
                }
            };

            // Single instance lock using exclusive file sharing
            try
            {
                if (!Directory.Exists(FolderPath))
                {
                    Directory.CreateDirectory(FolderPath);
                }
                string lockFilePath = Path.Combine(FolderPath, "app.lock");
                _lockStream = new FileStream(lockFilePath, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
                LogInfo("Lock acquired successfully");
            }
            catch (Exception ex)
            {
                LogInfo($"Lock acquisition failed: {ex.Message}. Another instance may be running.");
                // Another instance is already running. Signal it to restore/show and exit.
                try
                {
                    if (System.Threading.EventWaitHandle.TryOpenExisting("InvisibleChat_BringToFront_Event", out var existingEvent))
                    {
                        existingEvent.Set();
                        existingEvent.Dispose();
                        LogInfo("Signaled existing instance via EventWaitHandle");
                    }
                }
                catch { }

                Shutdown();
                return;
            }

            // Start listening for wake/show signals from secondary launches
            try
            {
                _showAppEvent = new System.Threading.EventWaitHandle(false, System.Threading.EventResetMode.AutoReset, "InvisibleChat_BringToFront_Event");
                var waitThread = new System.Threading.Thread(() =>
                {
                    while (true)
                    {
                        try
                        {
                            if (_showAppEvent.WaitOne())
                            {
                                Current?.Dispatcher.BeginInvoke(() =>
                                {
                                    if (Current.MainWindow is MainWindow mainWin)
                                    {
                                        mainWin.Show();
                                        if (mainWin.WindowState == WindowState.Minimized)
                                        {
                                            mainWin.WindowState = WindowState.Normal;
                                        }
                                        mainWin.Activate();
                                        mainWin.Focus();
                                    }
                                });
                            }
                        }
                        catch
                        {
                            break;
                        }
                    }
                })
                {
                    IsBackground = true
                };
                waitThread.Start();
                LogInfo("EventWaitHandle listener started");
            }
            catch (Exception ex)
            {
                LogInfo($"EventWaitHandle setup error: {ex.Message}");
            }

            // Create and initialize MainWindow, and display it to the user.
            try
            {
                LogInfo("Instantiating MainWindow...");
                var mainWindow = new MainWindow();
                MainWindow = mainWindow;
                LogInfo("Showing MainWindow...");
                mainWindow.Show();
                mainWindow.Activate();
                LogInfo("MainWindow shown and activated");
            }
            catch (Exception ex)
            {
                LogError("Startup MainWindow Creation Failed", ex);
                System.Windows.MessageBox.Show($"Translucent failed to start:\n\n{ex.Message}\n\nSee {Path.Combine(FolderPath, "error.log")} for details.", "Translucent Startup Error", MessageBoxButton.OK, MessageBoxImage.Error);
                _lockStream?.Dispose();
                _showAppEvent?.Dispose();
                Shutdown(1);
                return;
            }

            base.OnStartup(e);
            LogInfo("OnStartup completed successfully");
        }

        private static void LogInfo(string message)
        {
            try
            {
                if (!Directory.Exists(FolderPath))
                {
                    Directory.CreateDirectory(FolderPath);
                }
                string logPath = Path.Combine(FolderPath, "startup.log");
                File.AppendAllText(logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}\n");
            }
            catch { }
        }

        private static void LogError(string context, Exception? ex)
        {
            try
            {
                if (!Directory.Exists(FolderPath))
                {
                    Directory.CreateDirectory(FolderPath);
                }
                string logPath = Path.Combine(FolderPath, "error.log");
                string message = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {context}: {ex?.Message}\nStack Trace:\n{ex?.StackTrace}\n\n";
                if (ex?.InnerException != null)
                {
                    message += $"Inner Exception: {ex.InnerException.Message}\nStack Trace:\n{ex.InnerException.StackTrace}\n\n";
                }
                File.AppendAllText(logPath, message);
            }
            catch { }
        }

        protected override void OnExit(ExitEventArgs e)
        {
            LogInfo($"OnExit called with ExitCode={e.ApplicationExitCode}");
            try
            {
                _showAppEvent?.Dispose();
                _lockStream?.Dispose();
            }
            catch
            {
            }
            base.OnExit(e);
        }
    }
}
