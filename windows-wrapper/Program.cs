using System;
using System.Windows.Forms;

namespace BilliardsTrainer.Windows;

internal static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm(args.Contains("--host-play"), args.Contains("--offline-smoke")));
    }
}
