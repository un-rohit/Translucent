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

        protected override void OnStartup(StartupEventArgs e)
        {
            // Set up global crash logging to capture any startup exceptions
            AppDomain.CurrentDomain.UnhandledException += (s, ev) => 
                LogError("Unhandled Domain Exception", ev.ExceptionObject as Exception);
            
            DispatcherUnhandledException += (s, ev) => {
                LogError("Dispatcher Unhandled Exception", ev.Exception);
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
            }
            catch
            {
                // Another instance is already running. Exit silently.
                Shutdown();
                return;
            }

            // Create and initialize MainWindow, but do NOT show it.
            var mainWindow = new MainWindow();
            MainWindow = mainWindow;
            new System.Windows.Interop.WindowInteropHelper(mainWindow).EnsureHandle();

            base.OnStartup(e);
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
            try
            {
                _lockStream?.Dispose();
            }
            catch
            {
            }
            base.OnExit(e);
        }
    }
}
