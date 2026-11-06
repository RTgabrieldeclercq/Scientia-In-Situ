// Scientia In Situ — the pen's button (V3.949; V3.957 at once). Assigned in Windows Settings → Pen & Windows Ink → Pen
// shortcut button → Launch a classic app, it tells the app on this computer that the button was pressed; the app switches
// to the pen, or from the pen to the other mode. Built by the installer with the C# compiler every Windows ships:
//   %WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /optimize+ /target:winexe /out:ScientiaPen.exe ScientiaPen.cs
// V3.957 — one raw connection to 127.0.0.1, not WebClient: WebClient's first request looks for a proxy (WPAD) and warms the
// whole HTTP stack, which is where the seconds between the press and the switch went. This opens a socket, writes the
// request, waits briefly for the answer and ends.
using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
class ScientiaPen {
    static int Main(string[] args) {
        try {
            var port = Environment.GetEnvironmentVariable("SIS_PORT"); int p; if (string.IsNullOrEmpty(port) || !int.TryParse(port, out p)) p = 8766;
            using (var c = new TcpClient()) {
                c.NoDelay = true;
                var ar = c.BeginConnect(IPAddress.Loopback, p, null, null);
                if (!ar.AsyncWaitHandle.WaitOne(1500)) return 1;   // the app on this computer is not running
                c.EndConnect(ar);
                var s = c.GetStream(); s.ReadTimeout = 1500;
                var req = Encoding.ASCII.GetBytes("GET /api/pen-button?press=1 HTTP/1.0\r\nHost: 127.0.0.1\r\nUser-Agent: ScientiaPen\r\nConnection: close\r\n\r\n");
                s.Write(req, 0, req.Length); s.Flush();
                var buf = new byte[512]; try { s.Read(buf, 0, buf.Length); } catch (Exception) { }
            }
        } catch (Exception) { }
        return 0;
    }
}
