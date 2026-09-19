using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;

namespace InvisibleChat
{
    public partial class SnipWindow : Window
    {
        private System.Windows.Point _startPoint;
        private bool _isSelecting = false;

        public int SelectedX { get; private set; }
        public int SelectedY { get; private set; }
        public int SelectedWidth { get; private set; }
        public int SelectedHeight { get; private set; }

        public SnipWindow()
        {
            InitializeComponent();

            Left = SystemParameters.VirtualScreenLeft;
            Top = SystemParameters.VirtualScreenTop;
            Width = SystemParameters.VirtualScreenWidth;
            Height = SystemParameters.VirtualScreenHeight;

            SourceInitialized += SnipWindow_SourceInitialized;
        }

        private void SnipWindow_SourceInitialized(object? sender, EventArgs e)
        {
            var handle = new WindowInteropHelper(this).Handle;
            WindowHider.HideFromCapture(handle);
        }

        private void Window_MouseDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            if (e.LeftButton == MouseButtonState.Pressed)
            {
                _startPoint = e.GetPosition(this);
                _isSelecting = true;

                Canvas.SetLeft(SelectionBox, _startPoint.X);
                Canvas.SetTop(SelectionBox, _startPoint.Y);
                SelectionBox.Width = 0;
                SelectionBox.Height = 0;
                SelectionBox.Visibility = Visibility.Visible;
                CaptureMouse();
            }
        }

        private void Window_MouseMove(object sender, System.Windows.Input.MouseEventArgs e)
        {
            if (_isSelecting)
            {
                var curPoint = e.GetPosition(this);

                double x = Math.Min(_startPoint.X, curPoint.X);
                double y = Math.Min(_startPoint.Y, curPoint.Y);
                double w = Math.Abs(curPoint.X - _startPoint.X);
                double h = Math.Abs(curPoint.Y - _startPoint.Y);

                Canvas.SetLeft(SelectionBox, x);
                Canvas.SetTop(SelectionBox, y);
                SelectionBox.Width = w;
                SelectionBox.Height = h;

                DimensionText.Text = $"{(int)w} × {(int)h}";
            }
        }

        private void Window_MouseUp(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            if (_isSelecting)
            {
                _isSelecting = false;
                ReleaseMouseCapture();

                var curPoint = e.GetPosition(this);
                double x = Math.Min(_startPoint.X, curPoint.X);
                double y = Math.Min(_startPoint.Y, curPoint.Y);
                double w = Math.Abs(curPoint.X - _startPoint.X);
                double h = Math.Abs(curPoint.Y - _startPoint.Y);

                // Ignore accidental tiny clicks
                if (w > 10 && h > 10)
                {
                    // Convert WPF DIP coordinates to physical screen coordinates
                    var screenStart = PointToScreen(new System.Windows.Point(x, y));
                    var screenEnd = PointToScreen(new System.Windows.Point(x + w, y + h));

                    SelectedX = (int)screenStart.X;
                    SelectedY = (int)screenStart.Y;
                    SelectedWidth = (int)(screenEnd.X - screenStart.X);
                    SelectedHeight = (int)(screenEnd.Y - screenStart.Y);

                    // Setting DialogResult automatically closes the modal dialog cleanly
                    DialogResult = true;
                    return;
                }

                SelectionBox.Visibility = Visibility.Collapsed;
            }
        }

        private void Window_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                DialogResult = false;
            }
        }
    }
}
