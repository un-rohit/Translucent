using System;

namespace InvisibleChat
{
    public class CaptionItem
    {
        public string Text { get; set; } = string.Empty;
        public string Timestamp { get; set; } = string.Empty;
        public bool IsSystem { get; set; }
    }
}
