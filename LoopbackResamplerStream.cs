using System;
using System.IO;
using System.Collections.Concurrent;
using System.Threading;

namespace InvisibleChat
{
    public class LoopbackResamplerStream : Stream
    {
        private readonly ConcurrentQueue<byte> _queue = new();
        private readonly AutoResetEvent _dataAvailable = new(false);
        private bool _isDisposed;

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => true;
        public override long Length => _queue.Count;
        public override long Position { get => 0; set { } }

        public void WriteData(byte[] buffer, int offset, int count, NAudio.Wave.WaveFormat format)
        {
            if (_isDisposed) return;

            int bytesPerSample = format.BitsPerSample / 8;
            int channels = format.Channels;
            int bytesPerFrame = bytesPerSample * channels;
            if (bytesPerFrame == 0) return;
            int totalFrames = count / bytesPerFrame;

            double ratio = (double)format.SampleRate / 16000.0;
            double sourceFrameIndex = 0;

            var outBytes = new System.Collections.Generic.List<byte>();
            bool isFloat = format.Encoding == NAudio.Wave.WaveFormatEncoding.IeeeFloat || format.BitsPerSample == 32;

            while (sourceFrameIndex < totalFrames)
            {
                int frameInt = (int)Math.Floor(sourceFrameIndex);
                if (frameInt >= totalFrames) break;

                int frameByteOffset = offset + (frameInt * bytesPerFrame);
                
                float sum = 0;
                for (int c = 0; c < channels; c++)
                {
                    int sampleByteOffset = frameByteOffset + (c * bytesPerSample);
                    if (sampleByteOffset + bytesPerSample <= offset + count)
                    {
                        float sample = 0f;
                        if (isFloat)
                        {
                            sample = BitConverter.ToSingle(buffer, sampleByteOffset);
                        }
                        else if (format.BitsPerSample == 16)
                        {
                            short val = BitConverter.ToInt16(buffer, sampleByteOffset);
                            sample = val / 32768f;
                        }
                        else if (format.BitsPerSample == 32)
                        {
                            int val = BitConverter.ToInt32(buffer, sampleByteOffset);
                            sample = val / 2147483648f;
                        }
                        sum += sample;
                    }
                }
                float monoSample = sum / channels;

                // Clamp
                if (monoSample > 1.0f) monoSample = 1.0f;
                else if (monoSample < -1.0f) monoSample = -1.0f;

                short pcm16 = (short)(monoSample * 32767.0f);

                byte[] pcmBytes = BitConverter.GetBytes(pcm16);
                outBytes.Add(pcmBytes[0]);
                outBytes.Add(pcmBytes[1]);

                sourceFrameIndex += ratio;
            }

            if (outBytes.Count > 0)
            {
                foreach (byte b in outBytes)
                {
                    _queue.Enqueue(b);
                }
                _dataAvailable.Set();
            }
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            int bytesRead = 0;
            while (bytesRead < count && !_isDisposed)
            {
                if (_queue.TryDequeue(out byte b))
                {
                    buffer[offset + bytesRead] = b;
                    bytesRead++;
                }
                else
                {
                    _dataAvailable.WaitOne(10);
                }
            }
            return bytesRead;
        }

        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            _isDisposed = true;
            _dataAvailable.Set();
            base.Dispose(disposing);
        }
    }
}
